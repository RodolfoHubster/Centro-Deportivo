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
    $nombre = mysqli_real_escape_string($conexion, $_POST['nombre']);
    $descripcion = mysqli_real_escape_string($conexion, $_POST['descripcion']);
    $fecha = mysqli_real_escape_string($conexion, $_POST['fecha']);
    $lugar = mysqli_real_escape_string($conexion, $_POST['lugar']);
    $actividad_nombre = mysqli_real_escape_string($conexion, $_POST['actividad']);
    
    // ✅ FIX: Asegurar que la fecha se guarde correctamente
    // Ya que el campo es DATE en MySQL, no necesitamos agregar hora
    
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
    
    // Buscar el ID de la actividad
    $sql_actividad = "SELECT id FROM actividaddeportiva WHERE nombre = '$actividad_nombre'";
    $resultado_act = mysqli_query($conexion, $sql_actividad);
    
    if ($resultado_act && mysqli_num_rows($resultado_act) > 0) {
        $actividad = mysqli_fetch_assoc($resultado_act);
        $id_actividad = $actividad['id'];
        
        $sql = "UPDATE evento SET 
                nombre = '$nombre',
                descripcion = '$descripcion',
                fecha = '$fecha',
                lugar = '$lugar',
                id_actividad = $id_actividad
                WHERE id = $id";
        
        if (mysqli_query($conexion, $sql)) {
            echo json_encode([
                'success' => true,
                'mensaje' => 'Evento actualizado correctamente'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'mensaje' => 'Error al actualizar: ' . mysqli_error($conexion)
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'mensaje' => 'Actividad deportiva no encontrada'
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