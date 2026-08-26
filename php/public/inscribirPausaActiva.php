<?php
header('Content-Type: application/json; charset=utf-8');

/* CORS acotado. Antes decia 'Access-Control-Allow-Origin: *', lo que permitia
   que CUALQUIER sitio web hiciera POST aqui y llenara los cupos desde fuera.
   El front vive en el mismo dominio, asi que no necesita CORS; la lista queda
   por si algun dia se consume desde otro origen propio. */
$origenesPermitidos = [
    'https://cimahub-fcitec.tij.uabc.mx',
    'http://localhost',
];
$origen = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origen !== '' && in_array($origen, $origenesPermitidos, true)) {
    header('Access-Control-Allow-Origin: ' . $origen);
    header('Vary: Origin');
}
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
/* La matricula quedo OPCIONAL a proposito.
   Se pidio durante un tiempo para evitar registros repetidos, pero no habia
   contra que verificarla: la tabla usuario solo tiene a quienes ya se
   registraron antes, no el padron completo de la universidad. Sin verificacion
   real, cualquiera podia inventar una distinta cada vez, asi que solo agregaba
   friccion sin dar integridad.
   La columna y el indice unico se conservan por si mas adelante se conecta una
   fuente confiable (padron escolar o inicio de sesion institucional). */
$matricula = isset($_POST['matricula']) ? strtoupper(trim($_POST['matricula'])) : '';
if ($matricula !== '' && !preg_match('/^[A-Z0-9]{4,15}$/', $matricula)) {
    $matricula = '';   // si viene con basura, se guarda vacia en vez de rechazar
}
$matricula = ($matricula === '') ? null : $matricula;

if (!$evento_id || !$facultad_id || !$carrera_id || !in_array($sexo, ['Hombre', 'Mujer'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos o inválidos.']);
    exit;
}

// Datos de auditoria: no bloquean nada, permiten revisar despues si un
// mismo equipo genero una rafaga de registros.
$ip         = substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 45);
$userAgent  = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

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
    $sqlInsert = "INSERT INTO inscripcion_pausa_activa
                    (evento_id, facultad_id, carrera_id, sexo, matricula, ip, user_agent, fecha_registro)
                  VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
    $stmtInsert = mysqli_prepare($conexion, $sqlInsert);
    if (!$stmtInsert) throw new Exception(mysqli_error($conexion));
    mysqli_stmt_bind_param($stmtInsert, 'iiissss',
        $evento_id, $facultad_id, $carrera_id, $sexo, $matricula, $ip, $userAgent);

    /* 1062 = clave duplicada, la lanza el indice unico (evento_id, matricula):
       esa matricula ya se registro en este evento. Es el caso esperado cuando
       alguien intenta repetir, no una falla tecnica.

       Se contemplan las dos formas en que mysqli reporta el error: desde PHP 8
       lanza mysqli_sql_exception, pero si el proyecto corre con el reporte de
       errores apagado devuelve false. Asi el mensaje sale bien en ambos casos
       y nunca se le muestra al usuario el texto crudo de MySQL. */
    $EXISTE_DUPLICADO = 1062;
    try {
        $ok = mysqli_stmt_execute($stmtInsert);
        $codigo = $ok ? 0 : mysqli_stmt_errno($stmtInsert);
    } catch (mysqli_sql_exception $ex) {
        $ok = false;
        $codigo = (int) $ex->getCode();
    }

    if (!$ok) {
        mysqli_stmt_close($stmtInsert);
        throw new Exception($codigo === $EXISTE_DUPLICADO
            ? 'Esa matrícula ya está registrada en esta actividad.'
            : 'No se pudo guardar el registro. Intenta de nuevo.');
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