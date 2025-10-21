<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Credentials: true');

if (isset($_SESSION['user_id']) && isset($_SESSION['user_rol'])) {
    echo json_encode([
        'loggedin' => true,
        'id' => $_SESSION['user_id'],
        'rol' => $_SESSION['user_rol']
    ]);
} else {
    echo json_encode(['loggedin' => false]);
}
?>