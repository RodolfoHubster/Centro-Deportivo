<?php
session_start();
header('Content-Type: application/json');
include '../includes/conexion.php';

// ===== ¡SEGURIDAD! =====
if (!isset($_SESSION['user_logged']) || $_SESSION['user_rol'] !== 'Administrador') {
    http_response_code(403);
    echo json_encode(['success' => false, 'mensaje' => 'Acceso no autorizado']);
    exit;
}

mysqli_begin_transaction($conexion);

try {
    $nombre = $_POST['nombre'] ?? '';
    $paterno = $_POST['apellido_paterno'] ?? '';
    $materno = $_POST['apellido_materno'] ?? '';
    $matricula = $_POST['matricula'] ?? '';
    $correo = $_POST['correo'] ?? '';
    $rol = $_POST['rol'] ?? '';
    $contrasena = $_POST['contrasena'] ?? '';
    $id = $_POST['id'] ?? null; // Para edición (aún no implementado en JS)

    // Validaciones
    if (empty($nombre) || empty($paterno) || empty($matricula) || empty($correo) || empty($rol)) {
        throw new Exception('Todos los campos son obligatorios, excepto Contraseña y Ap. Materno');
    }
    if ($rol !== 'Administrador' && $rol !== 'Promotor') {
        throw new Exception('Rol no válido');
    }

    // --- LÓGICA DE CREAR (Falta Editar, pero esto es lo básico) ---
    if (empty($id)) {
        if (empty($contrasena)) {
            throw new Exception('La contraseña es obligatoria al crear un usuario');
        }

        // Hashear contraseña (como en tu hash.php)
        $hash = password_hash($contrasena, PASSWORD_BCRYPT, ['cost' => 10]);

        $sql = "INSERT INTO usuario (matricula, nombre, apellido_paterno, apellido_materno, correo, rol, contrasena, activo) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)";
        $stmt = mysqli_prepare($conexion, $sql);
        mysqli_stmt_bind_param($stmt, 'sssssss', $matricula, $nombre, $paterno, $materno, $correo, $rol, $hash);
        
        if (!mysqli_stmt_execute($stmt)) {
             throw new Exception('Error al crear usuario: ' . mysqli_stmt_error($stmt));
        }
        $mensaje = 'Usuario creado exitosamente';
    } else {
        // --- LÓGICA DE EDITAR ---
        if (!empty($contrasena)) {
            // Si se proporcionó una nueva contraseña, actualizarla
            $hash = password_hash($contrasena, PASSWORD_BCRYPT, ['cost' => 10]);
            $sql = "UPDATE usuario SET matricula = ?, nombre = ?, apellido_paterno = ?, apellido_materno = ?, correo = ?, rol = ?, contrasena = ? WHERE id = ?";
            $stmt = mysqli_prepare($conexion, $sql);
            mysqli_stmt_bind_param($stmt, 'sssssssi', $matricula, $nombre, $paterno, $materno, $correo, $rol, $hash, $id);
        } else {
            // Si no se proporcionó contraseña, NO se actualiza
            $sql = "UPDATE usuario SET matricula = ?, nombre = ?, apellido_paterno = ?, apellido_materno = ?, correo = ?, rol = ? WHERE id = ?";
            $stmt = mysqli_prepare($conexion, $sql);
            mysqli_stmt_bind_param($stmt, 'ssssssi', $matricula, $nombre, $paterno, $materno, $correo, $rol, $id);
        }

        if (!mysqli_stmt_execute($stmt)) {
             throw new Exception('Error al actualizar usuario: ' . mysqli_stmt_error($stmt));
        }
        $mensaje = 'Usuario actualizado exitosamente';
    }
    
    mysqli_commit($conexion);
    echo json_encode(['success' => true, 'mensaje' => $mensaje]);

} catch (Exception $e) {
    mysqli_rollback($conexion);
    http_response_code(400);
    $msg = $e->getMessage();
    if (strpos($msg, 'Duplicate entry') !== false) {
        if (strpos($msg, 'correo') !== false) $msg = 'El correo ya está en uso.';
        elseif (strpos($msg, 'matricula') !== false) $msg = 'La matrícula ya está en uso.';
    }
    echo json_encode(['success' => false, 'mensaje' => $msg]);
}

mysqli_close($conexion);
?>