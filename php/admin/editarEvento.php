<?php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Credentials: true');

session_start();
include '../includes/conexion.php';

// **************************************************
// ***** 1. ERROR DE SESIÓN CORREGIDO AQUÍ *****
// **************************************************
if (!isset($_SESSION['user_logged']) || $_SESSION['user_logged'] !== true) {
    http_response_code(401); // No autorizado
    echo json_encode([
        'success' => false,
        'mensaje' => 'No autorizado. Inicia sesión de nuevo.'
    ]);
    exit;
}
 
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
    // 1. VALIDAR CAMPOS OBLIGATORIOS (EL ID ES CLAVE)
    // ===================================
    
    $camposRequeridos = [
        'id' => 'ID del evento', // El ID es obligatorio para editar
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
    
    // ===================================
    // 2. OBTENER Y VALIDAR DATOS
    // ===================================
    
    $evento_id = intval($_POST['id']);
    $nombre = mysqli_real_escape_string($conexion, trim($_POST['nombre']));
    $descripcion = isset($_POST['descripcion']) ? mysqli_real_escape_string($conexion, trim($_POST['descripcion'])) : '';
    $fecha_inicio = mysqli_real_escape_string($conexion, $_POST['fecha_inicio']);
    $fecha_termino = mysqli_real_escape_string($conexion, $_POST['fecha_termino']);
    $lugar = mysqli_real_escape_string($conexion, trim($_POST['lugar']));
    $tipo_registro = mysqli_real_escape_string($conexion, $_POST['tipo_registro']);
    $categoria_deporte = mysqli_real_escape_string($conexion, $_POST['categoria_deporte']);
    $tipo_actividad = mysqli_real_escape_string($conexion, $_POST['tipo_actividad']);
    $ubicacion_tipo = mysqli_real_escape_string($conexion, $_POST['ubicacion_tipo']);
    $id_promotor = intval($_POST['id_promotor']);
    
    // ---------------------------------------------------------
    // CAMBIO IMPORTANTE: LOGICA PARA LEER CHECKBOXES DE CAMPUS
    // ---------------------------------------------------------
    $campus_id = 1; // Valor por defecto seguro (Tijuana)

    // 1. Revisar si viene del array de checkboxes (campus[]) - ESTO ES LO NUEVO
    if (isset($_POST['campus']) && is_array($_POST['campus']) && !empty($_POST['campus'])) {
        // Tomamos el primer campus seleccionado como el principal para la base de datos
        $campus_id = intval($_POST['campus'][0]); 
    } 
    // 2. Fallback: Revisar si viene como variable simple (por compatibilidad)
    elseif (isset($_POST['campus_id']) && !empty($_POST['campus_id'])) {
        $campus_id = intval($_POST['campus_id']);
    }
    // ---------------------------------------------------------

    // 'actividad' es el ID de la actividad, no el nombre
    $id_actividad = isset($_POST['actividad']) && !empty($_POST['actividad']) ? intval($_POST['actividad']) : NULL;
    
    // Campos opcionales
    $cupo_maximo = isset($_POST['cupo_maximo']) && !empty($_POST['cupo_maximo']) ? intval($_POST['cupo_maximo']) : NULL;
    $integrantes_min = isset($_POST['integrantes_min']) && !empty($_POST['integrantes_min']) ? intval($_POST['integrantes_min']) : NULL;
    $integrantes_max = isset($_POST['integrantes_max']) && !empty($_POST['integrantes_max']) ? intval($_POST['integrantes_max']) : NULL;
    $facultades = isset($_POST['facultades']) && is_array($_POST['facultades']) ? $_POST['facultades'] : [];
    
    // ===================================
    // 3. VALIDACIONES
    // ===================================
    
    $fecha_termino_obj = DateTime::createFromFormat('Y-m-d', $fecha_termino);
    $fecha_inicio_obj = DateTime::createFromFormat('Y-m-d', $fecha_inicio);
    if ($fecha_termino_obj < $fecha_inicio_obj) {
        throw new Exception('La fecha de término no puede ser anterior a la fecha de inicio');
    }
    
    // ===================================
    // 4. ACTUALIZAR EVENTO
    // ===================================
    $periodo = $_POST['periodo'] ?? '';
    $sqlEvento = "UPDATE evento SET 
                    nombre = ?,
                    descripcion = ?,
                    fecha_inicio = ?,
                    fecha_termino = ?,
                    periodo = ?,
                    lugar = ?,
                    id_actividad = ?,
                    tipo_registro = ?,
                    categoria_deporte = ?,
                    tipo_actividad = ?,
                    ubicacion_tipo = ?,
                    campus_id = ?,
                    id_promotor = ?,
                    cupo_maximo = ?,
                    integrantes_min = ?,
                    integrantes_max = ?
                  WHERE id = ?";
                  
    $stmt = mysqli_prepare($conexion, $sqlEvento);
    
    if (!$stmt) {
        throw new Exception('Error al preparar consulta de actualización: ' . mysqli_error($conexion));
    }
    
    mysqli_stmt_bind_param(
        $stmt,
        'ssssssisssssiiiii',
        $nombre,
        $descripcion,
        $fecha_inicio,
        $fecha_termino,
        $periodo,
        $lugar,
        $id_actividad,
        $tipo_registro,
        $categoria_deporte,
        $tipo_actividad,
        $ubicacion_tipo,
        $campus_id,
        $id_promotor,
        $cupo_maximo,
        $integrantes_min,  
        $integrantes_max,
        $evento_id // El ID va al final para el WHERE
    );
    
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception('Error al actualizar evento: ' . mysqli_stmt_error($stmt));
    }
    
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 5. RE-ASOCIAR FACULTADES (BORRAR Y RE-INSERTAR)
    // ===================================
    
    // 5.1 Borrar asociaciones existentes
    $sqlDeleteFacultades = "DELETE FROM evento_facultad WHERE evento_id = ?";
    $stmtDel = mysqli_prepare($conexion, $sqlDeleteFacultades);
    if (!$stmtDel) {
         throw new Exception('Error al preparar borrado de facultades: ' . mysqli_error($conexion));
    }
    mysqli_stmt_bind_param($stmtDel, 'i', $evento_id);
    if (!mysqli_stmt_execute($stmtDel)) {
         throw new Exception('Error al borrar facultades antiguas: ' . mysqli_stmt_error($stmtDel));
    }
    mysqli_stmt_close($stmtDel);
    
    // 5.2 Insertar las nuevas asociaciones (si las hay)
    $facultades_registradas = [];
    if (!empty($facultades)) {
        $sqlFacultad = "INSERT INTO evento_facultad (evento_id, facultad_id) VALUES (?, ?)";
        $stmtFacultad = mysqli_prepare($conexion, $sqlFacultad);
        
        foreach ($facultades as $facultad_id) {
            $facultad_id = intval($facultad_id);
            mysqli_stmt_bind_param($stmtFacultad, 'ii', $evento_id, $facultad_id);
            mysqli_stmt_execute($stmtFacultad);
            $facultades_registradas[] = $facultad_id;
        }
        mysqli_stmt_close($stmtFacultad);
    }
    
    // ===================================
    // 6. CONFIRMAR TRANSACCIÓN
    // ===================================
    
    mysqli_commit($conexion);
    
    // ===================================
    // 7. RESPUESTA EXITOSA
    // ===================================
    
    echo json_encode([
        'success' => true,
        'mensaje' => "Evento '{$nombre}' actualizado exitosamente",
        'datos' => [
            'evento_id' => $evento_id,
            'nombre' => $nombre,
            'facultades_actualizadas' => $facultades_registradas
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