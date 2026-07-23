<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

include '../includes/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$evento_id   = isset($_POST['evento_id'])   ? intval($_POST['evento_id'])   : 0;
$facultad_id = isset($_POST['facultad_id']) ? intval($_POST['facultad_id']) : 0;
$carrera_id  = isset($_POST['carrera_id'])  ? intval($_POST['carrera_id'])  : 0;
$sexo        = isset($_POST['sexo'])        ? trim($_POST['sexo'])          : '';

if (!$evento_id || !$facultad_id || !$carrera_id || !in_array($sexo, ['Hombre', 'Mujer'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos o inválidos.']);
    exit;
}

ob_start();
mysqli_begin_transaction($conexion);

try {
    // 1. Obtener cupos para esta carrera en el evento
    $sqlCupo = "SELECT cupo_hombres, cupo_mujeres 
                FROM evento_carrera_cupos 
                WHERE evento_id = ? AND carrera_id = ?";
    $stmtCupo = mysqli_prepare($conexion, $sqlCupo);
    if (!$stmtCupo) throw new Exception(mysqli_error($conexion));
    mysqli_stmt_bind_param($stmtCupo, 'ii', $evento_id, $carrera_id);
    mysqli_stmt_execute($stmtCupo);
    $resCupo = mysqli_stmt_get_result($stmtCupo);
    $cupos = mysqli_fetch_assoc($resCupo);
    mysqli_stmt_close($stmtCupo);

    if (!$cupos) {
        throw new Exception('La carrera seleccionada no está disponible para esta Pausa Activa.');
    }

    $limite = ($sexo === 'Hombre') ? (int)$cupos['cupo_hombres'] : (int)$cupos['cupo_mujeres'];

    // 2. Contar registros actuales para esa carrera y sexo
    $sqlCount = "SELECT COUNT(*) AS total 
                 FROM inscripcion_pausa_activa 
                 WHERE evento_id = ? AND carrera_id = ? AND sexo = ?";
    $stmtCount = mysqli_prepare($conexion, $sqlCount);
    if (!$stmtCount) throw new Exception(mysqli_error($conexion));
    mysqli_stmt_bind_param($stmtCount, 'iis', $evento_id, $carrera_id, $sexo);
    mysqli_stmt_execute($stmtCount);
    $resCount = mysqli_stmt_get_result($stmtCount);
    $rowCount = mysqli_fetch_assoc($resCount);
    mysqli_stmt_close($stmtCount);
    $registrados = (int)$rowCount['total'];

    // 3. Validar disponibilidad
    if ($limite > 0 && $registrados >= $limite) {
        throw new Exception("Lo sentimos, ya no hay espacios disponibles para {$sexo} en esta carrera.");
    }

    // 4. Insertar registro
    $sqlInsert = "INSERT INTO inscripcion_pausa_activa (evento_id, facultad_id, carrera_id, sexo, fecha_registro) 
                  VALUES (?, ?, ?, ?, NOW())";
    $stmtInsert = mysqli_prepare($conexion, $sqlInsert);
    if (!$stmtInsert) throw new Exception(mysqli_error($conexion));
    mysqli_stmt_bind_param($stmtInsert, 'iiis', $evento_id, $facultad_id, $carrera_id, $sexo);
    if (!mysqli_stmt_execute($stmtInsert)) {
        throw new Exception('Error al guardar el registro: ' . mysqli_stmt_error($stmtInsert));
    }
    mysqli_stmt_close($stmtInsert);

    mysqli_commit($conexion);
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'message' => '¡Registro realizado con éxito! Te esperamos en la Pausa Activa.'
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    mysqli_rollback($conexion);
    ob_end_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
mysqli_close($conexion);
?>