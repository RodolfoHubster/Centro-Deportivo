<?php
header('Content-Type: application/json');
include '../includes/conexion.php';
session_start();

$response = ['loggedin' => false, 'mensaje' => 'No hay sesión activa'];

if (isset($_SESSION['user_logged']) && $_SESSION['user_logged'] === true) {
    $id_usuario = $_SESSION['user_id'];
    $session_actual = session_id();

    // Verificar en BD si el token coincide
    $sql = "SELECT token_sesion FROM usuario WHERE id = ? LIMIT 1";
    $stmt = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $id_usuario);
    mysqli_stmt_execute($stmt);
    $resultado = mysqli_stmt_get_result($stmt);
    $fila = mysqli_fetch_assoc($resultado);

    if ($fila && $fila['token_sesion'] === $session_actual) {
        // El token coincide, es la sesión válida
        $response = [
            'loggedin' => true,
            'id' => $_SESSION['user_id'],
            'nombre' => $_SESSION['user_nombre'],
            'correo' => $_SESSION['user_correo'],
            'rol' => $_SESSION['user_rol']
        ];
    } else {
        // El token NO coincide (alguien más inició sesión en otro lado)
        // Destruimos esta sesión obsoleta
        session_unset();
        session_destroy();
        $response = ['loggedin' => false, 'mensaje' => 'Sesión iniciada en otro dispositivo.'];
    }
}

echo json_encode($response);
mysqli_close($conexion);
?>