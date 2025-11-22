<?php
error_reporting(0);
ini_set('display_errors', 0);

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

include '../includes/conexion.php';

// Validar sesión
if (!isset($_SESSION['user_logged']) || $_SESSION['user_logged'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'mensaje' => 'No autorizado']);
    exit;
}
 
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'mensaje' => 'Método no permitido']);
    exit;
}

try {
    if (!isset($_POST['id']) || empty($_POST['id'])) {
        throw new Exception('El ID del evento es obligatorio');
    }
    
    $evento_id = intval($_POST['id']);
    
    // Usamos UPDATE para cambiar el estado 'activo' a 1 (reactivado)
    $sql = "UPDATE evento SET activo = 1 WHERE id = ?";
    $stmt = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    
    if (mysqli_stmt_affected_rows($stmt) > 0) {
        echo json_encode([
            'success' => true,
            'mensaje' => 'Evento reactivado correctamente. Ahora es visible al público.'
        ]);
    } else {
        // Podría ser que ya estaba activo, pero el mensaje debe ser de error.
        throw new Exception('No se encontró el evento o ya estaba activo.');
    }
    
    mysqli_stmt_close($stmt);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}

mysqli_close($conexion);
?>