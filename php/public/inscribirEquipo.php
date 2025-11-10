<?php
/**
 * Inscribir Equipo - VERSIÓN NORMALIZADA
 * Permite registrar equipos completos para torneos
 *
 * (ARCHIVO CORREGIDO: Ahora lee los límites min/max desde la BD)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

include '../includes/conexion.php';

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
    
    // <-- CAMBIO 1: Agregamos 'integrantes_min' e 'integrantes_max' a la consulta
    $sqlEvento = "SELECT id, nombre, tipo_registro, cupo_maximo, registros_actuales, activo,
                         integrantes_min, integrantes_max 
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
    if ($evento['cupo_maximo'] > 0 && $evento['registros_actuales'] >= $evento['cupo_maximo']) {
        throw new Exception('El evento ha alcanzado el cupo máximo de equipos');
    }
    
    // ===================================
    // 3. VALIDAR CANTIDAD DE INTEGRANTES Y MATRÍCULAS
    // ===================================
    
    $num_integrantes = count($integrantes);

    // <-- CAMBIO 2: Reemplazamos la validación "hardcodeada"
    // Ahora leemos los límites de la variable $evento (que viene de la BD)
    
    $min = $evento['integrantes_min'];
    $max = $evento['integrantes_max'];

    // Si el mínimo es NULO o 0, ponemos 1 por defecto
    if ($min == 0 || $min == NULL) {
        $min = 1;
    }

    // Si el máximo es NULO o 0, lo tratamos como "sin límite" (un número muy grande)
    if ($max == 0 || $max == NULL) {
        $max = 999; 
    }

    // ¡LA VALIDACIÓN CORRECTA!
    // Compara el número de integrantes con las variables $min y $max
    if ($num_integrantes < $min || $num_integrantes > $max) {
        // Usamos las variables $min y $max en el mensaje de error
        // Esto ahora dirá "entre 2 y 8" (o lo que pongas en la BD)
        throw new Exception("El equipo debe tener entre {$min} y {$max} integrantes. Actualmente tiene {$num_integrantes}");
    }
    // <-- FIN DEL CAMBIO 2
    
    
    $capitan_en_lista = false;
    $matriculas = [];
    foreach ($integrantes as $integrante) {
        if ($integrante['matricula'] === $capitan_matricula) {
            $capitan_en_lista = true;
        }
        $matriculas[] = $integrante['matricula'];
    }
    
    if (!$capitan_en_lista) {
        throw new Exception('El capitán debe estar incluido en la lista de integrantes');
    }
    if (count($matriculas) !== count(array_unique($matriculas))) {
        throw new Exception('Hay matrículas duplicadas en la lista de integrantes');
    }
    
    // ===================================
    // 4. REGISTRAR/ACTUALIZAR PARTICIPANTES (AHORA EN 'usuario')
    // ===================================
    
    $usuario_ids = []; // Array para guardar los IDs [matricula => id]
    $capitan_usuario_id = 0;
    $integrantes_registrados_nombres = []; // Para la respuesta final

    foreach ($integrantes as $integrante) {
        // --- Validar datos de cada integrante ---
        if (empty(trim($integrante['matricula']))) throw new Exception('Todos los integrantes deben tener matrícula');
        if (empty(trim($integrante['nombres']))) throw new Exception('Todos los integrantes deben tener nombre');
        if (empty(trim($integrante['apellido_paterno']))) throw new Exception('Todos los integrantes deben tener apellido paterno');
        if (empty(trim($integrante['apellido_materno']))) throw new Exception('Todos los integrantes deben tener apellido materno');
        if (empty(trim($integrante['correo']))) throw new Exception('Todos los integrantes deben tener correo');
        if (empty(trim($integrante['genero']))) throw new Exception('Todos los integrantes deben tener género');
        // --- Fin validación ---

        $matricula = mysqli_real_escape_string($conexion, trim($integrante['matricula']));
        $nombres = mysqli_real_escape_string($conexion, trim($integrante['nombres']));
        $apellido_paterno = mysqli_real_escape_string($conexion, trim($integrante['apellido_paterno']));
        $apellido_materno = mysqli_real_escape_string($conexion, trim($integrante['apellido_materno']));
        $correo = mysqli_real_escape_string($conexion, trim($integrante['correo']));
        $genero = mysqli_real_escape_string($conexion, trim($integrante['genero']));
        $carrera_id = isset($integrante['carrera_id']) && !empty($integrante['carrera_id']) ? intval($integrante['carrera_id']) : NULL;
        
        // Corregido: el JS envía 'tipo_participante', no 'tipo'
        $tipo_participante = isset($integrante['tipo_participante']) ? mysqli_real_escape_string($conexion, $integrante['tipo_participante']) : 'Estudiante';
        
        $current_usuario_id = 0;
        
        // Verificar si el usuario ya existe por su MATRICULA
        $sqlCheckUsuario = "SELECT id FROM usuario WHERE matricula = ?";
        $stmt = mysqli_prepare($conexion, $sqlCheckUsuario);
        mysqli_stmt_bind_param($stmt, 's', $matricula);
        mysqli_stmt_execute($stmt);
        $resultadoUsuario = mysqli_stmt_get_result($stmt);
        
        if ($row = mysqli_fetch_assoc($resultadoUsuario)) {
            // === USUARIO EXISTE ===
            $current_usuario_id = $row['id'];
            mysqli_stmt_close($stmt);
            
            $sqlUpdateUsuario = "UPDATE usuario 
                                 SET nombre = ?, apellido_paterno = ?, apellido_materno = ?,
                                     correo = ?, genero = ?, carrera_id = ?, rol = ?
                                 WHERE id = ?";
            $stmt = mysqli_prepare($conexion, $sqlUpdateUsuario);
            mysqli_stmt_bind_param(
                $stmt, 'sssssisi',
                $nombres, $apellido_paterno, $apellido_materno, $correo, $genero, $carrera_id, $tipo_participante, $current_usuario_id
            );
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);

        } else {
            // === USUARIO NO EXISTE ===
            mysqli_stmt_close($stmt);
            
            $sqlUsuario = "INSERT INTO usuario 
                           (matricula, nombre, apellido_paterno, apellido_materno, 
                            correo, genero, carrera_id, rol, activo, contrasena) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)";
            $stmt = mysqli_prepare($conexion, $sqlUsuario);
            mysqli_stmt_bind_param(
                $stmt, 'ssssssis', 
                $matricula, $nombres, $apellido_paterno, $apellido_materno, $correo, $genero, $carrera_id, $tipo_participante
            );
            
            if (!mysqli_stmt_execute($stmt)) {
                throw new Exception("Error al registrar participante {$matricula}: " . mysqli_stmt_error($stmt));
            }
            $current_usuario_id = mysqli_insert_id($conexion);
            mysqli_stmt_close($stmt);
        }
        
        // Guardar el ID
        $usuario_ids[$matricula] = $current_usuario_id;
        
        if ($matricula === $capitan_matricula) {
            $capitan_usuario_id = $current_usuario_id;
        }
        
        $integrantes_registrados_nombres[] = "$apellido_paterno $apellido_materno $nombres ({$matricula})";
    }

    if ($capitan_usuario_id === 0) {
        throw new Exception('No se pudo verificar la ID del capitán. La matrícula del capitán no coincide con ninguna de la lista.');
    }

    // ===================================
    // 5. VERIFICAR QUE NINGÚN INTEGRANTE YA ESTÉ INSCRITO
    // ===================================
    
    $lista_ids_usuarios = array_values($usuario_ids);
    $placeholders = str_repeat('?,', count($lista_ids_usuarios) - 1) . '?';
    
    $sqlCheckInscritos = "SELECT u.matricula 
                          FROM inscripcion i
                          JOIN usuario u ON i.usuario_id = u.id
                          WHERE i.evento_id = ? AND i.usuario_id IN ($placeholders)";
    
    $stmt = mysqli_prepare($conexion, $sqlCheckInscritos);
    
    // El primer tipo es 'i' para el evento_id
    $types = 'i' . str_repeat('i', count($lista_ids_usuarios));
    $params = array_merge([$evento_id], $lista_ids_usuarios);

    mysqli_stmt_bind_param($stmt, $types, ...$params);
    
    mysqli_stmt_execute($stmt);
    $resultadoInscritos = mysqli_stmt_get_result($stmt);
    
    if (mysqli_num_rows($resultadoInscritos) > 0) {
        $yaInscritos = [];
        while ($row = mysqli_fetch_assoc($resultadoInscritos)) {
            $yaInscritos[] = $row['matricula'];
        }
        throw new Exception('Los siguientes participantes ya están inscritos en este evento: ' . implode(', ', $yaInscritos));
    }
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 6. CREAR EL EQUIPO
    // ===================================
    
    $sqlEquipo = "INSERT INTO equipo (nombre, evento_id, capitan_usuario_id, fecha_registro) 
                   VALUES (?, ?, ?, NOW())";
    $stmt = mysqli_prepare($conexion, $sqlEquipo);
    mysqli_stmt_bind_param($stmt, 'sii', $nombre_equipo, $evento_id, $capitan_usuario_id);
    
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception('Error al crear el equipo: ' . mysqli_stmt_error($stmt));
    }
    
    $equipo_id = mysqli_insert_id($conexion);
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 7. REGISTRAR INSCRIPCIONES DEL EQUIPO
    // ===================================
    
    $sqlInscripcion = "INSERT INTO inscripcion 
                       (evento_id, usuario_id, equipo_id, es_capitan, metodo_registro, fecha_inscripcion) 
                       VALUES (?, ?, ?, ?, 'Web', NOW())";
    $stmt = mysqli_prepare($conexion, $sqlInscripcion);
    
    foreach ($usuario_ids as $matricula => $usuario_id) {
        $es_capitan = ($usuario_id === $capitan_usuario_id) ? 1 : 0;
        
        mysqli_stmt_bind_param($stmt, 'iiii', $evento_id, $usuario_id, $equipo_id, $es_capitan);
        
        if (!mysqli_stmt_execute($stmt)) {
            throw new Exception("Error al inscribir participante {$matricula}: " . mysqli_stmt_error($stmt));
        }
    }
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 8. ACTUALIZAR CONTADOR DE REGISTROS
    // ===================================
    
    // 'registros_actuales' en 'evento' cuenta equipos, no personas
    $sqlUpdateContador = "UPDATE evento 
                          SET registros_actuales = registros_actuales + 1 
                          WHERE id = ?";
    $stmt = mysqli_prepare($conexion, $sqlUpdateContador);
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 9. CONFIRMAR TRANSACCIÓN
    // ===================================
    
    mysqli_commit($conexion);
    
    // ===================================
    // 10. RESPUESTA EXITOSA
    // ===================================
    
    echo json_encode([
        'success' => true,
        'mensaje' => "¡Equipo '{$nombre_equipo}' registrado exitosamente en el evento '{$evento['nombre']}'!",
        'datos' => [
            'equipo_id' => $equipo_id,
            'nombre_equipo' => $nombre_equipo,
            'evento' => $evento['nombre'],
            'capitan_matricula' => $capitan_matricula,
            'total_integrantes' => count($integrantes_registrados_nombres),
            'integrantes' => $integrantes_registrados_nombres
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