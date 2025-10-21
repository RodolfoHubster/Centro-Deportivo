<?php
// NO DEBE HABER NADA ANTES DE ESTA LÍNEA
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

include 'conexion.php';

try {
    if (!isset($_GET['facultad_id']) || empty($_GET['facultad_id'])) {
        throw new Exception('ID de facultad no proporcionado');
    }
    
    $facultad_id = intval($_GET['facultad_id']);
    
    $sql = "SELECT id, nombre, codigo FROM carrera WHERE facultad_id = $facultad_id ORDER BY nombre ASC";
    $resultado = mysqli_query($conexion, $sql);
    
    if (!$resultado) {
        throw new Exception('Error en la consulta: ' . mysqli_error($conexion));
    }
    
    $carreras = [];
    while ($row = mysqli_fetch_assoc($resultado)) {
        $carreras[] = $row;
    }
    
    echo json_encode($carreras);
    
} catch(Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => true,
        'mensaje' => $e->getMessage()
    ]);
}

mysqli_close($conexion);
// NO DEBE HABER NADA DESPUÉS DE ESTA LÍNEA