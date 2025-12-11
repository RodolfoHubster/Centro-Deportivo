<?php
/**
 * editarParticipante.php - VERSIÓN FINAL CON CORRECCIÓN DE ACADÉMICO
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

    // 1. RECIBIR DATOS
    $id = $_POST['id_usuario'] ?? $_POST['id'] ?? null;
    $nombre = $_POST['nombres'] ?? $_POST['nombre'] ?? '';
    $paterno = $_POST['apellido_paterno'] ?? '';
    $materno = $_POST['apellido_materno'] ?? '';
    $correo = $_POST['correo'] ?? '';
    $matricula = trim($_POST['matricula'] ?? '');
    $genero = $_POST['genero'] ?? '';
    $rol = $_POST['tipo_participante'] ?? $_POST['rol'] ?? 'Estudiante'; 

    // =================================================================
    // CORRECCIÓN 1: NORMALIZAR ROLES (Mayúscula -> Minúscula)
    // =================================================================
    // Esto asegura que coincida exactamente con el ENUM de la base de datos
    $mapa_roles = [
        'Personal de Servicio' => 'Personal de servicio',
        'Personal Académico'   => 'Personal académico'
    ];

    if (isset($mapa_roles[$rol])) {
        $rol = $mapa_roles[$rol];
    }

    // CORRECCIÓN 2: MATRÍCULA PARA ROLES LIBRES
    $roles_libres = ['Externo', 'Personal de servicio'];
    if (in_array($rol, $roles_libres) && empty($matricula)) {
        $matricula = $correo;
    }

    // 2. IDs DE UBICACIÓN ACADÉMICA
    $campus_input = $_POST['campus'] ?? $_POST['campus_id'] ?? '';
    $campus_id = (!empty($campus_input) && is_numeric($campus_input)) ? intval($campus_input) : null;

    $facultad_input = $_POST['facultad'] ?? $_POST['facultad_id'] ?? '';
    $facultad_id = (!empty($facultad_input) && is_numeric($facultad_input)) ? intval($facultad_input) : null;

    $carrera_input = $_POST['carrera'] ?? $_POST['carrera_id'] ?? '';
    $carrera_id = (!empty($carrera_input) && is_numeric($carrera_input)) ? intval($carrera_input) : null;

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
                campus_id = ?,   
                facultad_id = ?,   
                carrera_id = ?
            WHERE id = ?";

    $stmt = mysqli_prepare($conexion, $sql);
    
    if (!$stmt) {
        throw new Exception("Error preparando SQL: " . mysqli_error($conexion));
    }

    mysqli_stmt_bind_param($stmt, 'sssssssiiii', 
        $nombre, 
        $paterno, 
        $materno, 
        $correo, 
        $matricula,
        $genero,
        $rol,
        $campus_id,
        $facultad_id,
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
    http_response_code(400);
    $msg = $e->getMessage();
    
    // Manejo de errores específicos
    if (strpos($msg, 'truncated') !== false && strpos($msg, 'rol') !== false) {
        $msg = "Error de rol: El valor '$rol' no coincide con las opciones permitidas (ENUM) en la base de datos.";
    } elseif (strpos($msg, 'Duplicate entry') !== false) {
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