<?php
/**
 * Ver Inscripciones - CORREGIDO
 * Usa la vista v_inscripciones_completas unida a la tabla evento para filtrar por periodo
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

include '../includes/conexion.php';

try {
    // Añadimos alias 'v' a la vista y la unimos con la tabla evento 'e' para obtener el periodo
    $sql = "SELECT 
                v.id,
                v.evento_id,
                v.evento_nombre,
                v.fecha_inicio,
                v.fecha_termino,
                v.tipo_actividad,
                v.categoria_deporte,
                v.campus_nombre,
                v.participante_matricula,
                v.nombre_completo,
                v.nombres,
                v.apellido_paterno,
                v.apellido_materno,
                v.correo_institucional,
                v.genero,
                v.tipo_participante,
                v.carrera_nombre,
                v.carrera_codigo,
                v.es_tronco_comun,
                v.area_tronco_comun,
                v.facultad_nombre,
                v.facultad_siglas,
                v.fecha_inscripcion,
                v.equipo_id,
                v.es_capitan,
                v.tipo_registro,  
                v.nombre_equipo,
                e.periodo
            FROM v_inscripciones_completas v
            INNER JOIN evento e ON v.evento_id = e.id";
    
    $whereConditions = [];
    $params = [];
    $types = '';
    
    // ===================================
    // FILTROS DISPONIBLES (Con prefijos v. y e. para evitar ambigüedad)
    // ===================================
    
    // Filtro por evento
    if (isset($_GET['evento_id']) && !empty($_GET['evento_id'])) {
        $whereConditions[] = "v.evento_id = ?";
        $params[] = intval($_GET['evento_id']);
        $types .= 'i';
    }

    // Filtro por periodo (Este era el que causaba el error)
    if (isset($_GET['periodo']) && !empty($_GET['periodo']) && $_GET['periodo'] !== 'Todos') {
        $whereConditions[] = "e.periodo = ?"; 
        $params[] = mysqli_real_escape_string($conexion, $_GET['periodo']);
        $types .= 's';
    }
    
    // Filtro por campus
    if (isset($_GET['campus_id']) && !empty($_GET['campus_id'])) {
        // Asumiendo que la vista tiene la columna campus_id oculta, si no, filtramos por e.campus_id
        $whereConditions[] = "e.campus_id = ?";
        $params[] = intval($_GET['campus_id']);
        $types .= 'i';
    }
    
    // Filtro por facultad
    if (isset($_GET['facultad_id']) && !empty($_GET['facultad_id'])) {
        $whereConditions[] = "v.facultad_id = ?";
        $params[] = intval($_GET['facultad_id']);
        $types .= 'i';
    }
    
    // Filtro por carrera
    if (isset($_GET['carrera_id']) && !empty($_GET['carrera_id'])) {
        $whereConditions[] = "v.carrera_id = ?";
        $params[] = intval($_GET['carrera_id']);
        $types .= 'i';
    }
    
    // Filtro por género
    if (isset($_GET['genero']) && !empty($_GET['genero'])) {
        $whereConditions[] = "v.genero = ?";
        $params[] = mysqli_real_escape_string($conexion, $_GET['genero']);
        $types .= 's';
    }
    
    // Filtro por tipo de participante
    if (isset($_GET['tipo_participante']) && !empty($_GET['tipo_participante'])) {
        $whereConditions[] = "v.tipo_participante = ?";
        $params[] = mysqli_real_escape_string($conexion, $_GET['tipo_participante']);
        $types .= 's';
    }
    
    // Filtro por tipo de actividad
    if (isset($_GET['tipo_actividad']) && !empty($_GET['tipo_actividad'])) {
        $whereConditions[] = "v.tipo_actividad = ?";
        $params[] = mysqli_real_escape_string($conexion, $_GET['tipo_actividad']);
        $types .= 's';
    }
    
    // Filtro por categoría deportiva
    if (isset($_GET['categoria_deporte']) && !empty($_GET['categoria_deporte'])) {
        $whereConditions[] = "v.categoria_deporte = ?";
        $params[] = mysqli_real_escape_string($conexion, $_GET['categoria_deporte']);
        $types .= 's';
    }
    
    // Filtro por equipo
    if (isset($_GET['equipo_id']) && !empty($_GET['equipo_id'])) {
        $whereConditions[] = "v.equipo_id = ?";
        $params[] = intval($_GET['equipo_id']);
        $types .= 'i';
    }
    
    // Filtro: solo capitanes
    if (isset($_GET['solo_capitanes']) && $_GET['solo_capitanes'] === '1') {
        $whereConditions[] = "v.es_capitan = 1";
    }
    
    // Búsqueda por nombre o matrícula
    if (isset($_GET['buscar']) && !empty($_GET['buscar'])) {
        $buscar = mysqli_real_escape_string($conexion, $_GET['buscar']);
        $whereConditions[] = "(v.nombre_completo LIKE ? OR v.participante_matricula LIKE ? OR v.correo_institucional LIKE ?)";
        $params[] = "%{$buscar}%";
        $params[] = "%{$buscar}%";
        $params[] = "%{$buscar}%";
        $types .= 'sss';
    }
    
    // Construir WHERE clause
    if (!empty($whereConditions)) {
        $sql .= " WHERE " . implode(" AND ", $whereConditions);
    }
    
    // Ordenamiento
    $ordenamiento = isset($_GET['orden']) ? $_GET['orden'] : 'fecha_inscripcion';
    $direccion = isset($_GET['direccion']) && $_GET['direccion'] === 'ASC' ? 'ASC' : 'DESC';
    
    $ordenamientos_validos = [
        'fecha_inscripcion', 
        'nombre_completo', 
        'evento_nombre', 
        'participante_matricula',
        'facultad_nombre',
        'carrera_nombre',
        'correo_institucional',
        'genero',            
        'tipo_participante'
    ];
    
    if (!in_array($ordenamiento, $ordenamientos_validos)) {
        $ordenamiento = 'fecha_inscripcion';
    }
    
    // Añadimos el alias 'v.' para evitar ambigüedades en el ORDER BY
    $sql .= " ORDER BY v.{$ordenamiento} {$direccion}";
    
    // Paginación
    $limite = isset($_GET['limite']) ? intval($_GET['limite']) : 50;
    $pagina = isset($_GET['pagina']) ? intval($_GET['pagina']) : 1;
    $offset = ($pagina - 1) * $limite;
    
    if ($limite > 0) {
        $sql .= " LIMIT ? OFFSET ?";
        $params[] = $limite;
        $params[] = $offset;
        $types .= 'ii';
    }
    
    // ===================================
    // EJECUTAR CONSULTA PRINCIPAL
    // ===================================
    
    if (!empty($params)) {
        $stmt = mysqli_prepare($conexion, $sql);
        mysqli_stmt_bind_param($stmt, $types, ...$params);
        mysqli_stmt_execute($stmt);
        $resultado = mysqli_stmt_get_result($stmt);
    } else {
        $resultado = mysqli_query($conexion, $sql);
    }
    
    if (!$resultado) {
        throw new Exception('Error en la consulta: ' . mysqli_error($conexion));
    }
    
    // ===================================
    // PROCESAR RESULTADOS
    // ===================================
    
    $inscripciones = [];
    while ($row = mysqli_fetch_assoc($resultado)) {
        $row['fecha_inscripcion_formato'] = date('d/m/Y H:i', strtotime($row['fecha_inscripcion']));
        $row['fecha_inicio_formato'] = date('d/m/Y', strtotime($row['fecha_inicio']));
        $row['fecha_termino_formato'] = date('d/m/Y', strtotime($row['fecha_termino']));
        
        $row['es_tronco_comun'] = (bool)$row['es_tronco_comun'];
        $row['es_capitan'] = (bool)$row['es_capitan'];
        
        if ($row['es_tronco_comun']) {
            $row['carrera_display'] = "TC - " . $row['area_tronco_comun'];
        } else {
            $row['carrera_display'] = $row['carrera_nombre'];
        }
        
        $inscripciones[] = $row;
    }
    
    // ===================================
    // CONTAR TOTAL DE REGISTROS (También con JOIN)
    // ===================================
    
    $sqlCount = "SELECT COUNT(*) as total FROM v_inscripciones_completas v INNER JOIN evento e ON v.evento_id = e.id";
    
    if (!empty($whereConditions)) {
        $sqlCount .= " WHERE " . implode(" AND ", $whereConditions);
    }
    
    $paramsCount = array_slice($params, 0, count($params) - 2);
    $typesCount = substr($types, 0, -2);
    
    if (!empty($paramsCount)) {
        $stmtCount = mysqli_prepare($conexion, $sqlCount);
        mysqli_stmt_bind_param($stmtCount, $typesCount, ...$paramsCount);
        mysqli_stmt_execute($stmtCount);
        $resultadoCount = mysqli_stmt_get_result($stmtCount);
        $totalRegistros = mysqli_fetch_assoc($resultadoCount)['total'];
        mysqli_stmt_close($stmtCount);
    } else {
        $resultadoCount = mysqli_query($conexion, $sqlCount);
        $totalRegistros = mysqli_fetch_assoc($resultadoCount)['total'];
    }
    
    // ===================================
    // ESTADÍSTICAS ADICIONALES (También con JOIN)
    // ===================================
    
    $estadisticas = [
        'total_inscripciones' => $totalRegistros,
        'pagina_actual' => $pagina,
        'registros_por_pagina' => $limite,
        'total_paginas' => $limite > 0 ? ceil($totalRegistros / $limite) : 1,
        'mostrando' => count($inscripciones)
    ];
    
    $sqlGenero = "SELECT v.genero, COUNT(*) as total FROM v_inscripciones_completas v INNER JOIN evento e ON v.evento_id = e.id";
    if (!empty($whereConditions)) {
        $sqlGenero .= " WHERE " . implode(" AND ", $whereConditions);
    }
    $sqlGenero .= " GROUP BY v.genero";
    
    if (!empty($paramsCount)) {
        $stmtGenero = mysqli_prepare($conexion, $sqlGenero);
        mysqli_stmt_bind_param($stmtGenero, $typesCount, ...$paramsCount);
        mysqli_stmt_execute($stmtGenero);
        $resultadoGenero = mysqli_stmt_get_result($stmtGenero);
    } else {
        $resultadoGenero = mysqli_query($conexion, $sqlGenero);
    }
    
    $estadisticas['por_genero'] = [];
    while ($row = mysqli_fetch_assoc($resultadoGenero)) {
        $estadisticas['por_genero'][$row['genero']] = $row['total'];
    }
    
    // ===================================
    // RESPUESTA
    // ===================================
    
    echo json_encode([
        'success' => true,
        'inscripciones' => $inscripciones,
        'estadisticas' => $estadisticas
    ], JSON_UNESCAPED_UNICODE);
    
    if (isset($stmt)) mysqli_stmt_close($stmt);
    if (isset($stmtGenero)) mysqli_stmt_close($stmtGenero);
    
} catch(Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => true,
        'mensaje' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

mysqli_close($conexion);
?>