<?php
// rodolfohubster/centro-deportivo/Centro-Deportivo-c98236dfa7a136db3c6c2a3d26403f5b779c7a4f/php/admin/crearUsuario.php

// 1. INICIO DE BUFFER PARA EVITAR SALIDA INESPERADA
ob_start(); 
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Credentials: true');

include '../includes/conexion.php';

// ===== ¡SEGURIDAD! =====
if (!isset($_SESSION['user_logged']) || $_SESSION['user_rol'] !== 'Administrador') {
    // Asegurar que no haya nada en el buffer antes de la respuesta de error
    ob_end_clean(); 
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
    $id = $_POST['id'] ?? null; // Para edición

    // Validaciones
    if (empty($nombre) || empty($paterno) || empty($matricula) || empty($correo) || empty($rol)) {
        throw new Exception('Todos los campos son obligatorios, excepto Contraseña y Ap. Materno');
    }
    if ($rol !== 'Administrador' && $rol !== 'Promotor') {
        throw new Exception('Rol no válido');
    }

    // --- LÓGICA DE CREAR O EDITAR ---
    if (empty($id)) {
        // CREAR
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
        // EDITAR
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
    
    // 2. LIMPIAR BUFFER Y EMITIR RESPUESTA EXITOSA
    ob_end_clean(); 
    echo json_encode(['success' => true, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    mysqli_rollback($conexion);
    
    // 3. LIMPIAR BUFFER Y EMITIR RESPUESTA DE ERROR
    ob_end_clean(); 
    http_response_code(400);
    $msg = $e->getMessage();
    if (strpos($msg, 'Duplicate entry') !== false) {
        if (strpos($msg, 'correo') !== false) $msg = 'El correo ya está en uso.';
        elseif (strpos($msg, 'matricula') !== false) $msg = 'La matrícula ya está en uso.';
    }
    echo json_encode(['success' => false, 'mensaje' => $msg], JSON_UNESCAPED_UNICODE);
}

mysqli_close($conexion);
exit;
// Nota: La etiqueta de cierre '?>' se omite por seguridad, si existe en su archivo, déjela fuera del bloque de código PHP para evitar espacios en blanco.