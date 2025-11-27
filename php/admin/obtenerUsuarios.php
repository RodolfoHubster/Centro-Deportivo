<?php
error_reporting(0);
ini_set('display_errors', 0);

session_start();
header('Content-Type: application/json');
include '../includes/conexion.php';

// ===== ¡SEGURIDAD! =====
if (!isset($_SESSION['user_logged']) || $_SESSION['user_rol'] !== 'Administrador') {
    http_response_code(403); // Prohibido
    echo json_encode(['success' => false, 'mensaje' => 'Acceso no autorizado']);
    exit;
}

try {
    // ===== MODIFICACIÓN AQUÍ: Añade "activo" al SELECT =====
    $sql = "SELECT id, nombre, apellido_paterno, apellido_materno, correo, matricula, rol, activo 
            FROM usuario 
            WHERE rol IN ('Administrador', 'Promotor') 
            ORDER BY apellido_paterno ASC";
    
    $resultado = mysqli_query($conexion, $sql);
    $usuarios = [];
    while ($fila = mysqli_fetch_assoc($resultado)) {
        // Convertir 'activo' a un booleano o entero para JS
        $fila['activo'] = (int)$fila['activo'];
        $usuarios[] = $fila;
    }

    echo json_encode(['success' => true, 'usuarios' => $usuarios]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}

mysqli_close($conexion);
?>