<?php
/**
 * Obtener Campus - ARCHIVO NUEVO
 * Lista todos los campus disponibles
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

include 'conexion.php';

try {
    // Obtener información de campus con estadísticas
    $sql = "SELECT 
                c.id,
                c.nombre,
                c.codigo,
                COUNT(DISTINCT f.id) AS total_facultades,
                COUNT(DISTINCT e.id) AS total_eventos
            FROM campus c
            LEFT JOIN facultad f ON f.campus_id = c.id
            LEFT JOIN evento e ON e.campus_id = c.id AND e.activo = TRUE
            GROUP BY c.id, c.nombre, c.codigo
            ORDER BY c.nombre ASC";
    
    $resultado = mysqli_query($conexion, $sql);
    
    if (!$resultado) {
        throw new Exception('Error en la consulta: ' . mysqli_error($conexion));
    }
    
    $campus_list = [];
    while ($row = mysqli_fetch_assoc($resultado)) {
        // Convertir valores numéricos
        $row['total_facultades'] = (int)$row['total_facultades'];
        $row['total_eventos'] = (int)$row['total_eventos'];
        
        $campus_list[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'campus' => $campus_list,
        'total' => count($campus_list)
    ], JSON_UNESCAPED_UNICODE);
    
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