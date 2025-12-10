<?php
// php/admin/gestionarPeriodos.php
error_reporting(0);
ini_set('display_errors', 0); 
header('Content-Type: application/json; charset=utf-8');
include '../includes/conexion.php';
session_start();

try {
    // Validar Admin
    if (!isset($_SESSION['user_logged']) || $_SESSION['user_rol'] !== 'Administrador') {
        throw new Exception('No autorizado.');
    }

    $accion = $_GET['accion'] ?? '';
    
    // OBTENER (GET)
    if ($accion === 'obtener' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $sql = "SELECT * FROM periodo ORDER BY nombre DESC";
        $res = mysqli_query($conexion, $sql);
        
        $lista = [];
        if ($res) {
            while ($row = mysqli_fetch_assoc($res)) {
                $row['activo'] = (bool)$row['activo']; 
                $lista[] = $row;
            }
        }
        echo json_encode(['success' => true, 'periodos' => $lista]);
        exit;
    }
    
    // CREAR (POST)
    if ($accion === 'crear' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $nombre = mysqli_real_escape_string($conexion, trim($input['nombre'] ?? ''));
        
        if (empty($nombre)) throw new Exception("Nombre obligatorio.");
        
        $sql = "INSERT INTO periodo (nombre, activo) VALUES ('$nombre', 0)";
        if (mysqli_query($conexion, $sql)) {
            echo json_encode(['success' => true, 'mensaje' => 'Creado.']);
        } else {
            throw new Exception("Error SQL: " . mysqli_error($conexion));
        }
        exit;
    }

    // ACTIVAR (POST)
    if ($accion === 'activar' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = intval($input['id'] ?? 0);
        
        mysqli_begin_transaction($conexion);
        mysqli_query($conexion, "UPDATE periodo SET activo = 0"); // Desactivar todos
        
        $stmt = mysqli_prepare($conexion, "UPDATE periodo SET activo = 1 WHERE id = ?");
        mysqli_stmt_bind_param($stmt, 'i', $id);
        
        if (mysqli_stmt_execute($stmt)) {
            mysqli_commit($conexion);
            echo json_encode(['success' => true, 'mensaje' => 'Activado.']);
        } else {
            mysqli_rollback($conexion);
            throw new Exception("Error al activar.");
        }
        exit;
    }

} catch (Exception $e) {
    http_response_code(400); 
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}
mysqli_close($conexion);
?>