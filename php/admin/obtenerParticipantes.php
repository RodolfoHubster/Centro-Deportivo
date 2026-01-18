<?php
// ARCHIVO: php/admin/obtenerParticipantes.php
// (Asegurate de que estás en la carpeta ADMIN)

header('Content-Type: application/json; charset=utf-8');
include '../includes/conexion.php';

try {
    $evento_id = isset($_GET['evento_id']) ? intval($_GET['evento_id']) : 0;

    // CONSULTA CORREGIDA PARA ADMIN
    $sql = "SELECT 
                u.id AS usuario_id,
                u.matricula,
                u.nombre,
                u.apellido_paterno,
                u.apellido_materno,
                u.correo,
                u.genero,
                u.rol,
                i.id AS inscripcion_id,
                i.es_capitan,
                i.equipo_id,
                
                /* ESTOS SON LOS DATOS QUE TE FALTAN */
                i.dias_disponibles, 
                i.horario_disponible, 
                /* -------------------------------- */

                e.nombre AS nombre_equipo
            FROM inscripcion i
            JOIN usuario u ON i.usuario_id = u.id
            LEFT JOIN equipo e ON i.equipo_id = e.id
            WHERE i.evento_id = ?
            ORDER BY e.nombre ASC, i.es_capitan DESC";
            
    $stmt = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    $resultado = mysqli_stmt_get_result($stmt);
    
    $participantes = [];
    while ($fila = mysqli_fetch_assoc($resultado)) {
        // Combinar nombres para el JS
        $fila['nombre_completo'] = $fila['nombre'] . ' ' . $fila['apellido_paterno'];
        $participantes[] = $fila;
    }

    // Obtener nombre del evento para el título
    $sqlE = "SELECT nombre FROM evento WHERE id = ?";
    $stmtE = mysqli_prepare($conexion, $sqlE);
    mysqli_stmt_bind_param($stmtE, 'i', $evento_id);
    mysqli_stmt_execute($stmtE);
    $resE = mysqli_stmt_get_result($stmtE);
    $evt = mysqli_fetch_assoc($resE);

    echo json_encode([
        'success' => true,
        'debug_check' => 'SI_ESTOY_EN_ADMIN', // <--- Esto nos confirmará si funciona
        'nombre_evento' => $evt ? $evt['nombre'] : 'Evento',
        'participantes' => $participantes
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}
?>