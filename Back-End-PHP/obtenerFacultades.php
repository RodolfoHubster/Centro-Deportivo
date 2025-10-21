<?php
/**
 * Obtener Facultades - ACTUALIZADO
 * Incluye información del campus
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

include 'conexion.php';

try {
    // Construir query con información del campus
    $sql = "SELECT 
                f.id,
                f.nombre,
                f.siglas,
                f.campus_id,
                c.nombre AS campus_nombre,
                c.codigo AS campus_codigo,
                COUNT(DISTINCT car.id) AS total_carreras
            FROM facultad f
            INNER JOIN campus c ON f.campus_id = c.id
            LEFT JOIN carrera car ON car.facultad_id = f.id";
    
    $whereClause = '';
    $params = [];
    $types = '';
    
    // Filtro por campus (opcional)
    if (isset($_GET['campus_id']) && !empty($_GET['campus_id'])) {
        $whereClause = " WHERE f.campus_id = ?";
        $params[] = intval($_GET['campus_id']);
        $types .= 'i';
    }
    
    $sql .= $whereClause . " GROUP BY f.id, f.nombre, f.siglas, f.campus_id, c.nombre, c.codigo ORDER BY c.nombre, f.nombre ASC";
    
    // Preparar y ejecutar
    if (!empty($params)) {
        $stmt = mysqli_prepare($conexion, $sql);
        mysqli_stmt_bind_param($stmt, $types, ...$params);
        mysqli_stmt_execute($stmt);
        $resultado = mysqli_stmt_get_result($stmt);
    } else {
        $resultado = mysqli_query($conexion, $sql);
    }
    
    if (!$resultado) {
        throw new Exception('Error en la consulta: ' . mysqli_error($conexion));
    }
    
    $facultades = [];
    while ($row = mysqli_fetch_assoc($resultado)) {
        // Convertir total_carreras a número
        $row['total_carreras'] = (int)$row['total_carreras'];
        
        $facultades[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'facultades' => $facultades,
        'total' => count($facultades)
    ], JSON_UNESCAPED_UNICODE);
    
    if (isset($stmt)) {
        mysqli_stmt_close($stmt);
    }
    
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => true,
        'mensaje' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

mysqli_close($conexion);
?>