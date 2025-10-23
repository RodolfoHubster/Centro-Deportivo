<?php
session_start();

// Debug temporal
error_log("=== INICIO DEBUG ===");
error_log("SESSION: " . print_r($_SESSION, true));
error_log("POST: " . print_r($_POST, true));
error_log("===================");

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');  // ← AGREGAR

include '../Back-End-PHP/conexion.php';

// verificar sesión
if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_rol'])) {
    echo json_encode(['success'=>false,'mensaje'=>'No autorizado']);
    exit;
}

$id_usuario = $_SESSION['user_id'];
$rol = $_SESSION['user_rol'];  // ← Cambiado

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success'=>false,'mensaje'=>'Método no permitido']);
    exit;
}

$id = mysqli_real_escape_string($conexion, $_POST['id']);

// verificar que el evento exista
$sql_evento = "SELECT * FROM evento WHERE id = $id";
$result_evento = mysqli_query($conexion, $sql_evento);

if(mysqli_num_rows($result_evento) == 0){
    echo json_encode(['success'=>false,'mensaje'=>'El evento no existe']);
    exit;
}

$evento = mysqli_fetch_assoc($result_evento);

// permisos: admin puede todo, promotor solo sus eventos
if($rol !== 'Administrador' && $evento['id_usuario'] != $id_usuario){
    echo json_encode(['success'=>false,'mensaje'=>'No autorizado']);
    exit;
}

// eliminar evento
$sql_delete = "DELETE FROM evento WHERE id = $id";
if(mysqli_query($conexion, $sql_delete)){
    echo json_encode(['success'=>true,'mensaje'=>'Evento eliminado correctamente']);
} else {
    echo json_encode(['success'=>false,'mensaje'=>'Error al eliminar: '.mysqli_error($conexion)]);
}

mysqli_close($conexion);
?>
