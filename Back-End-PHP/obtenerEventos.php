<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

include 'conexion.php';

// Obtener el tipo de actividad del parámetro GET
$tipoActividad = isset($_GET['tipo']) ? $_GET['tipo'] : '';

// Construir la consulta SQL con JOIN
$sql = "SELECT e.*, a.nombre as actividad 
        FROM evento e 
        LEFT JOIN actividaddeportiva a ON e.id_actividad = a.id";

if (!empty($tipoActividad)) {
    $tipoActividad = mysqli_real_escape_string($conexion, $tipoActividad);
    $sql .= " WHERE a.nombre = '$tipoActividad'";
}

$sql .= " ORDER BY e.fecha DESC";

$resultado = mysqli_query($conexion, $sql);

$eventos = array();

if ($resultado) {
    while ($fila = mysqli_fetch_assoc($resultado)) {
        $eventos[] = $fila;
    }
    
    echo json_encode([
        'success' => true,
        'eventos' => $eventos,
        'total' => count($eventos)
    ]);
} else {
    echo json_encode([
        'success' => false,
        'mensaje' => 'Error al obtener eventos: ' . mysqli_error($conexion)
    ]);
}

mysqli_close($conexion);
?>