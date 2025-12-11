<?php
/**
 * unirseEquipo.php - VERSIÓN CORREGIDA
 * Permite a un participante unirse a un equipo existente
 * Soporta Personal de servicio y Externos con correo libre.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

include '../includes/conexion.php'; 

mysqli_begin_transaction($conexion);

try {
    // ==========================================
    // 1. RECIBIR Y NORMALIZAR DATOS
    // ==========================================
    
    $equipo_id = isset($_POST['equipo_id']) ? intval($_POST['equipo_id']) : 0;
    $evento_id = isset($_POST['evento_id']) ? intval($_POST['evento_id']) : 0;
    
    $tipo_raw = isset($_POST['tipo_participante']) ? trim($_POST['tipo_participante']) : '';
    
    // --- CORRECCIÓN DE ROL (Mayúscula -> Minúscula) ---
    if ($tipo_raw === 'Personal de Servicio') {
        $tipo_raw = 'Personal de servicio';
    }
    if ($tipo_raw === 'Personal Académico') {
        $tipo_raw = 'Personal académico'; 
    }
    $tipo_participante = mysqli_real_escape_string($conexion, $tipo_raw);
    
    // Definimos roles con permisos flexibles
    $roles_libres = ['Externo', 'Personal de servicio','Personal académico'];
    $es_rol_libre = in_array($tipo_raw, $roles_libres);

    // Recibir resto de datos
    $matricula = isset($_POST['matricula']) ? mysqli_real_escape_string($conexion, trim($_POST['matricula'])) : '';
    $apellido_paterno = isset($_POST['apellido_paterno']) ? mysqli_real_escape_string($conexion, trim($_POST['apellido_paterno'])) : '';
    $apellido_materno = isset($_POST['apellido_materno']) ? mysqli_real_escape_string($conexion, trim($_POST['apellido_materno'])) : '';
    $nombres = isset($_POST['nombres']) ? mysqli_real_escape_string($conexion, trim($_POST['nombres'])) : '';
    $correo = isset($_POST['correo']) ? mysqli_real_escape_string($conexion, strtolower(trim($_POST['correo']))) : '';
    $genero = isset($_POST['genero']) ? mysqli_real_escape_string($conexion, trim($_POST['genero'])) : '';
    $carrera_id = isset($_POST['carrera']) && !empty($_POST['carrera']) ? intval($_POST['carrera']) : NULL;
    
    // --- CORRECCIÓN DE MATRÍCULA VACÍA ---
    // Si es un rol libre y no envió matrícula, usamos el correo como identificador
    if ($es_rol_libre && empty($matricula)) {
        $matricula = $correo; 
    }

    // ==========================================
    // 2. VALIDACIONES
    // ==========================================

    if ($equipo_id <= 0 || $evento_id <= 0) {
        throw new Exception('Datos de equipo o evento inválidos');
    }
    if (empty($tipo_participante) || empty($apellido_paterno) || empty($nombres) || empty($correo) || empty($genero)) {
        throw new Exception('Todos los campos son obligatorios (Nombre, Apellidos, Correo, Género, Tipo)');
    }

    // --- CORRECCIÓN DE CORREO UABC ---
    // Solo validamos UABC si NO es un rol libre
    if (!$es_rol_libre) {
        if (strpos($correo, '@uabc.mx') === false && strpos($correo, '@uabc.edu.mx') === false) {
            throw new Exception('El correo debe ser institucional (@uabc.edu.mx o @uabc.mx)');
        }
    }
    
    // Validaciones específicas por tipo
    if ($tipo_participante === 'Estudiante') {
        if (empty($matricula) || is_null($carrera_id)) {
            throw new Exception('Los estudiantes deben proporcionar matrícula y carrera');
        }
    }
    
    // ==========================================
    // 3. LÓGICA DE NEGOCIO (EQUIPO)
    // ==========================================

    // Verificar que el equipo existe, pertenece al evento y cupo
    $queryEquipo = "
        SELECT e.nombre, ev.integrantes_max
        FROM equipo e
        INNER JOIN evento ev ON e.evento_id = ev.id
        WHERE e.id = ? AND e.evento_id = ?
    ";
    $stmtEquipo = mysqli_prepare($conexion, $queryEquipo);
    mysqli_stmt_bind_param($stmtEquipo, 'ii', $equipo_id, $evento_id);
    mysqli_stmt_execute($stmtEquipo);
    $resultadoEquipo = mysqli_stmt_get_result($stmtEquipo);
    $equipo = mysqli_fetch_assoc($resultadoEquipo);
    mysqli_stmt_close($stmtEquipo);

    if (!$equipo) {
        throw new Exception('El equipo no existe o no pertenece a este evento');
    }

    // Contar integrantes actuales
    $queryContar = "SELECT COUNT(id) FROM inscripcion WHERE equipo_id = ?";
    $stmtContar = mysqli_prepare($conexion, $queryContar);
    mysqli_stmt_bind_param($stmtContar, 'i', $equipo_id);
    mysqli_stmt_execute($stmtContar);
    $resultadoContar = mysqli_stmt_get_result($stmtContar);
    $total_actual = mysqli_fetch_row($resultadoContar)[0];
    mysqli_stmt_close($stmtContar);
    
    $max_integrantes = intval($equipo['integrantes_max']);
    
    if ($max_integrantes > 0 && $total_actual >= $max_integrantes) {
        throw new Exception('El equipo ya alcanzó su límite de integrantes');
    }

    // ==========================================
    // 4. CREAR O ACTUALIZAR USUARIO
    // ==========================================
    
    $usuario_id = 0;
    
    $queryCheckUsuario = "SELECT id FROM usuario WHERE matricula = ? LIMIT 1";
    $stmtCheck = mysqli_prepare($conexion, $queryCheckUsuario);
    mysqli_stmt_bind_param($stmtCheck, 's', $matricula);
    mysqli_stmt_execute($stmtCheck);
    $resultadoUsuario = mysqli_stmt_get_result($stmtCheck);
    $usuarioExistente = mysqli_fetch_assoc($resultadoUsuario);
    mysqli_stmt_close($stmtCheck);

    if ($usuarioExistente) {
        // Usuario existe: Actualizar
        $usuario_id = $usuarioExistente['id'];
        $sqlUpdateUsuario = "UPDATE usuario 
                             SET nombre = ?, apellido_paterno = ?, apellido_materno = ?,
                                 correo = ?, genero = ?, carrera_id = ?, rol = ?, activo = 1
                             WHERE id = ?";
        $stmtUpdate = mysqli_prepare($conexion, $sqlUpdateUsuario);
        mysqli_stmt_bind_param(
            $stmtUpdate, 'sssssisi',
            $nombres, $apellido_paterno, $apellido_materno, $correo, $genero, $carrera_id, $tipo_participante, $usuario_id
        );
        mysqli_stmt_execute($stmtUpdate);
        mysqli_stmt_close($stmtUpdate);

    } else {
        // Usuario NO existe: Crear
        $queryInsertUsuario = "
            INSERT INTO usuario 
            (matricula, apellido_paterno, apellido_materno, nombre, correo, genero, carrera_id, rol, activo, contrasena)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)
        ";
        $stmtInsert = mysqli_prepare($conexion, $queryInsertUsuario);
        mysqli_stmt_bind_param(
            $stmtInsert, 'ssssssis', 
            $matricula, $apellido_paterno, $apellido_materno, $nombres, $correo, $genero, $carrera_id, $tipo_participante
        );
        if (!mysqli_stmt_execute($stmtInsert)) {
            if (mysqli_errno($conexion) == 1062) {
                 // Verificar si el duplicado es por correo
                 throw new Exception('El correo electrónico ya está registrado por otro usuario.');
            }
             throw new Exception('Error al registrar usuario: ' . mysqli_stmt_error($stmtInsert));
        }
        $usuario_id = mysqli_insert_id($conexion);
        mysqli_stmt_close($stmtInsert);
    }
    
    // ==========================================
    // 5. REGISTRAR INSCRIPCIÓN
    // ==========================================

    // Verificar si el usuario ya está inscrito en el evento
    $queryYaInscrito = "
        SELECT id FROM inscripcion 
        WHERE evento_id = ? AND usuario_id = ?
    ";
    $stmtYaInscrito = mysqli_prepare($conexion, $queryYaInscrito);
    mysqli_stmt_bind_param($stmtYaInscrito, 'ii', $evento_id, $usuario_id);
    mysqli_stmt_execute($stmtYaInscrito);
    
    if (mysqli_stmt_fetch($stmtYaInscrito)) {
        mysqli_stmt_close($stmtYaInscrito);
        throw new Exception('Ya estás inscrito en este evento (quizás en otro equipo)');
    }
    mysqli_stmt_close($stmtYaInscrito);

    // Insertar inscripción
    $es_capitan = 0;
    $queryInscripcion = "
        INSERT INTO inscripcion (evento_id, usuario_id, equipo_id, es_capitan, metodo_registro, fecha_inscripcion)
        VALUES (?, ?, ?, ?, 'Web', NOW())
    ";
    $stmtInscripcion = mysqli_prepare($conexion, $queryInscripcion);
    mysqli_stmt_bind_param($stmtInscripcion, 'iiii', $evento_id, $usuario_id, $equipo_id, $es_capitan);
    
    if (!mysqli_stmt_execute($stmtInscripcion)) {
        throw new Exception('Error al registrar la inscripción: ' . mysqli_stmt_error($stmtInscripcion));
    }
    mysqli_stmt_close($stmtInscripcion);

    mysqli_commit($conexion);

    echo json_encode([
        'success' => true,
        'mensaje' => "¡Te has unido exitosamente al equipo '{$equipo['nombre']}'!",
        'nombre_equipo' => $equipo['nombre']
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    mysqli_rollback($conexion);
    http_response_code(400); 
    echo json_encode([
        'success' => false,
        'mensaje' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

mysqli_close($conexion);
?>