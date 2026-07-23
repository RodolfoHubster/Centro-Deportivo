<?php
/**
 * Estadísticas de Pausa Activa por Facultad y Carrera
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
    // Estadísticas jerárquicas: Evento -> Facultades -> Carreras
    // Primero, obtener el desglose por carrera
    $sql = "SELECT 
                f.id AS facultad_id,
                f.nombre AS facultad_nombre,
                c.id AS carrera_id,
                CASE WHEN c.es_tronco_comun = 1 THEN CONCAT(c.area_tronco_comun, ' (Tronco Común)') ELSE c.nombre END AS carrera_nombre,
                COALESCE(ecc.cupo_hombres, 0) AS cupo_hombres,
                COALESCE(ecc.cupo_mujeres, 0) AS cupo_mujeres,
                (COALESCE(ecc.cupo_hombres, 0) + COALESCE(ecc.cupo_mujeres, 0)) AS cupo_total,
                SUM(CASE WHEN ipa.sexo = 'Hombre' THEN 1 ELSE 0 END) AS hombres_registrados,
                SUM(CASE WHEN ipa.sexo = 'Mujer' THEN 1 ELSE 0 END) AS mujeres_registradas,
                COUNT(ipa.id) AS total_registrados
            FROM evento_carrera_cupos ecc
            JOIN carrera c ON ecc.carrera_id = c.id
            JOIN facultad f ON c.facultad_id = f.id
            LEFT JOIN inscripcion_pausa_activa ipa 
                   ON ipa.evento_id = ecc.evento_id 
                  AND ipa.carrera_id = ecc.carrera_id
            WHERE ecc.evento_id = ?
            GROUP BY f.id, f.nombre, c.id, c.nombre, ecc.cupo_hombres, ecc.cupo_mujeres
            ORDER BY f.nombre ASC, c.nombre ASC";

    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) throw new Exception(mysqli_error($conexion));
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $facultadesMap = [];
    $totalHombres = 0;
    $totalMujeres = 0;
    $cupoTotalHombresGlobal = 0;
    $cupoTotalMujeresGlobal = 0;

    while ($row = mysqli_fetch_assoc($result)) {
        $facId = $row['facultad_id'];

        if (!isset($facultadesMap[$facId])) {
            $facultadesMap[$facId] = [
                'facultad_id' => $facId,
                'facultad_nombre' => $row['facultad_nombre'],
                'cupo_hombres' => 0,
                'cupo_mujeres' => 0,
                'cupo_total' => 0,
                'hombres_registrados' => 0,
                'mujeres_registradas' => 0,
                'total_registrados' => 0,
                'carreras' => []
            ];
        }

        // Parse to int
        $c_cupo_h = (int)$row['cupo_hombres'];
        $c_cupo_m = (int)$row['cupo_mujeres'];
        $c_cupo_tot = (int)$row['cupo_total'];
        $c_h_reg = (int)$row['hombres_registrados'];
        $c_m_reg = (int)$row['mujeres_registradas'];
        $c_tot_reg = (int)$row['total_registrados'];

        // Agregar carrera
        $facultadesMap[$facId]['carreras'][] = [
            'carrera_id' => $row['carrera_id'],
            'carrera_nombre' => $row['carrera_nombre'],
            'cupo_hombres' => $c_cupo_h,
            'cupo_mujeres' => $c_cupo_m,
            'cupo_total' => $c_cupo_tot,
            'hombres_registrados' => $c_h_reg,
            'mujeres_registradas' => $c_m_reg,
            'total_registrados' => $c_tot_reg
        ];

        // Sumar a la facultad
        $facultadesMap[$facId]['cupo_hombres'] += $c_cupo_h;
        $facultadesMap[$facId]['cupo_mujeres'] += $c_cupo_m;
        $facultadesMap[$facId]['cupo_total'] += $c_cupo_tot;
        $facultadesMap[$facId]['hombres_registrados'] += $c_h_reg;
        $facultadesMap[$facId]['mujeres_registradas'] += $c_m_reg;
        $facultadesMap[$facId]['total_registrados'] += $c_tot_reg;

        // Sumar al global
        $totalHombres += $c_h_reg;
        $totalMujeres += $c_m_reg;
        $cupoTotalHombresGlobal += $c_cupo_h;
        $cupoTotalMujeresGlobal += $c_cupo_m;
    }
    mysqli_stmt_close($stmt);

    echo json_encode([
        'success'        => true,
        'facultades'     => array_values($facultadesMap),
        'total_hombres'  => $totalHombres,
        'total_mujeres'  => $totalMujeres,
        'total_general'  => $totalHombres + $totalMujeres,
        'cupo_total_hombres' => $cupoTotalHombresGlobal,
        'cupo_total_mujeres' => $cupoTotalMujeresGlobal,
        'cupo_total_general' => $cupoTotalHombresGlobal + $cupoTotalMujeresGlobal
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}
mysqli_close($conexion);
