<?php
/**
 * Obtener Carreras - ACTUALIZADO
 * Incluye soporte para Tronco Común y áreas
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

include 'conexion.php';

try {
    // Construir query base
    $sql = "SELECT 
                c.id,
                c.nombre,
                c.codigo,
                c.facultad_id,
                c.es_tronco_comun,
                c.area_tronco_comun,
                f.nombre AS facultad_nombre,
                f.siglas AS facultad_siglas
            FROM carrera c
            INNER JOIN facultad f ON c.facultad_id = f.id";
    
    $whereClause = '';
    $params = [];
    $types = '';
    
    // Filtro por facultad (opcional)
    if (isset($_GET['facultad_id']) && !empty($_GET['facultad_id'])) {
        $whereClause = " WHERE c.facultad_id = ?";
        $params[] = intval($_GET['facultad_id']);
        $types .= 'i';
    }
    
    $sql .= $whereClause . " ORDER BY c.es_tronco_comun DESC, c.nombre ASC";
    
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
    
    $carreras = [];
    while ($row = mysqli_fetch_assoc($resultado)) {
        // Formatear nombre para tronco común
        if ($row['es_tronco_comun']) {
            $row['nombre_completo'] = "Tronco Común - " . $row['area_tronco_comun'];
            $row['etiqueta'] = "TC"; // Etiqueta visual
        } else {
            $row['nombre_completo'] = $row['nombre'];
            $row['etiqueta'] = ""; 
        }
        
        // Convertir boolean a formato más amigable
        $row['es_tronco_comun'] = (bool)$row['es_tronco_comun'];
        
        $carreras[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'carreras' => $carreras,
        'total' => count($carreras)
    ], JSON_UNESCAPED_UNICODE);
    
    if (isset($stmt)) {
        mysqli_stmt_close($stmt);
    }
    
} catch(Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => true,
        'mensaje' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

mysqli_close($conexion);
?>