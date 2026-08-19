<?php
/**
 * Obtener cupos de carreras de una pausa activa
 * Devuelve los cupos y carreras habilitadas para editar un evento de tipo pausa activa.
 */
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
                ecc.carrera_id,
                ecc.cupo_hombres,
                ecc.cupo_mujeres,
                c.facultad_id
            FROM evento_carrera_cupos ecc
            JOIN carrera c ON ecc.carrera_id = c.id
            WHERE ecc.evento_id = ?";

    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) throw new Exception(mysqli_error($conexion));

    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $cupos = [];
    $carrerasIds = [];
    $facultadesIds = [];

    while ($row = mysqli_fetch_assoc($result)) {
        $carreraId = $row['carrera_id'];
        $cupos[$carreraId] = [
            'hombres'    => (int)$row['cupo_hombres'],
            'mujeres'    => (int)$row['cupo_mujeres'],
            'facultad_id' => (int)$row['facultad_id']
        ];
        $carrerasIds[] = $carreraId;
        if (!in_array($row['facultad_id'], $facultadesIds)) {
            $facultadesIds[] = (int)$row['facultad_id'];
        }
    }
    mysqli_stmt_close($stmt);

    echo json_encode([
        'success'      => true,
        'cupos'        => $cupos,
        'carrerasIds'  => $carrerasIds,
        'facultadesIds'=> $facultadesIds
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
mysqli_close($conexion);
?>
