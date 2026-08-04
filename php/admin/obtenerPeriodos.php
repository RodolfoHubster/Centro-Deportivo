<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
include '../includes/conexion.php';

try {
    // ========================================================================
    // MODIFICACIÓN: Buscar en la tabla de periodos (catálogo maestro)
    // NOTA IMPORTANTE: Si tu tabla se llama diferente (ej. 'periodo' en vez de 'periodos') 
    // o la columna se llama diferente (ej. 'periodo' en vez de 'nombre'), ajusta la consulta aquí:
    // ========================================================================
    $sql = "SELECT nombre FROM periodo ORDER BY id DESC"; 
    
    $resultado = mysqli_query($conexion, $sql);
    
    // Si la consulta falla (por ejemplo, si la tabla no se llama 'periodos'), 
    // usamos el método de buscar en la tabla 'evento' como un plan de respaldo.
    if (!$resultado) {
        $sql = "SELECT DISTINCT periodo AS nombre FROM evento WHERE periodo IS NOT NULL AND periodo != 'N/A' ORDER BY periodo DESC";
        $resultado = mysqli_query($conexion, $sql);
    }
    
    $periodos = [];
    if ($resultado) {
        while ($row = mysqli_fetch_assoc($resultado)) {
            $periodos[] = $row['nombre'];
        }
    }

    echo json_encode(['success' => true, 'periodos' => $periodos]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

mysqli_close($conexion);
?>