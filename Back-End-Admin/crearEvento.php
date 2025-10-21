<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Credentials: true');

session_start();
include '../Back-End-PHP/conexion.php';

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
        'nombre' => 'Nombre del evento',
        'fecha_inicio' => 'Fecha de inicio',
        'fecha_termino' => 'Fecha de término',
        'lugar' => 'Lugar',
        'tipo_registro' => 'Tipo de registro',
        'categoria_deporte' => 'Categoría deportiva',
        'tipo_actividad' => 'Tipo de actividad',
        'ubicacion_tipo' => 'Tipo de ubicación',
        'campus_id' => 'Campus'
    ];
    
    foreach ($camposRequeridos as $campo => $nombreCampo) {
        if (!isset($_POST[$campo]) || empty(trim($_POST[$campo]))) {
            throw new Exception("El campo '{$nombreCampo}' es obligatorio");
        }
    }
    
    // ===================================
    // 2. OBTENER Y VALIDAR DATOS
    // ===================================
    
    $nombre = mysqli_real_escape_string($conexion, trim($_POST['nombre']));
    $descripcion = isset($_POST['descripcion']) ? mysqli_real_escape_string($conexion, trim($_POST['descripcion'])) : '';
    $fecha_inicio = mysqli_real_escape_string($conexion, $_POST['fecha_inicio']);
    $fecha_termino = mysqli_real_escape_string($conexion, $_POST['fecha_termino']);
    $lugar = mysqli_real_escape_string($conexion, trim($_POST['lugar']));
    $tipo_registro = mysqli_real_escape_string($conexion, $_POST['tipo_registro']);
    $categoria_deporte = mysqli_real_escape_string($conexion, $_POST['categoria_deporte']);
    $tipo_actividad = mysqli_real_escape_string($conexion, $_POST['tipo_actividad']);
    $ubicacion_tipo = mysqli_real_escape_string($conexion, $_POST['ubicacion_tipo']);
    $campus_id = intval($_POST['campus_id']);
    $id_promotor = $_SESSION['user_id'] ?? 0;
    $id_actividad = isset($_POST['id_actividad']) && !empty($_POST['id_actividad']) ? intval($_POST['id_actividad']) : NULL;
    
    // Campos opcionales
    $cupo_maximo = isset($_POST['cupo_maximo']) && !empty($_POST['cupo_maximo']) ? intval($_POST['cupo_maximo']) : NULL;
    $facultades = isset($_POST['facultades']) && is_array($_POST['facultades']) ? $_POST['facultades'] : [];
    
    // ===================================
    // 3. VALIDACIONES
    // ===================================
    
    // Validar fechas
    $fecha_inicio_obj = DateTime::createFromFormat('Y-m-d', $fecha_inicio);
    $fecha_termino_obj = DateTime::createFromFormat('Y-m-d', $fecha_termino);
    
    if (!$fecha_inicio_obj || !$fecha_termino_obj) {
        throw new Exception('Formato de fecha inválido. Use YYYY-MM-DD');
    }
    
    if ($fecha_termino_obj < $fecha_inicio_obj) {
        throw new Exception('La fecha de término no puede ser anterior a la fecha de inicio');
    }
    
    // Validar tipo_registro
    $tipos_registro_validos = ['Individual', 'Por equipos'];
    if (!in_array($tipo_registro, $tipos_registro_validos)) {
        throw new Exception('Tipo de registro inválido');
    }
    
    // Validar categoria_deporte
    $categorias_validas = ['Fútbol', 'Básquetbol', 'Voleibol', 'Natación', 'Atletismo', 'Otro'];
    if (!in_array($categoria_deporte, $categorias_validas)) {
        throw new Exception('Categoría deportiva inválida');
    }
    
    // Validar tipo_actividad
    $tipos_actividad_validos = ['Torneo', 'Carrera', 'Exhibición', 'Taller'];
    if (!in_array($tipo_actividad, $tipos_actividad_validos)) {
        throw new Exception('Tipo de actividad inválido');
    }
    
    // Validar ubicacion_tipo
    $ubicaciones_validas = ['Gimnasio', 'Canchas internas', 'Edificio facultad', 'Externo'];
    if (!in_array($ubicacion_tipo, $ubicaciones_validas)) {
        throw new Exception('Tipo de ubicación inválido');
    }
    
    // Validar campus
    $sqlCheckCampus = "SELECT id FROM campus WHERE id = ?";
    $stmt = mysqli_prepare($conexion, $sqlCheckCampus);
    mysqli_stmt_bind_param($stmt, 'i', $campus_id);
    mysqli_stmt_execute($stmt);
    if (mysqli_stmt_get_result($stmt)->num_rows === 0) {
        throw new Exception('El campus seleccionado no existe');
    }
    mysqli_stmt_close($stmt);
    
    // Validar promotor
    $sqlCheckPromotor = "SELECT id FROM usuario WHERE id = ? AND (rol = 'Promotor' OR rol = 'Administrador') AND activo = 1";
    $stmt = mysqli_prepare($conexion, $sqlCheckPromotor);
    mysqli_stmt_bind_param($stmt, 'i', $id_promotor);
    mysqli_stmt_execute($stmt);
    if (mysqli_stmt_get_result($stmt)->num_rows === 0) {
        throw new Exception('El promotor seleccionado no es válido');
    }
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 4. GENERAR CÓDIGO QR Y TOKEN
    // ===================================
    
    $codigo_qr = 'QR_EVT_' . time() . '_' . rand(1000000000, 9999999999);
    $token_registro = 'TKN_' . md5(uniqid($nombre . time(), true));
    
    // ===================================
    // 5. INSERTAR EVENTO
    // ===================================
    
    $sqlEvento = "INSERT INTO evento (
                    nombre, descripcion, fecha_inicio, fecha_termino, lugar,
                    id_actividad, tipo_registro, categoria_deporte, tipo_actividad,
                    ubicacion_tipo, campus_id, id_promotor, codigo_qr, token_registro,
                    cupo_maximo, registros_actuales, activo, fecha_creacion
                  ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, NOW()
                  )";
    
    $stmt = mysqli_prepare($conexion, $sqlEvento);
    
    if (!$stmt) {
        throw new Exception('Error al preparar consulta: ' . mysqli_error($conexion));
    }
    
    mysqli_stmt_bind_param(
        $stmt,
        'ssssssssssiissi',
        $nombre,
        $descripcion,
        $fecha_inicio,
        $fecha_termino,
        $lugar,
        $id_actividad,
        $tipo_registro,
        $categoria_deporte,
        $tipo_actividad,
        $ubicacion_tipo,
        $campus_id,
        $id_promotor,
        $codigo_qr,
        $token_registro,
        $cupo_maximo
    );
    
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception('Error al crear evento: ' . mysqli_stmt_error($stmt));
    }
    
    $evento_id = mysqli_insert_id($conexion);
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 6. ASOCIAR FACULTADES
    // ===================================
    
    $facultades_registradas = [];
    
    if (!empty($facultades)) {
        $sqlFacultad = "INSERT INTO evento_facultad (evento_id, facultad_id) VALUES (?, ?)";
        $stmtFacultad = mysqli_prepare($conexion, $sqlFacultad);
        
        foreach ($facultades as $facultad_id) {
            $facultad_id = intval($facultad_id);
            
            // Verificar que la facultad existe
            $sqlCheckFacultad = "SELECT nombre FROM facultad WHERE id = ?";
            $stmt = mysqli_prepare($conexion, $sqlCheckFacultad);
            mysqli_stmt_bind_param($stmt, 'i', $facultad_id);
            mysqli_stmt_execute($stmt);
            $resultado = mysqli_stmt_get_result($stmt);
            
            if ($row = mysqli_fetch_assoc($resultado)) {
                mysqli_stmt_bind_param($stmtFacultad, 'ii', $evento_id, $facultad_id);
                mysqli_stmt_execute($stmtFacultad);
                $facultades_registradas[] = $row['nombre'];
            }
            
            mysqli_stmt_close($stmt);
        }
        
        mysqli_stmt_close($stmtFacultad);
    }
    
    // ===================================
    // 7. CONFIRMAR TRANSACCIÓN
    // ===================================
    
    mysqli_commit($conexion);
    
    // ===================================
    // 8. RESPUESTA EXITOSA
    // ===================================
    
    echo json_encode([
        'success' => true,
        'mensaje' => "Evento '{$nombre}' creado exitosamente",
        'datos' => [
            'evento_id' => $evento_id,
            'nombre' => $nombre,
            'fecha_inicio' => $fecha_inicio,
            'fecha_termino' => $fecha_termino,
            'tipo_registro' => $tipo_registro,
            'categoria_deporte' => $categoria_deporte,
            'tipo_actividad' => $tipo_actividad,
            'codigo_qr' => $codigo_qr,
            'token_registro' => $token_registro,
            'cupo_maximo' => $cupo_maximo,
            'facultades' => $facultades_registradas
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