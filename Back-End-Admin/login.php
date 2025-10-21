<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

include '../Back-End-PHP/conexion.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $correo = mysqli_real_escape_string($conexion, $_POST['correo']);
    $password = $_POST['password'];
    
    // ✅ Permitir tanto Administrador como Promotor
    $sql = "SELECT * FROM usuario WHERE correo = '$correo' AND rol IN ('Administrador', 'Promotor') AND activo = 1";
    $resultado = mysqli_query($conexion, $sql);
    
    if ($fila = mysqli_fetch_assoc($resultado)) {
        // Verificar la contraseña (usa hash en tu BD)
        if (password_verify($password, $fila['contrasena'])) {
            // Guardar sesión común para ambos roles
            $_SESSION['user_logged'] = true;
            $_SESSION['user_id'] = $fila['id'];
            $_SESSION['user_nombre'] = $fila['nombre'];
            $_SESSION['user_correo'] = $fila['correo'];
            $_SESSION['user_rol'] = $fila['rol'];

            echo json_encode([
                'success' => true,
                'mensaje' => 'Bienvenido ' . $fila['nombre'],
                'rol' => $fila['rol'],
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
            'mensaje' => 'Usuario no encontrado o no tiene permisos'
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