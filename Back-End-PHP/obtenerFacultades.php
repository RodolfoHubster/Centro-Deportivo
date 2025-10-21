<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');
// NO DEBE HABER NADA ANTES DE ESTA LÍNEA
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

include 'conexion.php';

try {
    $sql = "SELECT id, nombre, siglas FROM facultad ORDER BY nombre ASC";
    $resultado = mysqli_query($conexion, $sql);
    
    if (!$resultado) {
        throw new Exception('Error en la consulta: ' . mysqli_error($conexion));
    }
    
    $facultades = [];
    while ($row = mysqli_fetch_assoc($resultado)) {
        $facultades[] = $row;
    }
    
    echo json_encode($facultades);
    
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'mensaje' => $e->getMessage()
    ]);
}

mysqli_close($conexion);
// NO DEBE HABER NADA DESPUÉS DE ESTA LÍNEA