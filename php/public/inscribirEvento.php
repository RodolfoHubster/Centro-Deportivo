<?php
/**
 * Inscribir Evento - VERSIÓN CORREGIDA PARA USAR TABLA 'usuario'
 */

error_reporting(0);
ini_set('display_errors', 0);
ob_start();
ob_clean();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

include '../includes/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
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
    
    // El tipo 'Externo' no requiere matrícula
    $tipo_participante_temp = $_POST['tipo_participante'] ?? 'Estudiante';
    $es_externo = ($tipo_participante_temp === 'Externo');

    $camposRequeridos = [
        'evento_id' => 'ID del evento',
        'apellido_paterno' => 'Apellido paterno',
        'apellido_materno' => 'Apellido materno',
        'nombres' => 'Nombre(s)',
        'correo' => 'Correo electrónico',
        'genero' => 'Género'
    ];

    // La matrícula solo es obligatoria si NO es externo
    if (!$es_externo) {
        $camposRequeridos['matricula'] = 'Matrícula';
    }
    
    foreach ($camposRequeridos as $campo => $nombreCampo) {
        if (!isset($_POST[$campo]) || empty(trim($_POST[$campo]))) {
            // Permitir matrícula vacía si es externo
            if ($campo === 'matricula' && $es_externo) {
                continue;
            }
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
    
    // Si es externo y la matrícula está vacía, usar NULL o un valor único
    if ($es_externo && empty($matricula)) {
        // Usar correo para unicidad si la matrícula es nula
        $matricula = $correo; 
    }

    // ===================================
    // 3. VALIDACIONES
    // ===================================
    
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Formato de correo electrónico inválido');
    }
    
    // Permitir correos no UABC solo si es Externo
    if (!$es_externo && strpos($correo, '@uabc.mx') === false && strpos($correo, '@uabc.edu.mx') === false) {
        throw new Exception('Debes usar tu correo institucional de UABC (@uabc.mx o @uabc.edu.mx)');
    }
    
    $generos_validos = ['Hombre', 'Mujer','Prefiero no decirlo'];
    if (!in_array($genero, $generos_validos)) {
        throw new Exception('Género inválido');
    }
    
    $tipos_validos = ['Estudiante', 'Docente', 'Externo'];
    if (!in_array($tipo_participante, $tipos_validos)) {
        throw new Exception('Tipo de participante inválido');
    }
    
    if (!$es_externo && !preg_match('/^\d{4,10}$/', $matricula)) {
        throw new Exception('La matrícula debe contener entre 4 y 10 dígitos');
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
    // 5. CREAR/ACTUALIZAR USUARIO
    // ===================================
    
    $usuario_id = 0;
    $usuario_nuevo = false;

    // Verificar si el usuario ya existe por MATRICULA (o correo si es externo)
    $sqlCheckUsuario = "SELECT id FROM usuario WHERE matricula = ?";
    $stmt = mysqli_prepare($conexion, $sqlCheckUsuario);
    mysqli_stmt_bind_param($stmt, 's', $matricula);
    mysqli_stmt_execute($stmt);
    $resultadoUsuario = mysqli_stmt_get_result($stmt);
    
    if ($row = mysqli_fetch_assoc($resultadoUsuario)) {
        // === USUARIO EXISTE - ACTUALIZAR ===
        $usuario_id = $row['id'];
        mysqli_stmt_close($stmt);
        
        $sqlUpdateUsuario = "UPDATE usuario 
                             SET nombre = ?, 
                                 apellido_paterno = ?, 
                                 apellido_materno = ?,
                                 correo = ?, 
                                 genero = ?, 
                                 carrera_id = ?, 
                                 rol = ?,
                                 activo = 1
                             WHERE id = ?";
        $stmt = mysqli_prepare($conexion, $sqlUpdateUsuario);
        
        if (!$stmt) {
            throw new Exception('Error al preparar actualización: ' . mysqli_error($conexion));
        }
        
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
        // === USUARIO NO EXISTE - CREAR ===
        mysqli_stmt_close($stmt);
        $usuario_nuevo = true;
        
        $sqlUsuario = "INSERT INTO usuario 
                       (matricula, apellido_paterno, apellido_materno, nombre,
                        correo, genero, carrera_id, rol, activo, contrasena) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)";
        $stmt = mysqli_prepare($conexion, $sqlUsuario);
        
        if (!$stmt) {
            throw new Exception('Error al preparar inserción de usuario: ' . mysqli_error($conexion));
        }
        
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
            // Si falla, podría ser por correo duplicado (si la matrícula era única)
            if (strpos(mysqli_stmt_error($stmt), 'correo') !== false) {
                 throw new Exception('Error al registrar: El correo electrónico ya está en uso por otro usuario.');
            }
            throw new Exception('Error al registrar al usuario: ' . mysqli_stmt_error($stmt));
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
    // 8. ACTUALIZAR CONTADOR
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
    
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'mensaje' => "¡Registro exitoso! Te has inscrito al evento '{$evento['nombre']}'",
        'datos' => [
            'inscripcion_id' => $inscripcion_id,
            'evento' => $evento['nombre'],
            'matricula' => $matricula,
            'nombre_completo' => "$apellido_paterno $apellido_materno $nombres",
            'correo' => $correo,
            'usuario_nuevo' => $usuario_nuevo
        ]
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    mysqli_rollback($conexion);
    
    ob_end_clean();
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'mensaje' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

mysqli_close($conexion);
exit;
?>