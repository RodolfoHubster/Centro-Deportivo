<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
include '../includes/conexion.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido');
    }

    $data = json_decode(file_get_contents("php://input"), true);
    $inscripcion_id = $data['inscripcion_id'] ?? null;
    $evento_id = $data['evento_id'] ?? null;

    if (!$inscripcion_id || !$evento_id) {
        throw new Exception('Faltan datos obligatorios');
    }

    // Iniciar transacción
    mysqli_begin_transaction($conexion);

    // 1. OBTENER INFORMACIÓN DE LA INSCRIPCIÓN ANTES DE BORRARLA
    // Necesitamos saber si pertenece a un equipo o no
    $sqlInfo = "SELECT equipo_id, es_capitan FROM inscripcion WHERE id = ?";
    $stmtInfo = mysqli_prepare($conexion, $sqlInfo);
    mysqli_stmt_bind_param($stmtInfo, 'i', $inscripcion_id);
    mysqli_stmt_execute($stmtInfo);
    $resInfo = mysqli_stmt_get_result($stmtInfo);
    $infoInscripcion = mysqli_fetch_assoc($resInfo);
    mysqli_stmt_close($stmtInfo);

    if (!$infoInscripcion) {
        throw new Exception('La inscripción no existe o ya fue eliminada.');
    }

    $es_equipo = !is_null($infoInscripcion['equipo_id']);
    $es_capitan = $infoInscripcion['es_capitan'] == 1;

    // 2. VALIDACIÓN DE CAPITÁN (Opcional: Impedir borrar al capitán si hay equipo)
    // Si borras al capitán, el equipo se queda huérfano. 
    // Por ahora, solo permitiremos borrar si NO es capitán, o si el sistema permite cambiar capitán después.
    if ($es_equipo && $es_capitan) {
        // Opcional: Descomenta esto si quieres prohibir borrar capitanes
        // throw new Exception('No se puede eliminar al capitán. Debes eliminar el equipo completo.');
    }

    // 3. ELIMINAR LA INSCRIPCIÓN
    $sqlDelete = "DELETE FROM inscripcion WHERE id = ?";
    $stmt = mysqli_prepare($conexion, $sqlDelete);
    mysqli_stmt_bind_param($stmt, 'i', $inscripcion_id);
    
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception('Error al eliminar la inscripción');
    }
    mysqli_stmt_close($stmt);

    // 4. ACTUALIZAR CONTADOR DEL EVENTO (SOLO SI ES INDIVIDUAL)
    // Si es por equipos, el contador 'registros_actuales' cuenta EQUIPOS, no personas.
    // Al borrar una persona, el equipo sigue existiendo, así que NO bajamos el contador.
    
    if (!$es_equipo) {
        $sqlUpdate = "UPDATE evento SET registros_actuales = GREATEST(0, registros_actuales - 1) WHERE id = ?";
        $stmtUpdate = mysqli_prepare($conexion, $sqlUpdate);
        mysqli_stmt_bind_param($stmtUpdate, 'i', $evento_id);
        mysqli_stmt_execute($stmtUpdate);
        mysqli_stmt_close($stmtUpdate);
    } 
    // NOTA: Si quisieras que al borrar el ULTIMO miembro se borre el equipo y baje el contador,
    // necesitarías una lógica extra aquí para verificar si el equipo quedó vacío.

    mysqli_commit($conexion);

    echo json_encode(['success' => true, 'mensaje' => 'Participante eliminado correctamente del evento.']);

} catch (Exception $e) {
    if (isset($conexion)) mysqli_rollback($conexion);
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}
?>