<?php
session_start();
header('Content-Type: application/json');
include '../includes/conexion.php';

// ===== ¡SEGURIDAD! =====
if (!isset($_SESSION['user_logged']) || $_SESSION['user_rol'] !== 'Administrador') {
    http_response_code(403);
    echo json_encode(['success' => false, 'mensaje' => 'Acceso no autorizado']);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;

    if (empty($id)) {
        throw new Exception('No se proporcionó ID de usuario');
    }

    // ===== ¡SEGURIDAD ADICIONAL! =====
    // Evitar que un admin se elimine a sí mismo
    if ($id == $_SESSION['user_id']) {
        throw new Exception('No puedes eliminar tu propia cuenta');
    }

    // No eliminamos, solo desactivamos por seguridad
    $sql = "UPDATE usuario SET activo = 0 WHERE id = ?";
    $stmt = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $id);
    mysqli_stmt_execute($stmt);

    if (mysqli_stmt_affected_rows($stmt) > 0) {
        echo json_encode(['success' => true, 'mensaje' => 'Usuario desactivado correctamente']);
    } else {
        throw new Exception('No se encontró el usuario o ya estaba desactivado');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}

mysqli_close($conexion);
?>