<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

// Destruir todas las variables de sesion
$_SESSION = array();

// Destruir la cookie de sesion
if (isset($_SESSION['user_id'])) {
    $sql = "UPDATE usuario SET token_sesion = NULL WHERE id = " . intval($_SESSION['user_id']);
    mysqli_query($conexion, $sql);
}

// Destruir la sesion
session_destroy();

echo json_encode([
    'success' => true,
    'mensaje' => 'Sesion cerrada correctamente'
]);
?>
