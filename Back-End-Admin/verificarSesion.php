<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

if (isset($_SESSION['admin_logged']) && $_SESSION['admin_logged'] === true) {
    echo json_encode([
        'loggedin' => true,
        'nombre' => $_SESSION['admin_nombre'],
        'correo' => $_SESSION['admin_correo']
    ]);
} else {
    echo json_encode([
        'loggedin' => false,
        'mensaje' => 'No hay sesión activa'
    ]);
}
?>