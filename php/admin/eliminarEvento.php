<?php
ob_start(); // Iniciar control de búfer
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (!isset($_SESSION['user_logged']) || $_SESSION['user_logged'] !== true) {
    ob_end_clean(); // Limpiar antes de salir
    echo json_encode([
        'success' => false,
        'mensaje' => 'No autorizado'
    ]);
    exit;
}

include '../includes/conexion.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $id = mysqli_real_escape_string($conexion, $_POST['id']);
    
    // Verificar que el evento exista
    $verificar = "SELECT * FROM evento WHERE id = $id";
    $resultado = mysqli_query($conexion, $verificar);
    
    if (mysqli_num_rows($resultado) == 0) {
        ob_end_clean(); // Limpiar antes de salir
        echo json_encode([
            'success' => false,
            'mensaje' => 'El evento no existe'
        ]);
        exit;
    }
    
    // Eliminar el evento
    $sql = "DELETE FROM evento WHERE id = $id";
    
    if (mysqli_query($conexion, $sql)) {
        ob_end_clean(); // Limpiar antes de la salida exitosa
        echo json_encode([
            'success' => true,
            'mensaje' => 'Evento eliminado correctamente'
        ]);
    } else {
        ob_end_clean(); // Limpiar antes de la salida de error
        echo json_encode([
            'success' => false,
            'mensaje' => 'Error al eliminar: ' . mysqli_error($conexion)
        ]);
    }
} else {
    ob_end_clean(); // Limpiar antes de la salida de error
    echo json_encode([
        'success' => false,
        'mensaje' => 'Método no permitido'
    ]);
}

mysqli_close($conexion);
exit;
?>