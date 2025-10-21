<?php
/**
 * Obtener Eventos - ACTUALIZADO para nueva estructura BD
 * Soporta múltiples filtros
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

include 'conexion.php';

try {
    // Construir filtros dinámicamente
    $filtros = [];
    $tipos_params = '';
    $valores_params = [];
    
    // Filtro por tipo de actividad (compatibilidad con código anterior)
    if (isset($_GET['tipo']) && !empty($_GET['tipo'])) {
        $filtros[] = "a.nombre = ?";
        $tipos_params .= 's';
        $valores_params[] = $_GET['tipo'];
    }
    
    // NUEVOS FILTROS (para después de la migración)
    
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
    
    // Filtro por tipo de registro
    if (isset($_GET['tipo_registro']) && !empty($_GET['tipo_registro'])) {
        $filtros[] = "e.tipo_registro = ?";
        $tipos_params .= 's';
        $valores_params[] = $_GET['tipo_registro'];
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
    
    // Filtro por eventos activos (por defecto solo activos)
    $soloActivos = isset($_GET['activos']) ? $_GET['activos'] === 'true' : true;
    if ($soloActivos) {
        $filtros[] = "e.activo = TRUE";
    }
    
    // Construir WHERE clause
    $whereClause = '';
    if (count($filtros) > 0) {
        $whereClause = ' WHERE ' . implode(' AND ', $filtros);
    }
    
    // Consulta SQL actualizada para nueva estructura
    $sql = "SELECT 
                e.id,
                e.nombre,
                e.descripcion,
                e.fecha_inicio,
                e.fecha_termino,
                e.lugar,
                e.tipo_registro,
                e.categoria_deporte,
                e.tipo_actividad,
                e.ubicacion_tipo,
                e.cupo_maximo,
                e.registros_actuales,
                e.codigo_qr,
                e.activo,
                a.nombre AS actividad,
                c.nombre AS campus_nombre,
                c.codigo AS campus_codigo,
                u.nombre AS promotor_nombre,
                GROUP_CONCAT(DISTINCT f.siglas ORDER BY f.siglas SEPARATOR ', ') AS facultades,
                -- Calcular si tiene cupo disponible
                CASE 
                    WHEN e.cupo_maximo > 0 THEN 
                        CASE WHEN e.registros_actuales < e.cupo_maximo THEN 1 ELSE 0 END
                    ELSE 1
                END AS tiene_cupo,
                -- Calcular porcentaje de ocupación
                CASE 
                    WHEN e.cupo_maximo > 0 THEN 
                        ROUND((e.registros_actuales * 100.0 / e.cupo_maximo), 2)
                    ELSE 0
                END AS porcentaje_ocupacion
            FROM evento e
            LEFT JOIN actividaddeportiva a ON e.id_actividad = a.id
            LEFT JOIN campus c ON e.campus_id = c.id
            LEFT JOIN usuario u ON e.id_promotor = u.id
            LEFT JOIN evento_facultad ef ON e.id = ef.evento_id
            LEFT JOIN facultad f ON ef.facultad_id = f.id
            $whereClause
            GROUP BY e.id, e.nombre, e.descripcion, e.fecha_inicio, e.fecha_termino,
                     e.lugar, e.tipo_registro, e.categoria_deporte, e.tipo_actividad,
                     e.ubicacion_tipo, e.cupo_maximo, e.registros_actuales, e.codigo_qr,
                     e.activo, a.nombre, c.nombre, c.codigo, u.nombre
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
    
    // Procesar resultados
    $eventos = [];
    while ($fila = mysqli_fetch_assoc($resultado)) {
        // Formatear fechas
        $fila['fecha_inicio_formato'] = date('d/m/Y', strtotime($fila['fecha_inicio']));
        $fila['fecha_termino_formato'] = date('d/m/Y', strtotime($fila['fecha_termino']));
        
        // Calcular días restantes
        $hoy = new DateTime();
        $fecha_evento = new DateTime($fila['fecha_inicio']);
        $diferencia = $hoy->diff($fecha_evento);
        $fila['dias_restantes'] = $diferencia->days;
        $fila['evento_pasado'] = $fecha_evento < $hoy;
        
        // Estado del evento
        if ($fila['evento_pasado']) {
            $fila['estado'] = 'finalizado';
        } elseif ($fila['dias_restantes'] == 0) {
            $fila['estado'] = 'hoy';
        } elseif ($fila['dias_restantes'] <= 7) {
            $fila['estado'] = 'proximo';
        } else {
            $fila['estado'] = 'programado';
        }
        
        // Convertir valores numéricos
        $fila['tiene_cupo'] = (bool)$fila['tiene_cupo'];
        $fila['porcentaje_ocupacion'] = (float)$fila['porcentaje_ocupacion'];
        
        $eventos[] = $fila;
    }
    
    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'eventos' => $eventos,
        'total' => count($eventos),
        'filtros_aplicados' => [
            'tipo' => $_GET['tipo'] ?? null,
            'campus_id' => $_GET['campus_id'] ?? null,
            'categoria_deporte' => $_GET['categoria_deporte'] ?? null,
            'tipo_actividad' => $_GET['tipo_actividad'] ?? null,
            'fecha_desde' => $_GET['fecha_desde'] ?? null,
            'fecha_hasta' => $_GET['fecha_hasta'] ?? null
        ]
    ], JSON_UNESCAPED_UNICODE);
    
    // Cerrar statement si existe
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