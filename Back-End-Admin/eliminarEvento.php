<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (!isset($_SESSION['admin_logged']) || $_SESSION['admin_logged'] !== true) {
    echo json_encode([
        'success' => false,
        'mensaje' => 'No autorizado'
    ]);
    exit;
}

include '../Back-End-PHP/conexion.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $id = mysqli_real_escape_string($conexion, $_POST['id']);
    
    // Verificar que el evento exista
    $verificar = "SELECT * FROM evento WHERE id = $id";
    $resultado = mysqli_query($conexion, $verificar);
    
    if (mysqli_num_rows($resultado) == 0) {
        echo json_encode([
            'success' => false,
            'mensaje' => 'El evento no existe'
        ]);
        exit;
    }
    
    // Eliminar el evento
    $sql = "DELETE FROM evento WHERE id = $id";
    
    if (mysqli_query($conexion, $sql)) {
        echo json_encode([
            'success' => true,
            'mensaje' => 'Evento eliminado correctamente'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'mensaje' => 'Error al eliminar: ' . mysqli_error($conexion)
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'mensaje' => 'Método no permitido'
    ]);
}

mysqli_close($conexion);
?>