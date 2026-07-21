<?php
/**
 * Obtener tipo de creación de un evento (evento normal o pausa_activa)
 * Uso: GET /php/admin/obtenerTipoEvento.php?evento_id=X
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

$sql = "SELECT id, nombre, tipo_creacion FROM evento WHERE id = ?";
$stmt = mysqli_prepare($conexion, $sql);
mysqli_stmt_bind_param($stmt, 'i', $evento_id);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$evento = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);

if (!$evento) {
    http_response_code(404);
    echo json_encode(['success' => false, 'mensaje' => 'Evento no encontrado']);
    exit;
}

echo json_encode(['success' => true, 'evento' => $evento], JSON_UNESCAPED_UNICODE);
mysqli_close($conexion);
?>
