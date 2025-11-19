<?php
/**
 * Obtener Eventos - ACTUALIZADO Y CORREGIDO
 */

// Desactivar la visualización de errores en pantalla para no romper el JSON
error_reporting(E_ALL);
ini_set('display_errors', 0); 

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

include '../includes/conexion.php';

try {
    // 1. INICIALIZAR VARIABLES (Importante hacerlo al principio)
    $filtros = [];
    $tipos_params = '';
    $valores_params = [];

    // 2. OBTENER EL PERIODO ACTIVO (Dentro del try para capturar errores)
    // Verificamos si existe la tabla o datos para evitar warnings
    $periodoActivo = '';
    $sqlPeriodo = "SELECT nombre FROM periodos WHERE activo = 1 LIMIT 1";
    
    // Usamos @ para suprimir error si la tabla no existe aún
    $resPeriodo = @mysqli_query($conexion, $sqlPeriodo); 
    
    if ($resPeriodo && $row = mysqli_fetch_assoc($resPeriodo)) {
        $periodoActivo = $row['nombre'];
    }

    // 3. LÓGICA PARA MODO USUARIO (Alumnos)
    $modoUsuario = isset($_GET['modo']) && $_GET['modo'] === 'usuario';

    if ($modoUsuario) {
        // A) Solo mostrar eventos del periodo activo (Si hay uno definido)
        if (!empty($periodoActivo)) {
            $filtros[] = "e.periodo = ?";
            $tipos_params .= 's';
            $valores_params[] = $periodoActivo;
        }

        // B) Ocultar eventos llenos
        $filtros[] = "(e.cupo_maximo IS NULL OR e.cupo_maximo = 0 OR e.registros_actuales < e.cupo_maximo)";
    }

    // 4. FILTROS ESTÁNDAR (Admin y Usuario)
    
    // Filtro por tipo (Legacy)
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
    
    // Filtro por tipo de registro
    if (isset($_GET['tipo_registro']) && !empty($_GET['tipo_registro'])) {
        $filtros[] = "e.tipo_registro = ?";
        $tipos_params .= 's';
        $valores_params[] = $_GET['tipo_registro'];
    }

    // Filtro de exclusión
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
    
    // Filtro por activos (Default: true)
    $soloActivos = isset($_GET['activos']) ? $_GET['activos'] === 'true' : true;
    if ($soloActivos) {
        $filtros[] = "e.activo = TRUE";
    }
    
    // 5. CONSTRUCCIÓN DE QUERY
    $whereClause = '';
    if (count($filtros) > 0) {
        $whereClause = ' WHERE ' . implode(' AND ', $filtros);
    }
    
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
                e.registros_actuales,
                e.codigo_qr,
                e.activo,
                a.nombre AS actividad,
                c.nombre AS campus_nombre,
                c.codigo AS campus_codigo,
                u.nombre AS promotor_nombre,
                GROUP_CONCAT(DISTINCT f.siglas ORDER BY f.siglas SEPARATOR ', ') AS facultades_siglas,
                GROUP_CONCAT(DISTINCT f.id ORDER BY f.id SEPARATOR ',') AS facultades_ids,
                GROUP_CONCAT(DISTINCT f.nombre ORDER BY f.nombre SEPARATOR ', ') AS facultades_nombres,
                CASE 
                    WHEN e.cupo_maximo > 0 THEN 
                        CASE WHEN e.registros_actuales < e.cupo_maximo THEN 1 ELSE 0 END
                    ELSE 1
                END AS tiene_cupo,
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
            GROUP BY e.id, e.nombre, e.descripcion, e.fecha_inicio, e.fecha_termino,e.periodo,
                     e.lugar, e.tipo_registro, e.categoria_deporte, e.tipo_actividad,
                     e.ubicacion_tipo, e.cupo_maximo, e.integrantes_min, e.integrantes_max, e.registros_actuales, e.codigo_qr,
                     e.activo, a.nombre, c.nombre, c.codigo, u.nombre
            ORDER BY e.fecha_inicio DESC";
    
    // 6. EJECUCIÓN
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
        // Formatear fechas y lógica de estado
        $fila['fecha_inicio_formato'] = date('d/m/Y', strtotime($fila['fecha_inicio']));
        $fila['fecha_termino_formato'] = date('d/m/Y', strtotime($fila['fecha_termino']));
        
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
        'total' => count($eventos),
        // Debug info opcional
        'filtros_debug' => [
            'modo_usuario' => $modoUsuario,
            'periodo_detectado' => $periodoActivo
        ]
    ], JSON_UNESCAPED_UNICODE);
    
    if (isset($stmt)) {
        mysqli_stmt_close($stmt);
    }
    
} catch (Exception $e) {
    // Si hay error, devolvemos JSON válido con el mensaje, no HTML
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'mensaje' => 'Error del servidor',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

mysqli_close($conexion);
?>