<?php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Credentials: true');

include '../includes/conexion.php';
session_start();
// Validar sesión
if (!isset($_SESSION['user_logged']) || $_SESSION['user_logged'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'mensaje' => 'No autorizado']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'mensaje' => 'Método no permitido']);
    exit;
}

// Iniciar transacción
mysqli_begin_transaction($conexion);

try {
    // 1. VALIDAR CAMPOS OBLIGATORIOS
    $camposRequeridos = [
        'nombre' => 'Nombre del evento',
        'fecha_inicio' => 'Fecha de inicio',
        'fecha_termino' => 'Fecha de término',
        'lugar' => 'Lugar',
        'tipo_registro' => 'Tipo de registro',
        'categoria_deporte' => 'Categoría deportiva',
        'tipo_actividad' => 'Tipo de actividad',
        'ubicacion_tipo' => 'Tipo de ubicación',
        'id_promotor' => 'ID de Promotor'
    ];
    
    foreach ($camposRequeridos as $campo => $nombreCampo) {
        if (!isset($_POST[$campo]) || empty(trim($_POST[$campo]))) {
            throw new Exception("El campo '{$nombreCampo}' es obligatorio");
        }
    }
    
    // 2. OBTENER DATOS
    $nombre = mysqli_real_escape_string($conexion, trim($_POST['nombre']));
    $descripcion = isset($_POST['descripcion']) ? mysqli_real_escape_string($conexion, trim($_POST['descripcion'])) : '';
    $fecha_inicio = mysqli_real_escape_string($conexion, $_POST['fecha_inicio']);
    $fecha_termino = mysqli_real_escape_string($conexion, $_POST['fecha_termino']);
    $lugar = mysqli_real_escape_string($conexion, trim($_POST['lugar']));
    $tipo_registro = mysqli_real_escape_string($conexion, $_POST['tipo_registro']);
    $categoria_deporte = mysqli_real_escape_string($conexion, $_POST['categoria_deporte']);
    $tipo_actividad = mysqli_real_escape_string($conexion, $_POST['tipo_actividad']);
    $ubicacion_tipo = mysqli_real_escape_string($conexion, $_POST['ubicacion_tipo']);
    $campus_id = isset($_POST['campus_id']) && !empty($_POST['campus_id']) ? intval($_POST['campus_id']) : 1;
    $id_promotor = intval($_POST['id_promotor']);
    
    // PERIODO
    $periodo = isset($_POST['periodo']) ? mysqli_real_escape_string($conexion, trim($_POST['periodo'])) : '';
    
    $id_actividad = isset($_POST['actividad']) && !empty($_POST['actividad']) ? intval($_POST['actividad']) : null;
    $cupo_maximo = isset($_POST['cupo_maximo']) && $_POST['cupo_maximo'] !== '' ? intval($_POST['cupo_maximo']) : null;
    $integrantes_min = isset($_POST['integrantes_min']) && $_POST['integrantes_min'] !== '' ? intval($_POST['integrantes_min']) : null;
    $integrantes_max = isset($_POST['integrantes_max']) && $_POST['integrantes_max'] !== '' ? intval($_POST['integrantes_max']) : null;
    $facultades = isset($_POST['facultades']) && is_array($_POST['facultades']) ? $_POST['facultades'] : [];
    
    // 3. VALIDACIONES
    $fecha_inicio_obj = DateTime::createFromFormat('Y-m-d', $fecha_inicio);
    $fecha_termino_obj = DateTime::createFromFormat('Y-m-d', $fecha_termino);
    
    if (!$fecha_inicio_obj || !$fecha_termino_obj) throw new Exception('Formato de fecha inválido');
    if ($fecha_termino_obj < $fecha_inicio_obj) throw new Exception('La fecha de término no puede ser anterior a la de inicio');
    
    // 4. CÓDIGOS
    $codigo_qr = 'QR_EVT_' . time() . '_' . rand(1000000000, 9999999999);
    $token_registro = 'TKN_' . md5(uniqid($nombre . time(), true));
    
    // 5. INSERTAR (CORREGIDO: AHORA LOS SIGNOS '?' COINCIDEN CON LAS COLUMNAS)
    
    if ($id_actividad !== null) {
        // CASO 1: CON ACTIVIDAD
        $sqlEvento = "INSERT INTO evento (
                        nombre, descripcion, fecha_inicio, fecha_termino, periodo, lugar, 
                        id_actividad, tipo_registro, categoria_deporte, tipo_actividad,
                        ubicacion_tipo, campus_id, id_promotor, codigo_qr, token_registro,
                        cupo_maximo, integrantes_min, integrantes_max, 
                        registros_actuales, activo, fecha_creacion
                      ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, NOW()
                      )";
        
        $stmt = mysqli_prepare($conexion, $sqlEvento);
        if (!$stmt) throw new Exception('Error preparar consulta: ' . mysqli_error($conexion));
        
        mysqli_stmt_bind_param(
            $stmt,
            'ssssssisssssiiiii', 
            $nombre, $descripcion, $fecha_inicio, $fecha_termino, $periodo, $lugar,
            $id_actividad, $tipo_registro, $categoria_deporte, $tipo_actividad,
            $ubicacion_tipo, $campus_id, $id_promotor, $codigo_qr, $token_registro,
            $cupo_maximo, $integrantes_min, $integrantes_max
        );
    } else {
        // CASO 2: SIN ACTIVIDAD (AQUÍ FALTABA UN ?)
        $sqlEvento = "INSERT INTO evento (
                        nombre, descripcion, fecha_inicio, fecha_termino, periodo, lugar,
                        tipo_registro, categoria_deporte, tipo_actividad,
                        ubicacion_tipo, campus_id, id_promotor, codigo_qr, token_registro,
                        cupo_maximo, integrantes_min, integrantes_max, 
                        registros_actuales, activo, fecha_creacion
                      ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, NOW()
                      )";
        
        $stmt = mysqli_prepare($conexion, $sqlEvento);
        if (!$stmt) throw new Exception('Error preparar consulta: ' . mysqli_error($conexion));
        
        // Ahora hay 17 signos '?' antes de los valores fijos (0, 1, NOW())
        mysqli_stmt_bind_param(
            $stmt,
            'ssssssssssiissiii', // 17 tipos de datos
            $nombre, $descripcion, $fecha_inicio, $fecha_termino, $periodo, $lugar,
            $tipo_registro, $categoria_deporte, $tipo_actividad,
            $ubicacion_tipo, $campus_id, $id_promotor, $codigo_qr, $token_registro,
            $cupo_maximo, $integrantes_min, $integrantes_max
        );
    }
    
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception('Error al crear evento: ' . mysqli_stmt_error($stmt));
    }
    $evento_id = mysqli_insert_id($conexion);
    mysqli_stmt_close($stmt);
    
    // 6. ASOCIAR FACULTADES
    if (!empty($facultades)) {
        $sqlFacultad = "INSERT INTO evento_facultad (evento_id, facultad_id) VALUES (?, ?)";
        $stmtFacultad = mysqli_prepare($conexion, $sqlFacultad);
        foreach ($facultades as $facultad_id) {
            $facultad_id = intval($facultad_id);
            mysqli_stmt_bind_param($stmtFacultad, 'ii', $evento_id, $facultad_id);
            mysqli_stmt_execute($stmtFacultad);
        }
        mysqli_stmt_close($stmtFacultad);
    }
    
    // 7. CONFIRMAR
    mysqli_commit($conexion);
    
    echo json_encode([
        'success' => true,
        'mensaje' => "Evento '{$nombre}' creado exitosamente",
        'datos' => ['evento_id' => $evento_id]
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    mysqli_rollback($conexion);
    http_response_code(400);
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
mysqli_close($conexion);
?>