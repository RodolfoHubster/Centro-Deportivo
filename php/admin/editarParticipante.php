<?php
/**
 * editarParticipante.php - VERSIÓN CORREGIDA PARA LLAVES FORÁNEAS
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Habilitar reporte de errores para depuración (puedes quitarlo en producción)
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include '../includes/conexion.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido');
    }

    // 1. RECIBIR DATOS
    $id = $_POST['id_usuario'] ?? null;
    
    // Mapeo de nombres (Formulario 'nombres' vs BD 'nombre')
    $nombre = $_POST['nombres'] ?? $_POST['nombre'] ?? '';
    
    $paterno = $_POST['apellido_paterno'] ?? '';
    $materno = $_POST['apellido_materno'] ?? '';
    $correo = $_POST['correo'] ?? '';
    $matricula = $_POST['matricula'] ?? '';
    $genero = $_POST['genero'] ?? '';
    $rol = $_POST['tipo_participante'] ?? 'Estudiante'; 
    
    // 2. TRATAMIENTO ESPECIAL PARA LA LLAVE FORÁNEA (CARRERA)
    // Si viene vacío, 0 o nulo, DEBE ser NULL para SQL, no 0.
    $carrera_input = $_POST['carrera'] ?? '';
    $carrera_id = null; // Por defecto NULL

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

    // 4. ACTUALIZACIÓN
    // Usamos 's' para cadenas y 'i' para enteros.
    // carrera_id puede ser null, pero bind_param maneja variables nulas correctamente si no forzamos tipo estricto.
    
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

    // Tipos: 7 strings (s), 2 enteros (i) -> 'sssssssii'
    mysqli_stmt_bind_param($stmt, 'sssssssii', 
        $nombre, 
        $paterno, 
        $materno, 
        $correo, 
        $matricula,
        $genero,
        $rol,
        $carrera_id, // Si esta variable es PHP null, MySQL recibirá NULL
        $id
    );

    // 5. EJECUTAR
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception('Error al ejecutar actualización: ' . mysqli_stmt_error($stmt));
    }

    // Éxito
    echo json_encode([
        'success' => true, 
        'mensaje' => 'Datos actualizados correctamente.'
    ]);

} catch (mysqli_sql_exception $e) {
    // Capturar errores específicos de SQL (como llaves duplicadas)
    http_response_code(400);
    $msg = $e->getMessage();
    
    if (strpos($msg, 'Duplicate entry') !== false) {
        if (strpos($msg, 'correo') !== false) $msg = 'El correo ya está registrado.';
        elseif (strpos($msg, 'matricula') !== false) $msg = 'La matrícula ya está registrada.';
    }
    
    echo json_encode(['success' => false, 'mensaje' => 'Error BD: ' . $msg]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}

mysqli_close($conexion);
?>