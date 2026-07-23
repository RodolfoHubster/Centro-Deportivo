<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

include '../includes/conexion.php';

$evento_id = isset($_GET['evento_id']) ? intval($_GET['evento_id']) : 0;
$facultad_id = isset($_GET['facultad_id']) ? intval($_GET['facultad_id']) : 0;

if (!$evento_id || !$facultad_id) {
    echo json_encode(['success' => false, 'message' => 'Faltan parámetros.']);
    exit;
}

try {
    $sql = "SELECT 
                c.id        AS carrera_id,
                CASE WHEN c.es_tronco_comun = 1 THEN CONCAT(c.area_tronco_comun, ' (Tronco Común)') ELSE c.nombre END AS carrera_nombre,
                ecc.cupo_hombres,
                ecc.cupo_mujeres,
                (SELECT COUNT(*) FROM inscripcion_pausa_activa ipa 
                 WHERE ipa.evento_id = ecc.evento_id AND ipa.carrera_id = c.id AND ipa.sexo = 'Hombre') AS ocupados_hombres,
                (SELECT COUNT(*) FROM inscripcion_pausa_activa ipa 
                 WHERE ipa.evento_id = ecc.evento_id AND ipa.carrera_id = c.id AND ipa.sexo = 'Mujer')  AS ocupadas_mujeres
            FROM evento_carrera_cupos ecc
            JOIN carrera c ON ecc.carrera_id = c.id
            WHERE ecc.evento_id = ? AND c.facultad_id = ?
            ORDER BY c.nombre ASC";

    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) throw new Exception(mysqli_error($conexion));

    mysqli_stmt_bind_param($stmt, 'ii', $evento_id, $facultad_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $carreras = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['disponibles_hombres'] = max(0, (int)$row['cupo_hombres'] - (int)$row['ocupados_hombres']);
        $row['disponibles_mujeres'] = max(0, (int)$row['cupo_mujeres'] - (int)$row['ocupadas_mujeres']);
        $carreras[] = $row;
    }
    mysqli_stmt_close($stmt);

    echo json_encode(['success' => true, 'carreras' => $carreras], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
mysqli_close($conexion);
?>
