<?php
// rodolfohubster/centro-deportivo/Centro-Deportivo-c98236dfa7a136db3c6c2a3d26403f5b779c7a4f/php/admin/reactivarUsuario.php

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

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;

    if (empty($id)) {
        throw new Exception('No se proporcionó ID de usuario');
    }

    // ===== LÓGICA DE REACTIVACIÓN =====
    $sql = "UPDATE usuario SET activo = 1 WHERE id = ?";
    $stmt = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $id);
    mysqli_stmt_execute($stmt);

    if (mysqli_stmt_affected_rows($stmt) > 0) {
        ob_end_clean(); // Limpiar buffer
        echo json_encode(['success' => true, 'mensaje' => 'Usuario reactivado correctamente'], JSON_UNESCAPED_UNICODE);
    } else {
        throw new Exception('No se encontró el usuario o ya estaba activo');
    }

} catch (Exception $e) {
    ob_end_clean(); // Limpiar buffer
    http_response_code(400);
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}

mysqli_close($conexion);
exit;