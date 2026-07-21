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
    $sql = "SELECT 
                f.id        AS facultad_id,
                f.nombre    AS facultad_nombre,
                efc.cupo_hombres,
                efc.cupo_mujeres,
                (SELECT COUNT(*) FROM inscripcion_pausa_activa ipa 
                 WHERE ipa.evento_id = efc.evento_id AND ipa.facultad_id = f.id AND ipa.sexo = 'Hombre') AS ocupados_hombres,
                (SELECT COUNT(*) FROM inscripcion_pausa_activa ipa 
                 WHERE ipa.evento_id = efc.evento_id AND ipa.facultad_id = f.id AND ipa.sexo = 'Mujer')  AS ocupadas_mujeres
            FROM evento_facultad_cupos efc
            JOIN facultad f ON efc.facultad_id = f.id
            WHERE efc.evento_id = ?
            ORDER BY f.nombre ASC";

    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) throw new Exception(mysqli_error($conexion));

    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $facultades = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['disponibles_hombres'] = max(0, (int)$row['cupo_hombres'] - (int)$row['ocupados_hombres']);
        $row['disponibles_mujeres'] = max(0, (int)$row['cupo_mujeres'] - (int)$row['ocupadas_mujeres']);
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