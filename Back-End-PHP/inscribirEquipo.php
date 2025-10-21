<?php
/**
 * Inscribir Equipo - NUEVO ARCHIVO CRÍTICO
 * Permite registrar equipos completos para torneos
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

include 'conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'mensaje' => 'Método no permitido'
    ]);
    exit;
}

// Iniciar transacción
mysqli_begin_transaction($conexion);

try {
    // ===================================
    // 1. VALIDAR DATOS DEL EQUIPO
    // ===================================
    
    if (!isset($_POST['evento_id']) || empty($_POST['evento_id'])) {
        throw new Exception('El ID del evento es obligatorio');
    }
    
    if (!isset($_POST['nombre_equipo']) || empty(trim($_POST['nombre_equipo']))) {
        throw new Exception('El nombre del equipo es obligatorio');
    }
    
    if (!isset($_POST['capitan_matricula']) || empty(trim($_POST['capitan_matricula']))) {
        throw new Exception('La matrícula del capitán es obligatoria');
    }
    
    if (!isset($_POST['integrantes']) || !is_array($_POST['integrantes']) || empty($_POST['integrantes'])) {
        throw new Exception('Debes proporcionar al menos un integrante');
    }
    
    $evento_id = intval($_POST['evento_id']);
    $nombre_equipo = mysqli_real_escape_string($conexion, trim($_POST['nombre_equipo']));
    $capitan_matricula = mysqli_real_escape_string($conexion, trim($_POST['capitan_matricula']));
    $integrantes = $_POST['integrantes'];
    
    // ===================================
    // 2. VERIFICAR QUE EL EVENTO EXISTE Y PERMITE EQUIPOS
    // ===================================
    
    $sqlEvento = "SELECT id, nombre, tipo_registro, cupo_maximo, registros_actuales, activo 
                  FROM evento WHERE id = ?";
    $stmt = mysqli_prepare($conexion, $sqlEvento);
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    $resultadoEvento = mysqli_stmt_get_result($stmt);
    
    if (mysqli_num_rows($resultadoEvento) === 0) {
        throw new Exception('El evento seleccionado no existe');
    }
    
    $evento = mysqli_fetch_assoc($resultadoEvento);
    mysqli_stmt_close($stmt);
    
    if (!$evento['activo']) {
        throw new Exception('El evento no está disponible para inscripciones');
    }
    
    if ($evento['tipo_registro'] !== 'Por equipos') {
        throw new Exception('Este evento no acepta inscripciones por equipos');
    }
    
    // Verificar cupo disponible
    if ($evento['cupo_maximo'] > 0 && $evento['registros_actuales'] >= $evento['cupo_maximo']) {
        throw new Exception('El evento ha alcanzado el cupo máximo de equipos');
    }
    
    // ===================================
    // 3. VALIDAR CANTIDAD DE INTEGRANTES
    // ===================================
    
    $num_integrantes = count($integrantes);
    if ($num_integrantes < 8 || $num_integrantes > 15) {
        throw new Exception("El equipo debe tener entre 8 y 15 integrantes. Actualmente tiene {$num_integrantes}");
    }
    
    // ===================================
    // 4. VERIFICAR QUE EL CAPITÁN EXISTE
    // ===================================
    
    $sqlCheckCapitan = "SELECT matricula FROM participante WHERE matricula = ?";
    $stmt = mysqli_prepare($conexion, $sqlCheckCapitan);
    mysqli_stmt_bind_param($stmt, 's', $capitan_matricula);
    mysqli_stmt_execute($stmt);
    $resultadoCapitan = mysqli_stmt_get_result($stmt);
    
    if (mysqli_num_rows($resultadoCapitan) === 0) {
        throw new Exception('El capitán debe estar registrado como participante primero');
    }
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 5. VERIFICAR QUE EL CAPITÁN ESTÁ EN LA LISTA DE INTEGRANTES
    // ===================================
    
    $capitan_en_lista = false;
    foreach ($integrantes as $integrante) {
        if ($integrante['matricula'] === $capitan_matricula) {
            $capitan_en_lista = true;
            break;
        }
    }
    
    if (!$capitan_en_lista) {
        throw new Exception('El capitán debe estar incluido en la lista de integrantes');
    }
    
    // ===================================
    // 6. VERIFICAR DUPLICADOS EN MATRÍCULA
    // ===================================
    
    $matriculas = array_column($integrantes, 'matricula');
    if (count($matriculas) !== count(array_unique($matriculas))) {
        throw new Exception('Hay matrículas duplicadas en la lista de integrantes');
    }
    
    // ===================================
    // 7. VERIFICAR QUE NINGÚN INTEGRANTE YA ESTÉ INSCRITO
    // ===================================
    
    $placeholders = str_repeat('?,', count($matriculas) - 1) . '?';
    $sqlCheckInscritos = "SELECT participante_matricula 
                          FROM inscripcion 
                          WHERE evento_id = ? AND participante_matricula IN ($placeholders)";
    
    $stmt = mysqli_prepare($conexion, $sqlCheckInscritos);
    $types = str_repeat('s', count($matriculas));
    mysqli_stmt_bind_param($stmt, 'i' . $types, $evento_id, ...$matriculas);
    mysqli_stmt_execute($stmt);
    $resultadoInscritos = mysqli_stmt_get_result($stmt);
    
    if (mysqli_num_rows($resultadoInscritos) > 0) {
        $yaInscritos = [];
        while ($row = mysqli_fetch_assoc($resultadoInscritos)) {
            $yaInscritos[] = $row['participante_matricula'];
        }
        throw new Exception('Los siguientes participantes ya están inscritos en este evento: ' . implode(', ', $yaInscritos));
    }
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 8. CREAR EL EQUIPO
    // ===================================
    
    $sqlEquipo = "INSERT INTO equipo (nombre, evento_id, capitan_matricula, fecha_registro) 
                  VALUES (?, ?, ?, NOW())";
    $stmt = mysqli_prepare($conexion, $sqlEquipo);
    mysqli_stmt_bind_param($stmt, 'sis', $nombre_equipo, $evento_id, $capitan_matricula);
    
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception('Error al crear el equipo: ' . mysqli_stmt_error($stmt));
    }
    
    $equipo_id = mysqli_insert_id($conexion);
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 9. REGISTRAR/ACTUALIZAR PARTICIPANTES E INSCRIBIRLOS
    // ===================================
    
    $integrantes_registrados = [];
    
    foreach ($integrantes as $integrante) {
        $matricula = mysqli_real_escape_string($conexion, trim($integrante['matricula']));
        $nombres = mysqli_real_escape_string($conexion, trim($integrante['nombres']));
        $apellido_paterno = mysqli_real_escape_string($conexion, trim($integrante['apellido_paterno']));
        $apellido_materno = mysqli_real_escape_string($conexion, trim($integrante['apellido_materno']));
        $correo = mysqli_real_escape_string($conexion, trim($integrante['correo']));
        $genero = mysqli_real_escape_string($conexion, trim($integrante['genero']));
        $carrera_id = isset($integrante['carrera_id']) && !empty($integrante['carrera_id']) ? intval($integrante['carrera_id']) : NULL;
        $tipo = isset($integrante['tipo']) ? mysqli_real_escape_string($conexion, $integrante['tipo']) : 'Estudiante';
        
        // Verificar si el participante ya existe
        $sqlCheckParticipante = "SELECT matricula FROM participante WHERE matricula = ?";
        $stmt = mysqli_prepare($conexion, $sqlCheckParticipante);
        mysqli_stmt_bind_param($stmt, 's', $matricula);
        mysqli_stmt_execute($stmt);
        $resultadoParticipante = mysqli_stmt_get_result($stmt);
        $participante_existe = mysqli_num_rows($resultadoParticipante) > 0;
        mysqli_stmt_close($stmt);
        
        if (!$participante_existe) {
            // Crear nuevo participante
            $sqlParticipante = "INSERT INTO participante 
                               (matricula, apellido_paterno, apellido_materno, nombres, 
                                correo_institucional, genero, carrera_id, tipo, estatus) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activo')";
            $stmt = mysqli_prepare($conexion, $sqlParticipante);
            mysqli_stmt_bind_param(
                $stmt, 
                'ssssssis', 
                $matricula, 
                $apellido_paterno, 
                $apellido_materno, 
                $nombres, 
                $correo, 
                $genero, 
                $carrera_id, 
                $tipo
            );
            
            if (!mysqli_stmt_execute($stmt)) {
                throw new Exception("Error al registrar participante {$matricula}: " . mysqli_stmt_error($stmt));
            }
            mysqli_stmt_close($stmt);
        }
        
        // Inscribir al participante en el equipo
        $es_capitan = ($matricula === $capitan_matricula) ? 1 : 0;
        
        $sqlInscripcion = "INSERT INTO inscripcion 
                          (evento_id, participante_matricula, equipo_id, es_capitan, metodo_registro, fecha_inscripcion) 
                          VALUES (?, ?, ?, ?, 'Web', NOW())";
        $stmt = mysqli_prepare($conexion, $sqlInscripcion);
        mysqli_stmt_bind_param($stmt, 'isii', $evento_id, $matricula, $equipo_id, $es_capitan);
        
        if (!mysqli_stmt_execute($stmt)) {
            throw new Exception("Error al inscribir participante {$matricula}: " . mysqli_stmt_error($stmt));
        }
        mysqli_stmt_close($stmt);
        
        $integrantes_registrados[] = "$apellido_paterno $apellido_materno $nombres ({$matricula})";
    }
    
    // ===================================
    // 10. ACTUALIZAR CONTADOR DE REGISTROS
    // ===================================
    
    $sqlUpdateContador = "UPDATE evento 
                         SET registros_actuales = registros_actuales + 1 
                         WHERE id = ?";
    $stmt = mysqli_prepare($conexion, $sqlUpdateContador);
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 11. CONFIRMAR TRANSACCIÓN
    // ===================================
    
    mysqli_commit($conexion);
    
    // ===================================
    // 12. RESPUESTA EXITOSA
    // ===================================
    
    echo json_encode([
        'success' => true,
        'mensaje' => "¡Equipo '{$nombre_equipo}' registrado exitosamente en el evento '{$evento['nombre']}'!",
        'datos' => [
            'equipo_id' => $equipo_id,
            'nombre_equipo' => $nombre_equipo,
            'evento' => $evento['nombre'],
            'capitan' => $capitan_matricula,
            'total_integrantes' => count($integrantes_registrados),
            'integrantes' => $integrantes_registrados
        ]
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Revertir transacción en caso de error
    mysqli_rollback($conexion);
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'mensaje' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

// Cerrar conexión
mysqli_close($conexion);
?>