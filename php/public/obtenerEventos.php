<?php
/**
 * Obtener Eventos - CORREGIDO (Conteo dinámico de equipos)
 * Soluciona el error donde se permite crear equipos aunque el cupo esté lleno.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

include '../includes/conexion.php';

try {
    // Construir filtros dinámicamente
    $filtros = [];
    $tipos_params = '';
    $valores_params = [];
    
    // Filtro por tipo de actividad
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
    
    // Filtro por categoría deporte
    if (isset($_GET['categoria_deporte']) && !empty($_GET['categoria_deporte'])) {
        $filtros[] = "e.categoria_deporte = ?";
        $tipos_params .= 's';
        $valores_params[] = $_GET['categoria_deporte'];
    }
    
    // Filtro por tipo de actividad
    if (isset($_GET['tipo_actividad']) && !empty($_GET['tipo_actividad'])) {
        $filtros[] = "e.tipo_actividad = ?";
        $tipos_params .= 's';
        $valores_params[] = $_GET['tipo_actividad'];
    }

    if (isset($_GET['campus']) && !empty($_GET['campus'])) {
        // Buscamos coincidencias en el nombre del campus (ej. "Tijuana" encuentra "Campus Tijuana")
        $filtros[] = "c.nombre LIKE ?"; 
        $tipos_params .= 's';
        $valores_params[] = '%' . $_GET['campus'] . '%';
    }
    
    // Filtro por tipo de registro
    if (isset($_GET['tipo_registro']) && !empty($_GET['tipo_registro'])) {
        $filtros[] = "e.tipo_registro = ?";
        $tipos_params .= 's';
        $valores_params[] = $_GET['tipo_registro'];
    }

    // Filtro para EXCLUIR un tipo de actividad
    if (isset($_GET['excluir_tipo_actividad']) && !empty($_GET['excluir_tipo_actividad'])) {
        $filtros[] = "e.tipo_actividad != ?"; 
        $tipos_params .= 's';
        $valores_params[] = $_GET['excluir_tipo_actividad'];
    }
    
    // Filtro por rango de fechas
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
    
    // Lógica de estado (Activos/Inactivos)
    $incluirInactivos = isset($_GET['incluir_inactivos']) && $_GET['incluir_inactivos'] === 'true'; 
    $soloActivos = isset($_GET['activos']) ? $_GET['activos'] === 'true' : true;
    
    if (!$incluirInactivos) {
        if ($soloActivos) {
            $filtros[] = "e.activo = TRUE";
            $filtros[] = "e.fecha_termino >= CURDATE()"; 
        }
    }
    
    $whereClause = '';
    if (count($filtros) > 0) {
        $whereClause = ' WHERE ' . implode(' AND ', $filtros);
    }
    
    // === CONSULTA SQL OPTIMIZADA ===
    // Se añade un LEFT JOIN con una subconsulta (eq_stats) para contar los equipos reales.
    $sql = "SELECT 
                e.id,
                e.nombre,
                e.descripcion,
                e.fecha_inicio,
                e.fecha_termino,
                e.periodo,
                e.lugar,
                e.tipo_registro,
                e.categoria_deporte,
                e.tipo_actividad,
                e.ubicacion_tipo,
                e.cupo_maximo,
                e.integrantes_min,
                e.integrantes_max,
                
                -- CORRECCIÓN: Usar el conteo real de equipos si es un torneo, si no, usar el contador normal
                CASE 
                    WHEN e.tipo_registro = 'Por equipos' THEN IFNULL(eq_stats.total_equipos, 0)
                    ELSE e.registros_actuales 
                END AS registros_actuales,

                e.codigo_qr,
                e.activo,
                e.campus_id,
                a.nombre AS actividad,
                c.nombre AS campus_nombre,
                c.codigo AS campus_codigo,
                u.nombre AS promotor_nombre,
                
                GROUP_CONCAT(DISTINCT f.siglas ORDER BY f.siglas SEPARATOR ', ') AS facultades_siglas,
                GROUP_CONCAT(DISTINCT f.id ORDER BY f.id SEPARATOR ',') AS facultades_ids,
                GROUP_CONCAT(DISTINCT f.nombre ORDER BY f.nombre SEPARATOR ', ') AS facultades_nombres,
                
                -- CORRECCIÓN: Calcular cupo disponible usando el valor dinámico
                CASE 
                    WHEN e.cupo_maximo > 0 THEN 
                        CASE WHEN 
                            (CASE WHEN e.tipo_registro = 'Por equipos' THEN IFNULL(eq_stats.total_equipos, 0) ELSE e.registros_actuales END) 
                            < e.cupo_maximo THEN 1 ELSE 0 END
                    ELSE 1
                END AS tiene_cupo,
                
                -- CORRECCIÓN: Calcular porcentaje usando el valor dinámico
                CASE 
                    WHEN e.cupo_maximo > 0 THEN 
                        ROUND((
                            (CASE WHEN e.tipo_registro = 'Por equipos' THEN IFNULL(eq_stats.total_equipos, 0) ELSE e.registros_actuales END)
                            * 100.0 / e.cupo_maximo), 2)
                    ELSE 0
                END AS porcentaje_ocupacion

            FROM evento e
            LEFT JOIN actividaddeportiva a ON e.id_actividad = a.id
            LEFT JOIN campus c ON e.campus_id = c.id
            LEFT JOIN usuario u ON e.id_promotor = u.id
            LEFT JOIN evento_facultad ef ON e.id = ef.evento_id
            LEFT JOIN facultad f ON ef.facultad_id = f.id
            
            -- JOIN PARA CONTAR EQUIPOS REALES
            LEFT JOIN (
                SELECT evento_id, COUNT(*) as total_equipos
                FROM equipo
                GROUP BY evento_id
            ) eq_stats ON e.id = eq_stats.evento_id
            
            $whereClause
            
            GROUP BY e.id, e.nombre, e.descripcion, e.fecha_inicio, e.fecha_termino, e.periodo,
                     e.lugar, e.tipo_registro, e.categoria_deporte, e.tipo_actividad,
                     e.ubicacion_tipo, e.cupo_maximo, e.integrantes_min, e.integrantes_max, e.registros_actuales, e.codigo_qr,
                     e.activo, a.nombre, c.nombre, c.codigo, u.nombre, eq_stats.total_equipos
            ORDER BY e.fecha_inicio DESC";
    
    // Preparar y ejecutar consulta
    if (count($valores_params) > 0) {
        $stmt = mysqli_prepare($conexion, $sql);
        if (!$stmt) {
            throw new Exception('Error al preparar consulta: ' . mysqli_error($conexion));
        }
        mysqli_stmt_bind_param($stmt, $tipos_params, ...$valores_params);
        mysqli_stmt_execute($stmt);
        $resultado = mysqli_stmt_get_result($stmt);
    } else {
        $resultado = mysqli_query($conexion, $sql);
        if (!$resultado) {
            throw new Exception('Error en consulta: ' . mysqli_error($conexion));
        }
    }
    
    $eventos = [];
    while ($fila = mysqli_fetch_assoc($resultado)) {
        // Formatear fechas
        $fila['fecha_inicio_formato'] = date('d/m/Y', strtotime($fila['fecha_inicio']));
        $fila['fecha_termino_formato'] = date('d/m/Y', strtotime($fila['fecha_termino']));
        
        // Calcular estado
        $hoy = new DateTime();
        $fecha_evento = new DateTime($fila['fecha_inicio']);
        $diferencia = $hoy->diff($fecha_evento);
        $fila['dias_restantes'] = $diferencia->days;
        $fila['evento_pasado'] = $fecha_evento < $hoy;
        
        if ($fila['evento_pasado']) {
            $fila['estado'] = 'finalizado';
        } elseif ($fila['dias_restantes'] == 0) {
            $fila['estado'] = 'hoy';
        } elseif ($fila['dias_restantes'] <= 7) {
            $fila['estado'] = 'proximo';
        } else {
            $fila['estado'] = 'programado';
        }
        
        $fila['tiene_cupo'] = (bool)$fila['tiene_cupo'];
        $fila['porcentaje_ocupacion'] = (float)$fila['porcentaje_ocupacion'];
        
        $eventos[] = $fila;
    }
    
    echo json_encode([
        'success' => true,
        'eventos' => $eventos,
        'total' => count($eventos)
    ], JSON_UNESCAPED_UNICODE);
    
    if (isset($stmt)) {
        mysqli_stmt_close($stmt);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'mensaje' => 'Error al obtener eventos',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

mysqli_close($conexion);
?>