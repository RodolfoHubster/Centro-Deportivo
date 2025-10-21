<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (!isset($_SESSION['admin_logged']) || $_SESSION['admin_logged'] !== true) {
    echo json_encode([
        'success' => false,
        'mensaje' => 'No autorizado. Inicia sesión como administrador.'
    ]);
    exit;
}

include '../Back-End-PHP/conexion.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $nombre = mysqli_real_escape_string($conexion, $_POST['nombre']);
    $descripcion = mysqli_real_escape_string($conexion, $_POST['descripcion']);
    $fecha = mysqli_real_escape_string($conexion, $_POST['fecha']);
    $lugar = mysqli_real_escape_string($conexion, $_POST['lugar']);
    $actividad_nombre = mysqli_real_escape_string($conexion, $_POST['actividad']);
    
    // ✅ FIX: Asegurar que la fecha se guarde correctamente sin ajuste de zona horaria
    // Agregar hora del mediodía para evitar problemas de zona horaria
    $fecha_completa = $fecha . ' 12:00:00';
    
    // Validar campos obligatorios
    if (empty($nombre) || empty($fecha) || empty($lugar) || empty($actividad_nombre)) {
        echo json_encode([
            'success' => false,
            'mensaje' => 'Todos los campos son obligatorios'
        ]);
        exit;
    }
    
    // Buscar el ID de la actividad
    $sql_actividad = "SELECT id FROM actividaddeportiva WHERE nombre = '$actividad_nombre'";
    $resultado_act = mysqli_query($conexion, $sql_actividad);
    
    if ($resultado_act && mysqli_num_rows($resultado_act) > 0) {
        $actividad = mysqli_fetch_assoc($resultado_act);
        $id_actividad = $actividad['id'];
        
        // Insertar el evento (solo guardamos la fecha, no datetime)
        $sql = "INSERT INTO evento (nombre, descripcion, fecha, lugar, id_actividad) 
                VALUES ('$nombre', '$descripcion', '$fecha', '$lugar', $id_actividad)";
        
        if (mysqli_query($conexion, $sql)) {
            echo json_encode([
                'success' => true,
                'mensaje' => 'Evento creado exitosamente',
                'id' => mysqli_insert_id($conexion)
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'mensaje' => 'Error al crear evento: ' . mysqli_error($conexion)
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