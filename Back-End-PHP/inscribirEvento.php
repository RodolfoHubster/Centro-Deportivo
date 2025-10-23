<?php
/**
 * Inscribir Evento - VERSIÓN NORMALIZADA
 * Ahora usa la tabla 'usuario' como tabla maestra
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
    
    $carrera_id = isset($_POST['carrera']) && !empty($_POST['carrera']) ? intval($_POST['carrera']) : NULL;
    $tipo_participante = isset($_POST['tipo_participante']) ? mysqli_real_escape_string($conexion, trim($_POST['tipo_participante'])) : 'Estudiante';
    
    // ===================================
    // 3. VALIDACIONES
    // ===================================
    
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Formato de correo electrónico inválido');
    }
    if (strpos($correo, '@uabc.mx') === false && strpos($correo, '@uabc.edu.mx') === false) {
        throw new Exception('Debes usar tu correo institucional de UABC (@uabc.mx o @uabc.edu.mx)');
    }
    
    $generos_validos = ['Hombre', 'Mujer'];
    if (!in_array($genero, $generos_validos)) {
        throw new Exception('Género inválido');
    }
    
    $tipos_validos = ['Estudiante', 'Docente', 'Externo'];
    if (!in_array($tipo_participante, $tipos_validos)) {
        throw new Exception('Tipo de participante inválido');
    }
    
    if (!preg_match('/^\d{6,10}$/', $matricula)) {
        throw new Exception('La matrícula debe contener entre 6 y 10 dígitos');
    }
    
    // ===================================
    // 4. VERIFICAR QUE EL EVENTO EXISTE Y TIENE CUPO
    // ===================================
    
    $sqlEvento = "SELECT id, nombre, cupo_maximo, registros_actuales, activo 
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
    if ($evento['cupo_maximo'] > 0 && $evento['registros_actuales'] >= $evento['cupo_maximo']) {
        throw new Exception('El evento ha alcanzado el cupo máximo de participantes');
    }
    
    // ===================================
    // 5. CREAR/ACTUALIZAR PARTICIPANTE (AHORA EN TABLA 'usuario')
    // ===================================
    
    $usuario_id = 0;
    $usuario_nuevo = false;

    // Verificar si el usuario ya existe por su MATRICULA (que es única)
    $sqlCheckUsuario = "SELECT id FROM usuario WHERE matricula = ?";
    $stmt = mysqli_prepare($conexion, $sqlCheckUsuario);
    mysqli_stmt_bind_param($stmt, 's', $matricula);
    mysqli_stmt_execute($stmt);
    $resultadoUsuario = mysqli_stmt_get_result($stmt);
    
    if ($row = mysqli_fetch_assoc($resultadoUsuario)) {
        // === USUARIO EXISTE ===
        $usuario_id = $row['id'];
        mysqli_stmt_close($stmt);
        
        // Actualizar sus datos por si cambiaron
        $sqlUpdateUsuario = "UPDATE usuario 
                                 SET nombre = ?, apellido_paterno = ?, apellido_materno = ?,
                                     correo = ?, genero = ?, carrera_id = ?, rol = ?
                                 WHERE id = ?";
        $stmt = mysqli_prepare($conexion, $sqlUpdateUsuario);
        mysqli_stmt_bind_param(
            $stmt,
            'sssssisi',
            $nombres,
            $apellido_paterno,
            $apellido_materno,
            $correo,
            $genero,
            $carrera_id,
            $tipo_participante,
            $usuario_id
        );
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        
    } else {
        // === USUARIO NO EXISTE ===
        mysqli_stmt_close($stmt);
        $usuario_nuevo = true;
        
        // Crear nuevo usuario (sin contraseña, rol de participante)
        $sqlUsuario = "INSERT INTO usuario 
                           (matricula, nombre, apellido_paterno, apellido_materno, 
                            correo, genero, carrera_id, rol, activo, contrasena) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)";
        $stmt = mysqli_prepare($conexion, $sqlUsuario);
        mysqli_stmt_bind_param(
            $stmt, 
            'ssssssis', 
            $matricula, 
            $nombres, 
            $apellido_paterno, 
            $apellido_materno, 
            $correo, 
            $genero, 
            $carrera_id, 
            $tipo_participante
        );
        
        if (!mysqli_stmt_execute($stmt)) {
            throw new Exception('Error al registrar al participante: ' . mysqli_stmt_error($stmt));
        }
        
        $usuario_id = mysqli_insert_id($conexion);
        mysqli_stmt_close($stmt);
    }
    
    // ===================================
    // 6. VERIFICAR SI YA ESTÁ INSCRITO
    // ===================================
    
    $sqlVerificar = "SELECT id FROM inscripcion 
                     WHERE evento_id = ? AND usuario_id = ?";
    $stmt = mysqli_prepare($conexion, $sqlVerificar);
    mysqli_stmt_bind_param($stmt, 'ii', $evento_id, $usuario_id);
    mysqli_stmt_execute($stmt);
    $resultadoVerificar = mysqli_stmt_get_result($stmt);
    
    if (mysqli_num_rows($resultadoVerificar) > 0) {
        throw new Exception('Ya estás inscrito en este evento');
    }
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 7. CREAR INSCRIPCIÓN
    // ===================================
    
    $sqlInscripcion = "INSERT INTO inscripcion 
                      (evento_id, usuario_id, metodo_registro, fecha_inscripcion) 
                      VALUES (?, ?, 'Web', NOW())";
    $stmt = mysqli_prepare($conexion, $sqlInscripcion);
    mysqli_stmt_bind_param($stmt, 'ii', $evento_id, $usuario_id);
    
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
            'participante_nuevo' => $usuario_nuevo
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