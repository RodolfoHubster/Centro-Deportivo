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

mysqli_begin_transaction($conexion);

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

    // --- ¡PELIGRO! ESTA ES LA OPERACIÓN DE BORRADO PERMANENTE ---
    // NOTA: Si este usuario creó eventos, esto podría fallar si
    // la base de datos tiene "foreign key constraints".
    // Por ahora, asumimos que se puede borrar.
    
    $sql = "DELETE FROM usuario WHERE id = ?";
    $stmt = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $id);
    mysqli_stmt_execute($stmt);

    if (mysqli_stmt_affected_rows($stmt) > 0) {
        mysqli_commit($conexion);
        echo json_encode(['success' => true, 'mensaje' => 'Usuario ELIMINADO permanentemente']);
    } else {
        throw new Exception('No se encontró el usuario');
    }

} catch (Exception $e) {
    mysqli_rollback($conexion);
    http_response_code(400);
    $msg = $e->getMessage();
    
    // Captura de error de Foreign Key (si no se puede borrar porque tiene eventos)
    if (strpos($msg, 'foreign key constraint') !== false) {
        $msg = 'Este usuario no puede ser eliminado permanentemente porque tiene eventos u otros registros asociados a él. Primero debes reasignar o eliminar sus eventos.';
    }
    
    echo json_encode(['success' => false, 'mensaje' => $msg]);
}

mysqli_close($conexion);
?>