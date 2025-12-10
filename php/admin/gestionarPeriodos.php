<?php
// php/admin/gestionarPeriodos.php

// 1. Configuración de errores para depuración (SOLO JSON)
error_reporting(E_ALL);
ini_set('display_errors', 0); 

header('Content-Type: application/json; charset=utf-8');
include '../includes/conexion.php';

session_start();

try {
    // 2. Validación de sesión
    if (!isset($_SESSION['user_logged']) || $_SESSION['user_rol'] !== 'Administrador') {
        throw new Exception('No autorizado. Debes ser Administrador.');
    }

    $accion = $_GET['accion'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];

    // 3. Acción: OBTENER (GET)
    if ($accion === 'obtener' && $method === 'GET') {
        
        // CAMBIO: Usamos 'periodo' en singular
        $sql = "SELECT * FROM periodo ORDER BY nombre DESC";
        $res = mysqli_query($conexion, $sql);
        
        if (!$res) {
            // Si falla, verificamos si es porque la tabla no existe
            throw new Exception("Error SQL: " . mysqli_error($conexion));
        }

        $lista = [];
        while ($row = mysqli_fetch_assoc($res)) {
            $row['activo'] = (bool)$row['activo']; 
            $lista[] = $row;
        }
        
        // Devolvemos 'periodos' como clave JSON para el JS, pero los datos vienen de 'periodo'
        echo json_encode(['success' => true, 'periodos' => $lista]);
        exit;
    } 
    
    // 4. Acción: CREAR (POST)
    elseif ($accion === 'crear' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $nombre = mysqli_real_escape_string($conexion, trim($input['nombre'] ?? ''));
        
        if (empty($nombre)) {
            throw new Exception("El nombre del periodo es obligatorio.");
        }

        // CAMBIO: Usamos 'periodo' en singular
        $check = mysqli_query($conexion, "SELECT id FROM periodo WHERE nombre = '$nombre'");
        if (mysqli_num_rows($check) > 0) {
            throw new Exception("El periodo '$nombre' ya existe.");
        }

        $sql = "INSERT INTO periodo (nombre, activo) VALUES ('$nombre', 0)";
        if (mysqli_query($conexion, $sql)) {
            echo json_encode(['success' => true, 'mensaje' => 'Periodo creado exitosamente.']);
        } else {
            throw new Exception("Error al crear: " . mysqli_error($conexion));
        }
        exit;
    } 
    
    // 5. Acción: ACTIVAR (POST)
    elseif ($accion === 'activar' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = intval($input['id'] ?? 0);

        if ($id <= 0) throw new Exception("ID inválido.");

        mysqli_begin_transaction($conexion);
        
        // CAMBIO: Usamos 'periodo' en singular para desactivar todos
        if (!mysqli_query($conexion, "UPDATE periodo SET activo = 0")) {
            throw new Exception("Error al desactivar periodos anteriores.");
        }
        
        // CAMBIO: Usamos 'periodo' en singular para activar el elegido
        $stmt = mysqli_prepare($conexion, "UPDATE periodo SET activo = 1 WHERE id = ?");
        mysqli_stmt_bind_param($stmt, 'i', $id);
        
        if (mysqli_stmt_execute($stmt)) {
            mysqli_commit($conexion);
            echo json_encode(['success' => true, 'mensaje' => 'Periodo activado correctamente.']);
        } else {
            mysqli_rollback($conexion);
            throw new Exception("Error al activar el periodo.");
        }
        exit;
    }
    
    else {
        throw new Exception("Acción no válida o método incorrecto.");
    }

} catch (Exception $e) {
    if (isset($conexion) && mysqli_connect_errno() === 0) @mysqli_rollback($conexion);
    
    http_response_code(400); 
    echo json_encode([
        'success' => false, 
        'mensaje' => $e->getMessage(),
        'periodos' => [] 
    ]);
}
?>