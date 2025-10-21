<?php
/**
 * Ver Inscripciones - ACTUALIZADO CON VISTA OPTIMIZADA
 * Usa la vista v_inscripciones_completas para mejor rendimiento
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

include '../Back-End-PHP/conexion.php';

try {
    // Query base usando la vista optimizada
    $sql = "SELECT 
                id,
                evento_id,
                evento_nombre,
                fecha_inicio,
                fecha_termino,
                tipo_actividad,
                categoria_deporte,
                campus_nombre,
                participante_matricula,
                nombre_completo,
                nombres,
                apellido_paterno,
                apellido_materno,
                correo_institucional,
                genero,
                tipo_participante,
                carrera_nombre,
                carrera_codigo,
                es_tronco_comun,
                area_tronco_comun,
                facultad_nombre,
                facultad_siglas,
                fecha_inscripcion,
                equipo_id,
                es_capitan
            FROM v_inscripciones_completas";
    
    $whereConditions = [];
    $params = [];
    $types = '';
    
    // ===================================
    // FILTROS DISPONIBLES
    // ===================================
    
    // Filtro por evento
    if (isset($_GET['evento_id']) && !empty($_GET['evento_id'])) {
        $whereConditions[] = "evento_id = ?";
        $params[] = intval($_GET['evento_id']);
        $types .= 'i';
    }
    
    // Filtro por campus
    if (isset($_GET['campus_id']) && !empty($_GET['campus_id'])) {
        $whereConditions[] = "campus_id = ?";
        $params[] = intval($_GET['campus_id']);
        $types .= 'i';
    }
    
    // Filtro por facultad
    if (isset($_GET['facultad_id']) && !empty($_GET['facultad_id'])) {
        $whereConditions[] = "facultad_id = ?";
        $params[] = intval($_GET['facultad_id']);
        $types .= 'i';
    }
    
    // Filtro por carrera
    if (isset($_GET['carrera_id']) && !empty($_GET['carrera_id'])) {
        $whereConditions[] = "carrera_id = ?";
        $params[] = intval($_GET['carrera_id']);
        $types .= 'i';
    }
    
    // Filtro por género
    if (isset($_GET['genero']) && !empty($_GET['genero'])) {
        $whereConditions[] = "genero = ?";
        $params[] = mysqli_real_escape_string($conexion, $_GET['genero']);
        $types .= 's';
    }
    
    // Filtro por tipo de participante
    if (isset($_GET['tipo_participante']) && !empty($_GET['tipo_participante'])) {
        $whereConditions[] = "tipo_participante = ?";
        $params[] = mysqli_real_escape_string($conexion, $_GET['tipo_participante']);
        $types .= 's';
    }
    
    // Filtro por tipo de actividad
    if (isset($_GET['tipo_actividad']) && !empty($_GET['tipo_actividad'])) {
        $whereConditions[] = "tipo_actividad = ?";
        $params[] = mysqli_real_escape_string($conexion, $_GET['tipo_actividad']);
        $types .= 's';
    }
    
    // Filtro por categoría deportiva
    if (isset($_GET['categoria_deporte']) && !empty($_GET['categoria_deporte'])) {
        $whereConditions[] = "categoria_deporte = ?";
        $params[] = mysqli_real_escape_string($conexion, $_GET['categoria_deporte']);
        $types .= 's';
    }
    
    // Filtro por equipo
    if (isset($_GET['equipo_id']) && !empty($_GET['equipo_id'])) {
        $whereConditions[] = "equipo_id = ?";
        $params[] = intval($_GET['equipo_id']);
        $types .= 'i';
    }
    
    // Filtro: solo capitanes
    if (isset($_GET['solo_capitanes']) && $_GET['solo_capitanes'] === '1') {
        $whereConditions[] = "es_capitan = 1";
    }
    
    // Búsqueda por nombre o matrícula
    if (isset($_GET['buscar']) && !empty($_GET['buscar'])) {
        $buscar = mysqli_real_escape_string($conexion, $_GET['buscar']);
        $whereConditions[] = "(nombre_completo LIKE ? OR participante_matricula LIKE ? OR correo_institucional LIKE ?)";
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
        'carrera_nombre'
    ];
    
    if (!in_array($ordenamiento, $ordenamientos_validos)) {
        $ordenamiento = 'fecha_inscripcion';
    }
    
    $sql .= " ORDER BY {$ordenamiento} {$direccion}";
    
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
    // EJECUTAR CONSULTA
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
        // Formatear fechas
        $row['fecha_inscripcion_formato'] = date('d/m/Y H:i', strtotime($row['fecha_inscripcion']));
        $row['fecha_inicio_formato'] = date('d/m/Y', strtotime($row['fecha_inicio']));
        $row['fecha_termino_formato'] = date('d/m/Y', strtotime($row['fecha_termino']));
        
        // Conversiones booleanas
        $row['es_tronco_comun'] = (bool)$row['es_tronco_comun'];
        $row['es_capitan'] = (bool)$row['es_capitan'];
        
        // Formatear carrera (manejar tronco común)
        if ($row['es_tronco_comun']) {
            $row['carrera_display'] = "TC - " . $row['area_tronco_comun'];
        } else {
            $row['carrera_display'] = $row['carrera_nombre'];
        }
        
        $inscripciones[] = $row;
    }
    
    // ===================================
    // CONTAR TOTAL DE REGISTROS
    // ===================================
    
    $sqlCount = "SELECT COUNT(*) as total FROM v_inscripciones_completas";
    
    if (!empty($whereConditions)) {
        $sqlCount .= " WHERE " . implode(" AND ", $whereConditions);
    }
    
    // Ejecutar conteo (sin límite ni offset)
    $paramsCount = array_slice($params, 0, count($params) - 2); // Quitar limite y offset
    $typesCount = substr($types, 0, -2); // Quitar tipos de limite y offset
    
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
    // ESTADÍSTICAS ADICIONALES
    // ===================================
    
    $estadisticas = [
        'total_inscripciones' => $totalRegistros,
        'pagina_actual' => $pagina,
        'registros_por_pagina' => $limite,
        'total_paginas' => $limite > 0 ? ceil($totalRegistros / $limite) : 1,
        'mostrando' => count($inscripciones)
    ];
    
    // Estadísticas por género
    $sqlGenero = "SELECT genero, COUNT(*) as total 
                  FROM v_inscripciones_completas";
    if (!empty($whereConditions)) {
        $sqlGenero .= " WHERE " . implode(" AND ", $whereConditions);
    }
    $sqlGenero .= " GROUP BY genero";
    
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
    
    if (isset($stmt)) {
        mysqli_stmt_close($stmt);
    }
    if (isset($stmtGenero)) {
        mysqli_stmt_close($stmtGenero);
    }
    
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