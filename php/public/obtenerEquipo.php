<?php
/**
 * obtenerEquipos.php
 * Obtiene todos los equipos registrados para un evento específico
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// CORRECCIÓN: Usamos la conexión MySQLi existente
include '../includes/conexion.php'; 

try {
    $evento_id = isset($_GET['evento_id']) ? intval($_GET['evento_id']) : 0;
    
    if ($evento_id <= 0) {
        throw new Exception('ID de evento inválido');
    }
    
    // Consulta reescrita para usar el modelo: equipo -> inscripcion -> usuario
    $query = "
        SELECT 
            e.id,
            e.nombre AS nombre_equipo,
            e.fecha_registro,
            ev.integrantes_max,
            ev.integrantes_min,
            COUNT(i.id) AS total_integrantes,
            GROUP_CONCAT(
                CONCAT(u.nombre, ' ', u.apellido_paterno) 
                ORDER BY i.es_capitan DESC 
                SEPARATOR ', '
            ) AS integrantes_nombres
        FROM equipo e
        INNER JOIN evento ev ON e.evento_id = ev.id
        LEFT JOIN inscripcion i ON e.id = i.equipo_id
        LEFT JOIN usuario u ON i.usuario_id = u.id
        WHERE e.evento_id = ?
        GROUP BY e.id, e.nombre, e.fecha_registro, ev.integrantes_max, ev.integrantes_min
        ORDER BY e.fecha_registro DESC
    ";

    $stmt = mysqli_prepare($conexion, $query);
    if (!$stmt) {
        throw new Exception("Error al preparar consulta: " . mysqli_error($conexion));
    }
    
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    $resultado = mysqli_stmt_get_result($stmt);

    $equipos = [];
    while ($row = mysqli_fetch_assoc($resultado)) {
        $max_integrantes = intval($row['integrantes_max']) > 0 ? intval($row['integrantes_max']) : 999;
        $total_integrantes = intval($row['total_integrantes']);
        $tiene_cupo = $total_integrantes < $max_integrantes;
        
        $equipos[] = [
            'id' => $row['id'],
            'nombre_equipo' => $row['nombre_equipo'],
            'total_integrantes' => $total_integrantes,
            'integrantes_min' => intval($row['integrantes_min']),
            'integrantes_max' => intval($row['integrantes_max']),
            'tiene_cupo' => $tiene_cupo,
            'fecha_registro' => $row['fecha_registro'],
            'integrantes_preview' => $row['integrantes_nombres']
        ];
    }
    
    mysqli_stmt_close($stmt);
    mysqli_close($conexion);


    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'equipos' => $equipos,
        'total' => count($equipos)
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if (isset($conexion) && $conexion) {
        mysqli_close($conexion);
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'mensaje' => 'Error al obtener equipos: ' . $e->getMessage()
    ]);
}
?>