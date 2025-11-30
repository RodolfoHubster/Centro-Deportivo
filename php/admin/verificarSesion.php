<?php
// php/admin/verificarSesion.php

// Evitar que el navegador guarde en caché el estado de la sesión
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header('Content-Type: application/json; charset=utf-8');

include '../includes/conexion.php';
session_start();

$response = ['loggedin' => false, 'mensaje' => 'No hay sesión activa'];

if (isset($_SESSION['user_logged']) && $_SESSION['user_logged'] === true) {
    $id_usuario = $_SESSION['user_id'];
    $session_actual = session_id();

    // 1. Consultar el token actual en la base de datos
    $sql = "SELECT token_sesion, nombre, correo, rol FROM usuario WHERE id = ? LIMIT 1";
    $stmt = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $id_usuario);
    mysqli_stmt_execute($stmt);
    $resultado = mysqli_stmt_get_result($stmt);
    $fila = mysqli_fetch_assoc($resultado);
    mysqli_stmt_close($stmt);

    // 2. Comparar tokens
    if ($fila && $fila['token_sesion'] === $session_actual) {
        // === SESIÓN VÁLIDA ===
        
        // IMPORTANTE: Actualizamos la hora de actividad para que login.php sepa que sigue aquí
        // y no permita que nadie más entre (bloqueo por 30 min).
        $sqlUpdate = "UPDATE usuario SET ultima_actividad = NOW() WHERE id = ?";
        $stmtUpdate = mysqli_prepare($conexion, $sqlUpdate);
        mysqli_stmt_bind_param($stmtUpdate, 'i', $id_usuario);
        mysqli_stmt_execute($stmtUpdate);
        mysqli_stmt_close($stmtUpdate);

        $response = [
            'loggedin' => true,
            'id' => $_SESSION['user_id'],
            'nombre' => $fila['nombre'],
            'correo' => $fila['correo'],
            'rol' => $fila['rol']
        ];
        
        // Liberamos el archivo de sesión para no bloquear otras peticiones (evita lag)
        session_write_close(); 

    } else {
        // === CONFLICTO: ALGUIEN MÁS ENTRÓ (Token diferente) ===
        // O la sesión expiró en el servidor
        
        // 1. Vaciar variables de sesión
        $_SESSION = array();

        // 2. Borrar la cookie de sesión del navegador
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }

        // 3. Destruir la sesión en el servidor
        session_destroy();
        
        $response = [
            'loggedin' => false, 
            'mensaje' => 'Tu sesión ha caducado o se ha iniciado sesión en otro dispositivo.'
        ];
    }
} else {
    // No había sesión iniciada, cerramos escritura para liberar recursos
    session_write_close();
}

echo json_encode($response);
mysqli_close($conexion);
?>