<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

include 'conexion.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $nombre = mysqli_real_escape_string($conexion, trim($_POST['nombre']));
    $correo = mysqli_real_escape_string($conexion, trim($_POST['correo']));
    $asunto = mysqli_real_escape_string($conexion, trim($_POST['asunto']));
    $mensaje = mysqli_real_escape_string($conexion, trim($_POST['mensaje']));
    
    // Validar campos obligatorios
    if (empty($nombre) || empty($correo) || empty($asunto) || empty($mensaje)) {
        echo json_encode([
            'success' => false,
            'mensaje' => 'Todos los campos son obligatorios'
        ]);
        exit;
    }
    
    // Validar formato de correo
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'mensaje' => 'El correo electrónico no es válido'
        ]);
        exit;
    }
    
    // Insertar mensaje
    $sql = "INSERT INTO mensajes_contacto (nombre, correo, asunto, mensaje, fecha) 
            VALUES ('$nombre', '$correo', '$asunto', '$mensaje', NOW())";
    
    if (mysqli_query($conexion, $sql)) {
        echo json_encode([
            'success' => true,
            'mensaje' => 'Mensaje enviado correctamente. Te responderemos pronto.',
            'id' => mysqli_insert_id($conexion)
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'mensaje' => 'Error al enviar mensaje: ' . mysqli_error($conexion)
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