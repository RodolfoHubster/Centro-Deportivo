<?php
/**
 * editarParticipante.php - VERSIÓN CORREGIDA Y ROBUSTA
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Habilitar reporte de errores
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include '../includes/conexion.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido');
    }

    // 1. RECIBIR DATOS (Soporte para ambas versiones de ID por si el JS varía)
    $id = $_POST['id_usuario'] ?? $_POST['id'] ?? null;
    
    // Mapeo de nombres
    $nombre = $_POST['nombres'] ?? $_POST['nombre'] ?? '';
    $paterno = $_POST['apellido_paterno'] ?? '';
    $materno = $_POST['apellido_materno'] ?? '';
    $correo = $_POST['correo'] ?? '';
    $matricula = trim($_POST['matricula'] ?? '');
    $genero = $_POST['genero'] ?? '';
    $rol = $_POST['tipo_participante'] ?? $_POST['rol'] ?? 'Estudiante'; 

    // =================================================================
    // CORRECCIÓN 1: NORMALIZAR ROL (Mayúscula -> Minúscula)
    // =================================================================
    if ($rol === 'Personal de Servicio') {
        $rol = 'Personal de servicio';
    }

    // =================================================================
    // CORRECCIÓN 2: MATRÍCULA PARA ROLES LIBRES
    // Si es externo/servicio y la matrícula viene vacía, usamos el correo
    // =================================================================
    $roles_libres = ['Externo', 'Personal de servicio'];
    if (in_array($rol, $roles_libres) && empty($matricula)) {
        $matricula = $correo;
    }

    // 2. TRATAMIENTO LLAVE FORÁNEA (CARRERA)
    $carrera_input = $_POST['carrera'] ?? $_POST['carrera_id'] ?? '';
    $carrera_id = null;

    if (!empty($carrera_input) && is_numeric($carrera_input) && $carrera_input > 0) {
        $carrera_id = intval($carrera_input);
    }

    // 3. VALIDACIÓN BÁSICA
    if (!$id) {
        throw new Exception('Error: No se recibió el ID del usuario.');
    }
    if (empty($nombre) || empty($paterno) || empty($correo)) {
        throw new Exception('Nombre, Apellido Paterno y Correo son obligatorios.');
    }

    // 4. ACTUALIZACIÓN SQL
    $sql = "UPDATE usuario SET 
                nombre = ?, 
                apellido_paterno = ?, 
                apellido_materno = ?, 
                correo = ?, 
                matricula = ?,
                genero = ?,
                rol = ?,
                carrera_id = ?
            WHERE id = ?";

    $stmt = mysqli_prepare($conexion, $sql);
    
    if (!$stmt) {
        throw new Exception("Error preparando SQL: " . mysqli_error($conexion));
    }

    mysqli_stmt_bind_param($stmt, 'sssssssii', 
        $nombre, 
        $paterno, 
        $materno, 
        $correo, 
        $matricula,
        $genero,
        $rol,
        $carrera_id,
        $id
    );

    // 5. EJECUTAR
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception('Error al ejecutar actualización: ' . mysqli_stmt_error($stmt));
    }

    echo json_encode([
        'success' => true, 
        'mensaje' => 'Datos actualizados correctamente.'
    ]);

} catch (mysqli_sql_exception $e) {
    // Capturar errores SQL específicos (Duplicate entry, Data truncated)
    http_response_code(400);
    $msg = $e->getMessage();
    
    // Si falla por el ENUM (Data truncated)
    if (strpos($msg, 'truncated') !== false && strpos($msg, 'rol') !== false) {
        $msg = "Error de rol: El valor '$rol' no es válido en la base de datos.";
    }
    // Si falla por duplicados
    elseif (strpos($msg, 'Duplicate entry') !== false) {
        if (strpos($msg, 'correo') !== false) $msg = 'El correo ya está registrado.';
        elseif (strpos($msg, 'matricula') !== false) $msg = 'La matrícula (o ID) ya está registrada.';
    }
    
    echo json_encode(['success' => false, 'mensaje' => 'Error BD: ' . $msg]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}

mysqli_close($conexion);
?>