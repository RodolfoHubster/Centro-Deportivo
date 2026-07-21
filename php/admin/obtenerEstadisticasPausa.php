<?php
/**
 * Estadísticas de Pausa Activa por facultad
 * Uso: GET /php/admin/obtenerEstadisticasPausa.php?evento_id=X
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

include '../includes/conexion.php';
session_start();

if (!isset($_SESSION['user_logged']) || $_SESSION['user_logged'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'mensaje' => 'No autorizado']);
    exit;
}

$evento_id = isset($_GET['evento_id']) ? intval($_GET['evento_id']) : 0;
if (!$evento_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'mensaje' => 'ID de evento requerido']);
    exit;
}

try {
    // Estadísticas por facultad (cupos + registrados)
    $sql = "SELECT
                f.id         AS facultad_id,
                f.nombre     AS facultad_nombre,
                efc.cupo_hombres,
                efc.cupo_mujeres,
                (efc.cupo_hombres + efc.cupo_mujeres) AS cupo_total,
                IFNULL(SUM(ipa.sexo = 'Hombre'), 0) AS hombres_registrados,
                IFNULL(SUM(ipa.sexo = 'Mujer'),  0) AS mujeres_registradas,
                IFNULL(COUNT(ipa.id), 0)             AS total_registrados
            FROM evento_facultad_cupos efc
            JOIN facultad f ON efc.facultad_id = f.id
            LEFT JOIN inscripcion_pausa_activa ipa 
                   ON ipa.evento_id = efc.evento_id AND ipa.facultad_id = f.id
            WHERE efc.evento_id = ?
            GROUP BY f.id, f.nombre, efc.cupo_hombres, efc.cupo_mujeres
            ORDER BY f.nombre ASC";

    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) throw new Exception(mysqli_error($conexion));
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $facultades = [];
    $totalHombres = 0;
    $totalMujeres = 0;

    while ($row = mysqli_fetch_assoc($result)) {
        $row = array_map(fn($v) => is_numeric($v) ? (int)$v : $v, $row);
        $totalHombres += $row['hombres_registrados'];
        $totalMujeres += $row['mujeres_registradas'];
        $facultades[] = $row;
    }
    mysqli_stmt_close($stmt);

    echo json_encode([
        'success'        => true,
        'facultades'     => $facultades,
        'total_hombres'  => $totalHombres,
        'total_mujeres'  => $totalMujeres,
        'total_general'  => $totalHombres + $totalMujeres
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}
mysqli_close($conexion);
?>
