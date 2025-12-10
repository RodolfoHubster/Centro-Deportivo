<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

include '../includes/conexion.php';

try {
    // Obtenemos solo usuarios activos con rol de autoridad
    $sql = "SELECT nombre, apellido_paterno, apellido_materno, correo, rol 
            FROM usuario 
            WHERE rol IN ('Administrador', 'Promotor') AND activo = 1 
            ORDER BY rol ASC, nombre ASC";
            
    $resultado = mysqli_query($conexion, $sql);
    
    $contactos = [];
    while ($fila = mysqli_fetch_assoc($resultado)) {
        // Concatenamos el nombre completo para el frontend
        $fila['nombre_completo'] = trim($fila['nombre'] . ' ' . ($fila['apellido_paterno'] ?? '') . ' ' . ($fila['apellido_materno'] ?? ''));
        $contactos[] = $fila;
    }
    
    echo json_encode(['success' => true, 'contactos' => $contactos]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}

mysqli_close($conexion);
?>