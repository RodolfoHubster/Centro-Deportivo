<?php
/**
 * Obtener Eventos - MODIFICADO
 * Corrección de visibilidad para Torneos
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

include '../includes/conexion.php';

try {
    $filtros = [];
    $tipos_params = '';
    $valores_params = [];
    
    // --- FILTROS DE BÚSQUEDA ---

    // 1. Filtro flexible para Tipo de Actividad (Torneo, Clase, etc.)
    if (isset($_GET['tipo_actividad']) && !empty($_GET['tipo_actividad'])) {
        // CORRECCIÓN: Usamos LIKE para que encuentre "Torneo", "Torneos", etc.
        $filtros[] = "e.tipo_actividad LIKE ?"; 
        $tipos_params .= 's';
        $valores_params[] = '%' . $_GET['tipo_actividad'] . '%'; 
    }

    // Filtro para EXCLUIR actividad (Ej: Mostrar todo menos Torneos)
    if (isset($_GET['excluir_tipo_actividad']) && !empty($_GET['excluir_tipo_actividad'])) {
        $filtros[] = "e.tipo_actividad NOT LIKE ?"; 
        $tipos_params .= 's';
        $valores_params[] = '%' . $_GET['excluir_tipo_actividad'] . '%';
    }

    // Filtro por nombre de actividad (Tabla relacionada)
    if (isset($_GET['tipo']) && !empty($_GET['tipo'])) {
        $filtros[] = "a.nombre = ?";
        $tipos_params .= 's';
        $valores_params[] = $_GET['tipo'];
    }
    
    // Filtro por campus
    if (isset($_GET['campus_id']) && !empty($_GET['campus_id'])) {
        $filtros[] = "e.campus_id = ?";
        $tipos_params .= 'i';
        $valores_params[] = intval($_GET['campus_id']);
    }
    
    // Filtro por nombre de campus (Búsqueda textual)
    if (isset($_GET['campus']) && !empty($_GET['campus'])) {
        $filtros[] = "c.nombre LIKE ?"; 
        $tipos_params .= 's';
        $valores_params[] = '%' . $_GET['campus'] . '%';
    }

    // Otros filtros
    if (isset($_GET['categoria_deporte']) && !empty($_GET['categoria_deporte'])) {
        $filtros[] = "e.categoria_deporte = ?";
        $tipos_params .= 's';
        $valores_params[] = $_GET['categoria_deporte'];
    }
    
    if (isset($_GET['tipo_registro']) && !empty($_GET['tipo_registro'])) {
        $filtros[] = "e.tipo_registro = ?";
        $tipos_params .= 's';
        $valores_params[] = $_GET['tipo_registro'];
    }
    
    // Rango de fechas
    if (isset($_GET['fecha_desde']) && !empty($_GET['fecha_desde'])) {
        $filtros[] = "e.fecha_inicio >= ?";
        $tipos_params .= 's';
        $valores_params[] = $_GET['fecha_desde'];
    }
    
    if (isset($_GET['fecha_hasta']) && !empty($_GET['fecha_hasta'])) {
        $filtros[] = "e.fecha_inicio <= ?";
        $tipos_params .= 's';
        $valores_params[] = $_GET['fecha_hasta'];
    }
    
    // --- LÓGICA DE ACTIVOS (CORREGIDA) ---
    $incluirInactivos = isset($_GET['incluir_inactivos']) && $_GET['incluir_inactivos'] === 'true'; 
    $soloActivos = isset($_GET['activos']) ? $_GET['activos'] === 'true' : true;
    
    if (!$incluirInactivos) {
        if ($soloActivos) {
            $filtros[] = "e.activo = TRUE";
            // CORRECCIÓN: Permitir que aparezca si la fecha de término es hoy, futuro O SI ES NULL
            $filtros[] = "(e.fecha_termino >= CURDATE() OR e.fecha_termino IS NULL)"; 
        }
    }
    
    $whereClause = '';
    if (count($filtros) > 0) {
        $whereClause = ' WHERE ' . implode(' AND ', $filtros);
    }
    
    // --- CONSULTA SQL ---
    $sql = "SELECT 
                e.id, e.nombre, e.descripcion, e.fecha_inicio, e.fecha_termino, e.periodo, e.lugar,
                e.tipo_registro, e.categoria_deporte, e.tipo_actividad, e.ubicacion_tipo,
                e.cupo_maximo, e.integrantes_min, e.integrantes_max,
                
                CASE 
                    WHEN e.tipo_registro = 'Por equipos' THEN IFNULL(eq_stats.total_equipos, 0)
                    ELSE e.registros_actuales 
                END AS registros_actuales,

                e.codigo_qr, e.activo, e.campus_id,
                a.nombre AS actividad,
                c.nombre AS campus_nombre,
                c.codigo AS campus_codigo,
                u.nombre AS promotor_nombre,
                
                GROUP_CONCAT(DISTINCT f.siglas ORDER BY f.siglas SEPARATOR ', ') AS facultades_siglas,
                
                CASE 
                    WHEN e.cupo_maximo > 0 THEN 
                        CASE WHEN 
                            (CASE WHEN e.tipo_registro = 'Por equipos' THEN IFNULL(eq_stats.total_equipos, 0) ELSE e.registros_actuales END) 
                            < e.cupo_maximo THEN 1 ELSE 0 END
                    ELSE 1
                END AS tiene_cupo,
                
                CASE 
                    WHEN e.cupo_maximo > 0 THEN 
                        ROUND(((CASE WHEN e.tipo_registro = 'Por equipos' THEN IFNULL(eq_stats.total_equipos, 0) ELSE e.registros_actuales END) * 100.0 / e.cupo_maximo), 2)
                    ELSE 0
                END AS porcentaje_ocupacion

            FROM evento e
            LEFT JOIN actividaddeportiva a ON e.id_actividad = a.id
            LEFT JOIN campus c ON e.campus_id = c.id
            LEFT JOIN usuario u ON e.id_promotor = u.id
            LEFT JOIN evento_facultad ef ON e.id = ef.evento_id
            LEFT JOIN facultad f ON ef.facultad_id = f.id
            
            LEFT JOIN (
                SELECT evento_id, COUNT(*) as total_equipos
                FROM equipo
                GROUP BY evento_id
            ) eq_stats ON e.id = eq_stats.evento_id
            
            $whereClause
            
            GROUP BY e.id
            ORDER BY e.fecha_inicio DESC";
    
    if (count($valores_params) > 0) {
        $stmt = mysqli_prepare($conexion, $sql);
        if (!$stmt) throw new Exception('Error al preparar consulta: ' . mysqli_error($conexion));
        mysqli_stmt_bind_param($stmt, $tipos_params, ...$valores_params);
        mysqli_stmt_execute($stmt);
        $resultado = mysqli_stmt_get_result($stmt);
    } else {
        $resultado = mysqli_query($conexion, $sql);
    }
    
    $eventos = [];
    while ($fila = mysqli_fetch_assoc($resultado)) {
        // Formato fechas
        $fila['fecha_inicio_formato'] = $fila['fecha_inicio'] ? date('d/m/Y', strtotime($fila['fecha_inicio'])) : 'Sin fecha';
        $fila['fecha_termino_formato'] = $fila['fecha_termino'] ? date('d/m/Y', strtotime($fila['fecha_termino'])) : 'Sin fecha';
        
        // Estado
        $hoy = new DateTime();
        $fecha_evento = $fila['fecha_inicio'] ? new DateTime($fila['fecha_inicio']) : $hoy;
        $diferencia = $hoy->diff($fecha_evento);
        $fila['dias_restantes'] = $diferencia->invert ? -1 : $diferencia->days;
        
        $fila['evento_pasado'] = $fecha_evento < $hoy;
        
        if ($fila['evento_pasado']) $fila['estado'] = 'finalizado';
        elseif ($fila['dias_restantes'] == 0) $fila['estado'] = 'hoy';
        elseif ($fila['dias_restantes'] <= 7) $fila['estado'] = 'proximo';
        else $fila['estado'] = 'programado';
        
        $fila['tiene_cupo'] = (bool)$fila['tiene_cupo'];
        
        $eventos[] = $fila;
    }
    
    echo json_encode(['success' => true, 'eventos' => $eventos, 'total' => count($eventos)], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
mysqli_close($conexion);
?>