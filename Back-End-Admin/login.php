<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

include '../Back-End-PHP/conexion.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $correo = mysqli_real_escape_string($conexion, $_POST['correo']);
    $password = $_POST['password'];
    
    // Buscar admin en la base de datos
    $sql = "SELECT * FROM usuario WHERE correo = '$correo' AND rol = 'Administrador'";
    $resultado = mysqli_query($conexion, $sql);
    
    if ($fila = mysqli_fetch_assoc($resultado)) {
        // Verificar contraseña con password_verify (tu BD usa hash)
        if (password_verify($password, $fila['contrasena'])) {
            $_SESSION['admin_id'] = $fila['id'];
            $_SESSION['admin_nombre'] = $fila['nombre'];
            $_SESSION['admin_correo'] = $fila['correo'];
            $_SESSION['admin_logged'] = true;
            
            echo json_encode([
                'success' => true,
                'mensaje' => 'Bienvenido ' . $fila['nombre'],
                'nombre' => $fila['nombre']
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'mensaje' => 'Contraseña incorrecta'
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'mensaje' => 'Usuario no encontrado o no tiene permisos de administrador'
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