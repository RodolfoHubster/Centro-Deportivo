<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

include '../includes/conexion.php';

$evento_id = isset($_GET['evento_id']) ? intval($_GET['evento_id']) : 0;

if (!$evento_id) {
    echo json_encode(['success' => false, 'message' => 'ID de evento no proporcionado.']);
    exit;
}

try {
    // Solo devolvemos facultades que tienen al menos una carrera configurada
    // en evento_carrera_cupos para este evento (carreras habilitadas).
    $sql = "SELECT DISTINCT
                f.id        AS facultad_id,
                f.nombre    AS facultad_nombre
            FROM evento_carrera_cupos ecc
            JOIN carrera c ON ecc.carrera_id = c.id
            JOIN facultad f ON c.facultad_id = f.id
            WHERE ecc.evento_id = ?
            ORDER BY f.nombre ASC";

    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) throw new Exception(mysqli_error($conexion));

    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $facultades = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $facultades[] = $row;
    }
    mysqli_stmt_close($stmt);

    echo json_encode(['success' => true, 'facultades' => $facultades], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
mysqli_close($conexion);
?>