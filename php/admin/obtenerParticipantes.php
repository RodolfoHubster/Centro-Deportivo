<?php
// /php/public/obtenerParticipantes.php

header('Content-Type: application/json; charset=utf-8');
include '../includes/conexion.php'; // Ajusta la ruta a tu conexión

try {
    if (!isset($_GET['evento_id']) || empty($_GET['evento_id'])) {
        throw new Exception("No se proporcionó ID de evento");
    }
    
    $evento_id = intval($_GET['evento_id']);

    // Esta consulta une 'inscripcion' con 'usuario' para obtener los datos de la persona
    $sql = "SELECT 
                u.id AS usuario_id,
                u.matricula,
                u.nombre,
                u.apellido_paterno,
                u.apellido_materno,
                u.genero,
                u.correo,
                u.rol,
                i.id AS inscripcion_id,
                i.es_capitan
            FROM inscripcion i
            JOIN usuario u ON i.usuario_id = u.id
            WHERE i.evento_id = ?
            ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre";
            
    $stmt = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    $resultado = mysqli_stmt_get_result($stmt);
    
    $participantes = [];
    while ($fila = mysqli_fetch_assoc($resultado)) {
        // Combinamos los apellidos para el nombre completo
        $fila['nombre_completo'] = $fila['apellido_paterno'] . ' ' . $fila['apellido_materno'] . ' ' . $fila['nombre'];
        $participantes[] = $fila;
    }
    
    mysqli_stmt_close($stmt);
    mysqli_close($conexion);
    
    echo json_encode(['success' => true, 'participantes' => $participantes]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}
?>