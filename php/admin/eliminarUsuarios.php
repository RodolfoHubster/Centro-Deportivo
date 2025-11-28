<?php
// rodolfohubster/centro-deportivo/Centro-Deportivo-c98236dfa7a136db3c6c2a3d26403f5b779c7a4f/php/admin/eliminarUsuarios.php

ob_start(); // Iniciar control de búfer
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

include '../includes/conexion.php';

// ===== ¡SEGURIDAD! =====
if (!isset($_SESSION['user_logged']) || $_SESSION['user_rol'] !== 'Administrador') {
    ob_end_clean(); // Limpiar buffer
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

    // Evitar que un admin se elimine a sí mismo
    if ($id == $_SESSION['user_id']) {
        throw new Exception('No puedes eliminar tu propia cuenta');
    }

    // --- ¡PELIGRO! ESTA ES LA OPERACIÓN DE BORRADO PERMANENTE ---
    $sql = "DELETE FROM usuario WHERE id = ?";
    $stmt = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $id);
    mysqli_stmt_execute($stmt);

    if (mysqli_stmt_affected_rows($stmt) > 0) {
        mysqli_commit($conexion);
        ob_end_clean(); // Limpiar buffer
        echo json_encode(['success' => true, 'mensaje' => 'Usuario ELIMINADO permanentemente'], JSON_UNESCAPED_UNICODE);
    } else {
        throw new Exception('No se encontró el usuario');
    }

} catch (Exception $e) {
    mysqli_rollback($conexion);
    ob_end_clean(); // Limpiar buffer
    http_response_code(400);
    $msg = $e->getMessage();
    
    // Captura de error de Foreign Key
    if (strpos($msg, 'foreign key constraint') !== false) {
        $msg = 'Este usuario no puede ser eliminado permanentemente porque tiene eventos u otros registros asociados a él. Primero debes reasignar o eliminar sus eventos.';
    }
    
    echo json_encode(['success' => false, 'mensaje' => $msg], JSON_UNESCAPED_UNICODE);
}

mysqli_close($conexion);
exit;