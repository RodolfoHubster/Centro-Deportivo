<?php
// rodolfohubster/centro-deportivo/Centro-Deportivo/php/admin/finalizarEvento.php
error_reporting(0); // <-- Silencia las advertencias de PHP
ini_set('display_errors', 0); // <-- Asegura que no se muestren en el output

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

include '../includes/conexion.php';

// Validar sesión (Solo promotores/administradores pueden finalizar)
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
    
    // Actualizamos la columna 'activo' a 0 para finalizar el evento
    $sql = "UPDATE evento SET activo = 0 WHERE id = ?";
    $stmt = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    
    if (mysqli_stmt_affected_rows($stmt) > 0) {
        echo json_encode([
            'success' => true,
            'mensaje' => 'Evento finalizado correctamente. Ya no es visible al público.'
        ]);
    } else {
        throw new Exception('No se encontró el evento o ya estaba finalizado.');
    }
    
    mysqli_stmt_close($stmt);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}

mysqli_close($conexion);
?>