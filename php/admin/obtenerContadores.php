<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
include '../includes/conexion.php';

try {
    // 1. Recibimos el periodo seleccionado en el dropdown
    $periodo = isset($_GET['periodo']) ? $_GET['periodo'] : '';

    // Si viene vacío (carga inicial), sacamos el más reciente de tu tabla "periodo"
    if ($periodo === '') {
        $sqlPeriodo = "SELECT nombre FROM periodo ORDER BY id DESC LIMIT 1";
        $resPeriodo = mysqli_query($conexion, $sqlPeriodo);
        if ($resPeriodo && $rowP = mysqli_fetch_assoc($resPeriodo)) {
            $periodo = $rowP['nombre'];
        } else {
            // Respaldo por si falla
            $sqlP2 = "SELECT periodo FROM evento WHERE periodo IS NOT NULL AND periodo != 'N/A' ORDER BY periodo DESC LIMIT 1";
            $resP2 = mysqli_query($conexion, $sqlP2);
            if ($resP2 && $rowP2 = mysqli_fetch_assoc($resP2)) {
                $periodo = $rowP2['periodo'];
            }
        }
    }

    $estadisticas = [
        'total_eventos' => 0,
        'total_inscripciones' => 0
    ];

    // 2. Contar Eventos
    if ($periodo === 'Todos') {
        $sqlEventos = "SELECT COUNT(*) as total FROM evento WHERE tipo_creacion = 'evento'";
        $stmtEventos = mysqli_prepare($conexion, $sqlEventos);
    } else {
        $sqlEventos = "SELECT COUNT(*) as total FROM evento WHERE periodo = ? AND tipo_creacion = 'evento'";
        $stmtEventos = mysqli_prepare($conexion, $sqlEventos);
        mysqli_stmt_bind_param($stmtEventos, "s", $periodo);
    }
    mysqli_stmt_execute($stmtEventos);
    $resEventos = mysqli_stmt_get_result($stmtEventos);
    if ($row = mysqli_fetch_assoc($resEventos)) {
        $estadisticas['total_eventos'] = $row['total'];
    }
    mysqli_stmt_close($stmtEventos);

    // 3. Contar Inscripciones
    if ($periodo === 'Todos') {
        $sqlInscripciones = "SELECT COUNT(*) as total FROM inscripcion";
        $stmtInsc = mysqli_prepare($conexion, $sqlInscripciones);
    } else {
        $sqlInscripciones = "SELECT COUNT(i.id) as total FROM inscripcion i INNER JOIN evento e ON i.evento_id = e.id WHERE e.periodo = ?";
        $stmtInsc = mysqli_prepare($conexion, $sqlInscripciones);
        mysqli_stmt_bind_param($stmtInsc, "s", $periodo);
    }
    mysqli_stmt_execute($stmtInsc);
    $resInscripciones = mysqli_stmt_get_result($stmtInsc);
    if ($row = mysqli_fetch_assoc($resInscripciones)) {
        $estadisticas['total_inscripciones'] = $row['total'];
    }
    mysqli_stmt_close($stmtInsc);

    echo json_encode([
        'success' => true,
        'periodo_consultado' => $periodo,
        'total_eventos' => $estadisticas['total_eventos'],
        'total_inscripciones' => $estadisticas['total_inscripciones']
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
mysqli_close($conexion);
?>