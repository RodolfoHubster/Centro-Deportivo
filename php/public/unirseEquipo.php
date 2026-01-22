<?php
/**
 * unirseEquipo.php - VERSIÓN CORREGIDA 
 * Permite a un participante unirse a un equipo existente.
 * Incluye protección contra errores fatales al buscar el horario del capitán.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

include '../includes/conexion.php'; 

// Habilitar reporte de errores interno para evitar salidas HTML inesperadas
mysqli_report(MYSQLI_REPORT_OFF);

mysqli_begin_transaction($conexion);

try {
    // ==========================================
    // 1. RECIBIR DATOS
    // ==========================================
    
    $equipo_id = isset($_POST['equipo_id']) ? intval($_POST['equipo_id']) : 0;
    $evento_id = isset($_POST['evento_id']) ? intval($_POST['evento_id']) : 0;
    
    // Variables de horario iniciales
    $horario_disponible = NULL;
    $dias_disponibles = NULL;

    $tipo_raw = isset($_POST['tipo_participante']) ? trim($_POST['tipo_participante']) : '';
    
    // Normalización
    if ($tipo_raw === 'Personal de Servicio') $tipo_raw = 'Personal de servicio';
    if ($tipo_raw === 'Personal Académico') $tipo_raw = 'Personal académico'; 
    $tipo_participante = mysqli_real_escape_string($conexion, $tipo_raw);
    
    $roles_libres = ['Externo', 'Personal de servicio','Personal académico'];
    $es_rol_libre = in_array($tipo_raw, $roles_libres);

    $matricula = isset($_POST['matricula']) ? mysqli_real_escape_string($conexion, trim($_POST['matricula'])) : '';
    $apellido_paterno = isset($_POST['apellido_paterno']) ? mysqli_real_escape_string($conexion, trim($_POST['apellido_paterno'])) : '';
    $apellido_materno = isset($_POST['apellido_materno']) ? mysqli_real_escape_string($conexion, trim($_POST['apellido_materno'])) : '';
    $nombres = isset($_POST['nombres']) ? mysqli_real_escape_string($conexion, trim($_POST['nombres'])) : '';
    $correo = isset($_POST['correo']) ? mysqli_real_escape_string($conexion, strtolower(trim($_POST['correo']))) : '';
    $genero = isset($_POST['genero']) ? mysqli_real_escape_string($conexion, trim($_POST['genero'])) : '';
    $carrera_id = isset($_POST['carrera']) && !empty($_POST['carrera']) ? intval($_POST['carrera']) : NULL;
    $campus_id = isset($_POST['campus']) && !empty($_POST['campus']) ? intval($_POST['campus']) : NULL;
    $facultad_id = isset($_POST['facultad']) && !empty($_POST['facultad']) ? intval($_POST['facultad']) : NULL;
    
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
        throw new Exception('Todos los campos son obligatorios');
    }

    if (!$es_rol_libre) {
        if (strpos($correo, '@uabc.mx') === false && strpos($correo, '@uabc.edu.mx') === false) {
            throw new Exception('El correo debe ser institucional (@uabc.edu.mx o @uabc.mx)');
        }
    }
    
    if ($tipo_participante === 'Estudiante') {
        if (empty($matricula) || is_null($carrera_id)) {
            throw new Exception('Los estudiantes deben proporcionar matrícula y carrera');
        }
    }
    
    // ==========================================
    // 3. LÓGICA DE NEGOCIO
    // ==========================================

    // 3.1 Verificar equipo
    $queryEquipo = "SELECT e.nombre, ev.integrantes_max FROM equipo e INNER JOIN evento ev ON e.evento_id = ev.id WHERE e.id = ? AND e.evento_id = ?";
    $stmtEquipo = mysqli_prepare($conexion, $queryEquipo);
    if (!$stmtEquipo) throw new Exception("Error DB Equipo: " . mysqli_error($conexion));
    
    mysqli_stmt_bind_param($stmtEquipo, 'ii', $equipo_id, $evento_id);
    mysqli_stmt_execute($stmtEquipo);
    $resultadoEquipo = mysqli_stmt_get_result($stmtEquipo);
    $equipo = mysqli_fetch_assoc($resultadoEquipo);
    mysqli_stmt_close($stmtEquipo);

    if (!$equipo) {
        throw new Exception('El equipo no existe o no pertenece a este evento');
    }

    // 3.2 Contar integrantes
    $queryContar = "SELECT COUNT(id) FROM inscripcion WHERE equipo_id = ?";
    $stmtContar = mysqli_prepare($conexion, $queryContar);
    if (!$stmtContar) throw new Exception("Error DB Contar: " . mysqli_error($conexion));
    
    mysqli_stmt_bind_param($stmtContar, 'i', $equipo_id);
    mysqli_stmt_execute($stmtContar);
    // Usamos bind_result para máxima compatibilidad
    $total_actual = 0;
    mysqli_stmt_bind_result($stmtContar, $total_actual);
    mysqli_stmt_fetch($stmtContar);
    mysqli_stmt_close($stmtContar);
    
    if (intval($equipo['integrantes_max']) > 0 && $total_actual >= intval($equipo['integrantes_max'])) {
        throw new Exception('El equipo ya alcanzó su límite de integrantes');
    }

    // ---------------------------------------------------------
    // === OBTENER HORARIO DEL CAPITÁN (MÉTODO SEGURO) ===
    // ---------------------------------------------------------
    $queryHorario = "SELECT dias_disponibles, horario_disponible 
                     FROM inscripcion 
                     WHERE equipo_id = ? AND es_capitan = 1 LIMIT 1";
    
    $stmtHorario = mysqli_prepare($conexion, $queryHorario);

    // Verificación CRÍTICA: Si prepare falla, lanzamos excepción en lugar de dejar que PHP muera
    if (!$stmtHorario) {
        // Opcional: Si el error es "Unknown column", sabremos que falta actualizar la BD
        throw new Exception("Error al preparar consulta de horario (revise la BD): " . mysqli_error($conexion));
    }

    mysqli_stmt_bind_param($stmtHorario, 'i', $equipo_id);
    
    if (mysqli_stmt_execute($stmtHorario)) {
        // Usamos bind_result para evitar problemas con drivers que no tengan get_result
        $res_dias = NULL;
        $res_horario = NULL;
        mysqli_stmt_bind_result($stmtHorario, $res_dias, $res_horario);
        
        if (mysqli_stmt_fetch($stmtHorario)) {
            // ¡Éxito! Copiamos los datos del capitán
            $dias_disponibles = $res_dias;
            $horario_disponible = $res_horario;
        } else {
            // No se encontró capitán, usamos lo que venga del POST o NULL
            if (isset($_POST['horario_disponible'])) $horario_disponible = $_POST['horario_disponible'];
            if (isset($_POST['dias_disponibles'])) $dias_disponibles = $_POST['dias_disponibles'];
        }
    }
    mysqli_stmt_close($stmtHorario);
    // ---------------------------------------------------------

    // ==========================================
    // 4. CREAR O ACTUALIZAR USUARIO
    // ==========================================
    
    $usuario_id = 0;
    
    $queryCheck = "SELECT id FROM usuario WHERE matricula = ? LIMIT 1";
    $stmtCheck = mysqli_prepare($conexion, $queryCheck);
    mysqli_stmt_bind_param($stmtCheck, 's', $matricula);
    mysqli_stmt_execute($stmtCheck);
    $resUsuario = mysqli_stmt_get_result($stmtCheck);
    $usuarioExistente = mysqli_fetch_assoc($resUsuario);
    mysqli_stmt_close($stmtCheck);

    if ($usuarioExistente) {
        $usuario_id = $usuarioExistente['id'];
        $sqlUpdate = "UPDATE usuario SET nombre=?, apellido_paterno=?, apellido_materno=?, correo=?, genero=?, carrera_id=?, campus_id=?, facultad_id=?, rol=?, activo=1 WHERE id=?";
        $stmtUpdate = mysqli_prepare($conexion, $sqlUpdate);
        mysqli_stmt_bind_param($stmtUpdate, 'sssssiiisi', $nombres, $apellido_paterno, $apellido_materno, $correo, $genero, $carrera_id, $campus_id, $facultad_id, $tipo_participante, $usuario_id);
        mysqli_stmt_execute($stmtUpdate);
        mysqli_stmt_close($stmtUpdate);
    } else {
        $sqlInsert = "INSERT INTO usuario (matricula, apellido_paterno, apellido_materno, nombre, correo, genero, carrera_id, campus_id, facultad_id, rol, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)";
        $stmtInsert = mysqli_prepare($conexion, $sqlInsert);
        mysqli_stmt_bind_param($stmtInsert, 'ssssssiiis', $matricula, $apellido_paterno, $apellido_materno, $nombres, $correo, $genero, $carrera_id, $campus_id, $facultad_id, $tipo_participante);
        if (!mysqli_stmt_execute($stmtInsert)) {
            if (mysqli_errno($conexion) == 1062) throw new Exception('El correo ya está registrado.');
            throw new Exception('Error al registrar usuario: ' . mysqli_stmt_error($stmtInsert));
        }
        $usuario_id = mysqli_insert_id($conexion);
        mysqli_stmt_close($stmtInsert);
    }
    
    // ==========================================
    // 5. REGISTRAR INSCRIPCIÓN
    // ==========================================

    $sqlYa = "SELECT id FROM inscripcion WHERE evento_id = ? AND usuario_id = ?";
    $stmtYa = mysqli_prepare($conexion, $sqlYa);
    mysqli_stmt_bind_param($stmtYa, 'ii', $evento_id, $usuario_id);
    mysqli_stmt_execute($stmtYa);
    if (mysqli_stmt_fetch($stmtYa)) {
        throw new Exception('Ya estás inscrito en este evento');
    }
    mysqli_stmt_close($stmtYa);

    $es_capitan = 0;
    
    $queryInscripcion = "
        INSERT INTO inscripcion (evento_id, usuario_id, equipo_id, es_capitan, metodo_registro, fecha_inscripcion, horario_disponible, dias_disponibles)
        VALUES (?, ?, ?, ?, 'Web', NOW(), ?, ?)
    ";
    $stmtInscripcion = mysqli_prepare($conexion, $queryInscripcion);
    if (!$stmtInscripcion) throw new Exception("Error al preparar inscripción: " . mysqli_error($conexion));
    
    mysqli_stmt_bind_param($stmtInscripcion, 'iiiiss', $evento_id, $usuario_id, $equipo_id, $es_capitan, $horario_disponible, $dias_disponibles);
    
    if (!mysqli_stmt_execute($stmtInscripcion)) {
        throw new Exception('Error al registrar la inscripción: ' . mysqli_stmt_error($stmtInscripcion));
    }
    mysqli_stmt_close($stmtInscripcion);

    // Actualizar contador
    $sqlCount = "UPDATE evento SET registros_actuales = registros_actuales + 1 WHERE id = ?";
    $stmtCount = mysqli_prepare($conexion, $sqlCount);
    mysqli_stmt_bind_param($stmtCount, 'i', $evento_id);
    mysqli_stmt_execute($stmtCount);
    mysqli_stmt_close($stmtCount);

    mysqli_commit($conexion);

    echo json_encode([
        'success' => true,
        'mensaje' => "¡Te has unido exitosamente al equipo '{$equipo['nombre']}'!",
        'nombre_equipo' => $equipo['nombre']
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) { // Capturamos Throwable para atrapar errores fatales de PHP 7+
    mysqli_rollback($conexion);
    // Asegurar respuesta JSON incluso en error fatal
    echo json_encode([
        'success' => false,
        'mensaje' => 'Error del sistema: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

mysqli_close($conexion);
?>