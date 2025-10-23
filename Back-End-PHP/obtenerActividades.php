<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

include 'conexion.php';

$sql = "SELECT * FROM actividaddeportiva ORDER BY nombre";
$resultado = mysqli_query($conexion, $sql);

$actividades = array();

if ($resultado) {
    while ($fila = mysqli_fetch_assoc($resultado)) {
        $actividades[] = $fila;
    }
    
    echo json_encode([
        'success' => true,
        'actividades' => $actividades,
        'total' => count($actividades)
    ]);
} else {
    echo json_encode([
        'success' => false,
        'mensaje' => 'Error al obtener actividades: ' . mysqli_error($conexion)
    ]);
}

mysqli_close($conexion);
?>