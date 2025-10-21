<?php
/**
 * Inscribir Evento - ACTUALIZADO para nueva estructura BD
 * Ahora usa tabla 'participante' e 'inscripcion' correctamente
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
    // 1. VALIDAR CAMPOS OBLIGATORIOS
    // ===================================
    
    $camposRequeridos = [
        'evento_id' => 'ID del evento',
        'matricula' => 'Matrícula',
        'apellido_paterno' => 'Apellido paterno',
        'apellido_materno' => 'Apellido materno',
        'nombres' => 'Nombre(s)',
        'correo' => 'Correo electrónico',
        'genero' => 'Género'
    ];
    
    foreach ($camposRequeridos as $campo => $nombreCampo) {
        if (!isset($_POST[$campo]) || empty(trim($_POST[$campo]))) {
            throw new Exception("El campo '{$nombreCampo}' es obligatorio");
        }
    }
    
    // ===================================
    // 2. OBTENER Y LIMPIAR DATOS
    // ===================================
    
    $evento_id = intval($_POST['evento_id']);
    $matricula = mysqli_real_escape_string($conexion, trim($_POST['matricula']));
    $apellido_paterno = mysqli_real_escape_string($conexion, trim($_POST['apellido_paterno']));
    $apellido_materno = mysqli_real_escape_string($conexion, trim($_POST['apellido_materno']));
    $nombres = mysqli_real_escape_string($conexion, trim($_POST['nombres']));
    $correo = mysqli_real_escape_string($conexion, trim($_POST['correo']));
    $genero = mysqli_real_escape_string($conexion, trim($_POST['genero']));
    
    // Campos opcionales
    $carrera_id = isset($_POST['carrera']) && !empty($_POST['carrera']) ? intval($_POST['carrera']) : NULL;
    $tipo_participante = isset($_POST['tipo_participante']) ? mysqli_real_escape_string($conexion, trim($_POST['tipo_participante'])) : 'Estudiante';
    
    // ===================================
    // 3. VALIDACIONES
    // ===================================
    
    // Validar formato de correo
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Formato de correo electrónico inválido');
    }
    
    // Validar que sea correo institucional (opcional)
    if (strpos($correo, '@uabc.mx') === false && strpos($correo, '@uabc.edu.mx') === false) {
        throw new Exception('Debes usar tu correo institucional de UABC (@uabc.mx o @uabc.edu.mx)');
    }
    
    // Validar género
    $generos_validos = ['Hombre', 'Mujer', 'M', 'F'];
    if (!in_array($genero, $generos_validos)) {
        throw new Exception('Género inválido');
    }
    
    // Normalizar género
    if ($genero === 'M') $genero = 'Hombre';
    if ($genero === 'F') $genero = 'Mujer';
    
    // Validar tipo de participante
    $tipos_validos = ['Estudiante', 'Docente', 'Externo'];
    if (!in_array($tipo_participante, $tipos_validos)) {
        throw new Exception('Tipo de participante inválido');
    }
    
    // Validar matrícula (solo números y longitud apropiada)
    if (!preg_match('/^\d{6,10}$/', $matricula)) {
        throw new Exception('La matrícula debe contener entre 6 y 10 dígitos');
    }
    
    // ===================================
    // 4. VERIFICAR QUE EL EVENTO EXISTE Y TIENE CUPO
    // ===================================
    
    $sqlEvento = "SELECT id, nombre, cupo_maximo, registros_actuales, activo, tipo_registro 
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
    
    // Verificar que el evento esté activo
    if (!$evento['activo']) {
        throw new Exception('El evento no está disponible para inscripciones');
    }
    
    // Verificar cupo disponible
    if ($evento['cupo_maximo'] > 0 && $evento['registros_actuales'] >= $evento['cupo_maximo']) {
        throw new Exception('El evento ha alcanzado el cupo máximo de participantes');
    }
    
    // ===================================
    // 5. VERIFICAR SI YA ESTÁ INSCRITO
    // ===================================
    
    $sqlVerificar = "SELECT id FROM inscripcion 
                     WHERE evento_id = ? AND participante_matricula = ?";
    $stmt = mysqli_prepare($conexion, $sqlVerificar);
    mysqli_stmt_bind_param($stmt, 'is', $evento_id, $matricula);
    mysqli_stmt_execute($stmt);
    $resultadoVerificar = mysqli_stmt_get_result($stmt);
    
    if (mysqli_num_rows($resultadoVerificar) > 0) {
        throw new Exception('Ya estás inscrito en este evento');
    }
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 6. CREAR/ACTUALIZAR PARTICIPANTE
    // ===================================
    
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
            $tipo_participante
        );
        
        if (!mysqli_stmt_execute($stmt)) {
            throw new Exception('Error al registrar participante: ' . mysqli_stmt_error($stmt));
        }
        mysqli_stmt_close($stmt);
    } else {
        // Actualizar datos del participante existente (opcional)
        $sqlUpdateParticipante = "UPDATE participante 
                                 SET apellido_paterno = ?,
                                     apellido_materno = ?,
                                     nombres = ?,
                                     correo_institucional = ?,
                                     genero = ?,
                                     carrera_id = ?,
                                     tipo = ?
                                 WHERE matricula = ?";
        $stmt = mysqli_prepare($conexion, $sqlUpdateParticipante);
        mysqli_stmt_bind_param(
            $stmt,
            'sssssis',
            $apellido_paterno,
            $apellido_materno,
            $nombres,
            $correo,
            $genero,
            $carrera_id,
            $tipo_participante,
            $matricula
        );
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
    }
    
    // ===================================
    // 7. CREAR INSCRIPCIÓN
    // ===================================
    
    $sqlInscripcion = "INSERT INTO inscripcion 
                      (evento_id, participante_matricula, metodo_registro, fecha_inscripcion) 
                      VALUES (?, ?, 'Web', NOW())";
    $stmt = mysqli_prepare($conexion, $sqlInscripcion);
    mysqli_stmt_bind_param($stmt, 'is', $evento_id, $matricula);
    
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception('Error al procesar inscripción: ' . mysqli_stmt_error($stmt));
    }
    
    $inscripcion_id = mysqli_insert_id($conexion);
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 8. ACTUALIZAR CONTADOR DE REGISTROS
    // ===================================
    
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
        'mensaje' => "¡Registro exitoso! Te has inscrito al evento '{$evento['nombre']}'",
        'datos' => [
            'inscripcion_id' => $inscripcion_id,
            'evento' => $evento['nombre'],
            'matricula' => $matricula,
            'nombre_completo' => "$apellido_paterno $apellido_materno $nombres",
            'correo' => $correo,
            'participante_nuevo' => !$participante_existe
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