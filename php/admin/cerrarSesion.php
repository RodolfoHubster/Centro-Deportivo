<?php
// php/admin/cerrarSesion.php

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

include '../includes/conexion.php'; // 1. Incluir conexión (Faltaba esto)

// 2. Capturar ID ANTES de destruir la sesión
$usuario_id = isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : 0;

if ($usuario_id > 0) {
    // 3. Limpiar la base de datos: Borramos token y fecha para liberar la cuenta
    $sql = "UPDATE usuario SET token_sesion = NULL, ultima_actividad = NULL WHERE id = ?";
    $stmt = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $usuario_id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
}

// 4. Ahora sí, destruir la sesión de PHP
$_SESSION = array();

// Borrar cookie de sesión si existe
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

session_destroy();

echo json_encode([
    'success' => true,
    'mensaje' => 'Sesión cerrada correctamente'
]);

mysqli_close($conexion);
?>