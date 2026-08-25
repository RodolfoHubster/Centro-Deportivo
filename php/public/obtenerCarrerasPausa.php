<?php
header('Content-Type: application/json; charset=utf-8');

/* CORS acotado: el front vive en el mismo dominio y no necesita comodin. */
$origenesPermitidos = ['https://cimahub-fcitec.tij.uabc.mx', 'http://localhost'];
$origen = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origen !== '' && in_array($origen, $origenesPermitidos, true)) {
    header('Access-Control-Allow-Origin: ' . $origen);
    header('Vary: Origin');
}

include '../includes/conexion.php';

$evento_id = isset($_GET['evento_id']) ? intval($_GET['evento_id']) : 0;
$facultad_id = isset($_GET['facultad_id']) ? intval($_GET['facultad_id']) : 0;

if (!$evento_id) {
    echo json_encode(['success' => false, 'message' => 'Falta el evento.']);
    exit;
}

/* facultad_id es opcional. Sin el se devuelven todas las carreras del evento
   con el nombre de su facultad, para que el buscador pueda filtrar entre
   todas sin ir facultad por facultad. */
$filtrarPorFacultad = $facultad_id > 0;

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
                ,f.nombre AS facultad_nombre
                ,c.facultad_id
            FROM evento_carrera_cupos ecc
            JOIN carrera c  ON ecc.carrera_id = c.id
            JOIN facultad f ON f.id = c.facultad_id
            WHERE ecc.evento_id = ?"
            . ($filtrarPorFacultad ? " AND c.facultad_id = ?" : "")
            . " ORDER BY f.nombre ASC, c.nombre ASC";

    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) throw new Exception(mysqli_error($conexion));

    if ($filtrarPorFacultad) {
        mysqli_stmt_bind_param($stmt, 'ii', $evento_id, $facultad_id);
    } else {
        mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    }
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    /* Este endpoint es publico: cualquiera puede leer su respuesta desde la
       pestana de red del navegador. Por eso NO devolvemos cupos ni conteos de
       inscritos; solo si la carrera ya se lleno para cada sexo, que es lo
       unico que la pantalla necesita para habilitar o no el boton.
       Los numeros siguen disponibles para el personal en
       php/admin/obtenerEstadisticasPausa.php, que exige sesion. */
    $carreras = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $cupoH = (int) $row['cupo_hombres'];
        $cupoM = (int) $row['cupo_mujeres'];

        $carreras[] = [
            'carrera_id'      => (int) $row['carrera_id'],
            'carrera_nombre'  => $row['carrera_nombre'],
            'facultad_id'     => (int) $row['facultad_id'],
            'facultad_nombre' => $row['facultad_nombre'],
            // cupo 0 significa sin limite, no lleno
            'lleno_hombres'  => $cupoH > 0 && (int) $row['ocupados_hombres'] >= $cupoH,
            'lleno_mujeres'  => $cupoM > 0 && (int) $row['ocupadas_mujeres'] >= $cupoM,
        ];
    }
    mysqli_stmt_close($stmt);

    echo json_encode(['success' => true, 'carreras' => $carreras], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
mysqli_close($conexion);
?>
