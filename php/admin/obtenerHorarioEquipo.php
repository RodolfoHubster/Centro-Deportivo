<?php
// php/admin/obtenerHorarioEquipo.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); // Importante para acceso público
include '../includes/conexion.php';

if (!isset($_GET['equipo_id'])) {
    echo json_encode(['success' => false, 'mensaje' => 'Falta ID de equipo']);
    exit;
}

$equipo_id = intval($_GET['equipo_id']);

// Buscamos cualquier registro de este equipo para copiar su horario/día
$sql = "SELECT dias_disponibles, horario_disponible 
        FROM inscripcion 
        WHERE equipo_id = ? 
        AND dias_disponibles IS NOT NULL 
        LIMIT 1";

$stmt = mysqli_prepare($conexion, $sql);
mysqli_stmt_bind_param($stmt, 'i', $equipo_id);
mysqli_stmt_execute($stmt);
$resultado = mysqli_stmt_get_result($stmt);

if ($fila = mysqli_fetch_assoc($resultado)) {
    echo json_encode([
        'success' => true,
        'dias_disponibles' => $fila['dias_disponibles'],
        'horario_disponible' => $fila['horario_disponible']
    ]);
} else {
    // Si el equipo es nuevo y no tiene horario, enviamos null
    echo json_encode(['success' => false, 'mensaje' => 'Sin horario previo']);
}

mysqli_stmt_close($stmt);
mysqli_close($conexion);
?>