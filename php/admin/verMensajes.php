<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (!isset($_SESSION['user_logged']) || $_SESSION['user_logged'] !== true) {
    echo json_encode([
        'success' => false,
        'mensaje' => 'No autorizado'
    ]);
    exit;
}

include '../includes/conexion.php';

$sql = "SELECT * FROM mensajes_contacto ORDER BY fecha DESC";
$resultado = mysqli_query($conexion, $sql);

$mensajes = array();

if ($resultado) {
    while ($fila = mysqli_fetch_assoc($resultado)) {
        $mensajes[] = $fila;
    }
    
    echo json_encode([
        'success' => true,
        'mensajes' => $mensajes,
        'total' => count($mensajes)
    ]);
} else {
    echo json_encode([
        'success' => false,
        'mensaje' => 'Error al obtener mensajes: ' . mysqli_error($conexion)
    ]);
}

mysqli_close($conexion);
?>
