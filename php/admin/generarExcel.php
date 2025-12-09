<?php
/**
 * Generar Reporte Excel de Inscripciones
 * Versión con colores verde deportivo
 * Adaptable para reporte general o por evento específico
 */

require_once('../../vendor/autoload.php');
include '../includes/conexion.php';

/**
 * Función para obtener el nombre de una entidad (Carrera, Facultad, Campus) dado su ID.
 * @param mysqli $conexion La conexión a la base de datos.
 * @param string $tabla Nombre de la tabla (ej: 'carrera', 'facultad', 'campus').
 * @param string $valor Valor del filtro (ID o Nombre).
 * @return string Nombre o el valor original si no es ID o no se encuentra.
 */
function obtenerNombrePorFiltro($conexion, $tabla, $valor) {
    if (is_numeric($valor) && intval($valor) > 0) {
        $id = intval($valor);
        
        // Determinar la columna a buscar
        $columna_nombre = ($tabla === 'carrera' || $tabla === 'facultad' || $tabla === 'campus') ? 'nombre' : 'nombre';

        $sql = "SELECT $columna_nombre FROM $tabla WHERE id = ?";
        $stmt = mysqli_prepare($conexion, $sql);
        
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, 'i', $id);
            mysqli_stmt_execute($stmt);
            $resultado = mysqli_stmt_get_result($stmt);
            
            if ($row = mysqli_fetch_assoc($resultado)) {
                mysqli_stmt_close($stmt);
                return $row[$columna_nombre];
            }
            mysqli_stmt_close($stmt);
        }
    }
    // Si no es un ID o no se encuentra, devuelve el valor original
    return $valor;
}

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Settings;

// --- IMPORTANTE: Clases para el Caché (Solo funcionan si instalaste symfony/cache) ---
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Symfony\Component\Cache\Psr16Cache;

try {
    // ===============================================
    // SOLUCIONES PARA GRANDES VOLÚMENES DE DATOS (NUEVO)
    // ===============================================
    // 1. Aumentar el límite de memoria de PHP (Recomendado para prevenir "Allowed memory size...")
    // Se establece a 1024MB (1GB) para manejar miles de registros.
    ini_set('memory_limit', '1024M'); 
    
    // 2. ACTIVAR CACHÉ EN DISCO (Reemplazo moderno de setCacheEnabled)
    // Esto verifica si instalaste la librería "symfony/cache".
    // Si la tienes, guarda los datos temporales en disco para no saturar la RAM.
    if (class_exists('Symfony\Component\Cache\Adapter\FilesystemAdapter')) {
        $pool = new FilesystemAdapter();
        $simpleCache = new Psr16Cache($pool);
        Settings::setCache($simpleCache);
    }
    // Si no la tienes instalada, usará la memoria RAM (que ya aumentamos a 1GB), 
    // lo cual suele ser suficiente para la mayoría de los casos.
    
    // ===================================
    // DETECTAR SI ES REPORTE DE UN EVENTO ESPECÍFICO
    // ===================================
    $esReporteEvento = isset($_GET['evento_id']) && !empty($_GET['evento_id']) && $_GET['evento_id'] !== 'todos';

    // ===================================
    // CAPTURAR FILTROS
    // ===================================
    
    $sql = "SELECT 
                id,
                evento_id,
                evento_nombre,
                participante_matricula,
                nombre_completo,
                correo_institucional,
                genero,
                tipo_participante,
                carrera_nombre,
                es_tronco_comun,
                area_tronco_comun,
                facultad_nombre,
                campus_nombre,
                fecha_inscripcion,
                equipo_id,
                es_capitan
            FROM v_inscripciones_completas";
    
    $whereConditions = [];
    $params = [];
    $types = '';
    $nombreEvento = ''; // Para almacenar el nombre del evento
    
    // Filtro por evento (siempre se aplica si viene)
    if ($esReporteEvento) {
        if (is_numeric($_GET['evento_id'])) {
            $whereConditions[] = "evento_id = ?";
            $params[] = intval($_GET['evento_id']);
            $types .= 'i';
        } else {
            $whereConditions[] = "evento_nombre = ?";
            $params[] = mysqli_real_escape_string($conexion, $_GET['evento_id']);
            $types .= 's';
        }
    }

    // Filtro por género
    if (isset($_GET['genero']) && !empty($_GET['genero']) && $_GET['genero'] !== 'todos') {
        $whereConditions[] = "genero = ?";
        $params[] = mysqli_real_escape_string($conexion, $_GET['genero']);
        $types .= 's';
    }
        
    // Filtro por tipo de participante
    if (isset($_GET['tipo_participante']) && !empty($_GET['tipo_participante']) && $_GET['tipo_participante'] !== 'todos') {
        $whereConditions[] = "tipo_participante = ?";
        $params[] = mysqli_real_escape_string($conexion, $_GET['tipo_participante']);
        $types .= 's';
    }

    // Filtro por carrera
    if (isset($_GET['carrera']) && !empty($_GET['carrera']) && $_GET['carrera'] !== 'todas') {
        $carrera_filtro = mysqli_real_escape_string($conexion, $_GET['carrera']);
        // FIX/MEJORA: Comprueba si es un ID numérico para filtrar por ID, sino filtra por nombre
        if (is_numeric($carrera_filtro) && intval($carrera_filtro) > 0) {
            $whereConditions[] = "carrera_id = ?";
            $params[] = intval($carrera_filtro);
            $types .= 'i';
        } else {
            // Lógica original para filtrar por nombre o Tronco Común
            $whereConditions[] = "(carrera_nombre = ? OR CONCAT('TC - ', area_tronco_comun) = ?)";
            $params[] = $carrera_filtro;
            $params[] = $carrera_filtro;
            $types .= 'ss';
        }
    }
    
    // INICIO DE MODIFICACIÓN: Agregar filtros de Facultad y Campus
    // Filtro por Facultad
    if (isset($_GET['facultad']) && !empty($_GET['facultad']) && $_GET['facultad'] !== 'todas') {
        $facultad_filtro = mysqli_real_escape_string($conexion, $_GET['facultad']);
        if (is_numeric($facultad_filtro) && intval($facultad_filtro) > 0) {
            $whereConditions[] = "facultad_id = ?";
            $params[] = intval($facultad_filtro);
            $types .= 'i';
        } else {
            $whereConditions[] = "facultad_nombre = ?";
            $params[] = $facultad_filtro;
            $types .= 's';
        }
    }

    // Filtro por Campus
    if (isset($_GET['campus']) && !empty($_GET['campus']) && $_GET['campus'] !== 'todos') {
        $campus_filtro = mysqli_real_escape_string($conexion, $_GET['campus']);
        if (is_numeric($campus_filtro) && intval($campus_filtro) > 0) {
            $whereConditions[] = "campus_id = ?";
            $params[] = intval($campus_filtro);
            $types .= 'i';
        } else {
            $whereConditions[] = "campus_nombre = ?";
            $params[] = $campus_filtro;
            $types .= 's';
        }
    }
    // FIN DE MODIFICACIÓN
        
    // Búsqueda
    if (isset($_GET['buscar']) && !empty($_GET['buscar'])) {
        $buscar = mysqli_real_escape_string($conexion, $_GET['buscar']);
        $whereConditions[] = "(nombre_completo LIKE ? OR participante_matricula LIKE ? OR correo_institucional LIKE ?)";
        $params[] = "%{$buscar}%";
        $params[] = "%{$buscar}%";
        $params[] = "%{$buscar}%";
        $types .= 'sss';
    }

    
    // Construir WHERE
    if (!empty($whereConditions)) {
        $sql .= " WHERE " . implode(" AND ", $whereConditions);
    }
    
    // Ordenamiento: Por evento, por equipo, CAPITÁN PRIMERO, y alfabético por nombre
    $sql .= " ORDER BY evento_id ASC, equipo_id ASC, es_capitan DESC, nombre_completo ASC";
    
    // ===================================
    // EJECUTAR CONSULTA
    // ===================================
    
    if (!empty($params)) {
        $stmt = mysqli_prepare($conexion, $sql);
        if (!$stmt) {
            throw new Exception('Error al preparar consulta: ' . mysqli_error($conexion));
        }
        mysqli_stmt_bind_param($stmt, $types, ...$params);
        mysqli_stmt_execute($stmt);
        $resultado = mysqli_stmt_get_result($stmt);
    } else {
        $resultado = mysqli_query($conexion, $sql);
    }
    
    if (!$resultado) {
        throw new Exception('Error en la consulta: ' . mysqli_error($conexion));
    }
    
    // Procesar datos
    $datos = [];
    $total_hombres = 0;
    $total_mujeres = 0;
    $total_otros = 0; 
    
    while ($row = mysqli_fetch_assoc($resultado)) {
        // Formatear carrera
        if ($row['es_tronco_comun']) {
            $row['carrera_display'] = "TC - " . $row['area_tronco_comun'];
        } else {
            $row['carrera_display'] = $row['carrera_nombre'];
        }
        
        // Capturar el nombre del evento (todos serán iguales si es reporte de evento)
        if ($esReporteEvento && empty($nombreEvento)) {
            $nombreEvento = $row['evento_nombre'];
        }
        
        $datos[] = $row;
        
        // Conteo de estadísticas
        if ($row['genero'] === 'Masculino' || $row['genero'] === 'Hombre') {
            $total_hombres++;
        } else if ($row['genero'] === 'Femenino' || $row['genero'] === 'Mujer') {
            $total_mujeres++;
        } else if ($row['genero'] === 'Prefiero no decirlo') { 
            $total_otros++;
        }
    }
    
    // ===================================
    // NUEVA LÓGICA: REPORTE POR EQUIPO (para torneos)
    // ===================================
    $esEventoPorEquipos = false;
    $reporte_equipo = [];
    
    // Determinar si es reporte de evento Y el primer registro es de equipo
    if ($esReporteEvento && count($datos) > 0 && !is_null($datos[0]['equipo_id'])) {
        $esEventoPorEquipos = true;
    }

    if ($esEventoPorEquipos) {
        $ids_equipo = [];
        foreach ($datos as $row) {
            if ($row['equipo_id']) {
                $ids_equipo[] = $row['equipo_id'];
            }
        }
        $ids_equipo = array_unique($ids_equipo);
        $equipo_names = [];
        
        // Consultar nombres de equipos
        if (!empty($ids_equipo)) {
            $sqlEquipos = "SELECT id, nombre FROM equipo WHERE id IN (" . implode(',', array_fill(0, count($ids_equipo), '?')) . ")";
            $stmtEquipos = mysqli_prepare($conexion, $sqlEquipos);
            
            $typesEquipos = str_repeat('i', count($ids_equipo)); 
            mysqli_stmt_bind_param($stmtEquipos, $typesEquipos, ...$ids_equipo);
            
            mysqli_stmt_execute($stmtEquipos);
            $resultadoEquipos = mysqli_stmt_get_result($stmtEquipos);
            
            while ($eqRow = mysqli_fetch_assoc($resultadoEquipos)) {
                $equipo_names[$eqRow['id']] = $eqRow['nombre'];
            }
            mysqli_stmt_close($stmtEquipos);
        }

        // Agrupar participantes por equipo
        foreach ($datos as $row) {
            $equipo_id = $row['equipo_id'];
            if (!$equipo_id) continue;
            
            $nombre_equipo = $equipo_names[$equipo_id] ?? 'Equipo sin nombre';
            
            if (!isset($reporte_equipo[$equipo_id])) {
                $reporte_equipo[$equipo_id] = [
                    'nombre' => $nombre_equipo,
                    'integrantes' => []
                ];
            }
            
            $reporte_equipo[$equipo_id]['integrantes'][] = $row;
        }
    }
    
    // ===================================
    // COLORES VERDE DEPORTIVO
    // ===================================
    $verde_principal = '009600';   // Verde fuerte
    $verde_secundario = '4CAF50';  // Verde material suave
    $verde_oscuro = '388E3C';      // Verde oscuro elegante
    $verde_claro = 'E8F5E9';       // Verde muy claro pastel
    
    // ===================================
    // CREAR EXCEL
    // ===================================
    
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle($esReporteEvento ? 'Participantes' : 'Inscripciones');
    
    // ===================================
    // TÍTULO PRINCIPAL (cambia según tipo de reporte)
    // ===================================
    if ($esReporteEvento) {
        $sheet->setCellValue('A1', 'CENTRO DEPORTIVO - PARTICIPANTES DEL EVENTO');
        $sheet->mergeCells('A1:G1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('A1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_principal);
        $sheet->getStyle('A1')->getFont()->getColor()->setARGB('FFFFFFFF');
        $sheet->getRowDimension(1)->setRowHeight(30);
        
        // Nombre del evento
        $sheet->setCellValue('A2', $nombreEvento);
        $sheet->mergeCells('A2:G2');
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('A2')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_claro);
        $sheet->getStyle('A2')->getFont()->getColor()->setARGB('FF' . $verde_principal);
        $sheet->getRowDimension(2)->setRowHeight(25);
        
        $filaActual = 4; // Comenzar después del título y nombre del evento
        $maxColTabla = $esEventoPorEquipos ? 'G' : 'G';
    } else {
        $sheet->setCellValue('A1', 'CENTRO DEPORTIVO - REPORTE DE INSCRIPCIONES A EVENTOS');
        $sheet->mergeCells('A1:H1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('A1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_principal);
        $sheet->getStyle('A1')->getFont()->getColor()->setARGB('FFFFFFFF');
        $sheet->getRowDimension(1)->setRowHeight(30);
        
        $filaActual = 3; // Comenzar después del título
        $maxColTabla = 'H';
    }
    
    // ===================================
    // FILTROS APLICADOS (solo si NO es reporte de evento)
    // ===================================
    if (!$esReporteEvento) {
        $sheet->setCellValue('A' . $filaActual, 'FILTROS APLICADOS:');
        $sheet->getStyle('A' . $filaActual)->getFont()->setBold(true);
        $sheet->mergeCells('A' . $filaActual . ':H' . $filaActual);
        $sheet->getStyle('A' . $filaActual)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_claro);
        
        $filaActual++;
        $filtrosTexto = '';
        if (isset($_GET['buscar']) && !empty($_GET['buscar'])) {
            $filtrosTexto .= "Búsqueda: " . $_GET['buscar'] . " | ";
        }
        $filtrosTexto .= "Género: " . (isset($_GET['genero']) && $_GET['genero'] !== 'todos' ? $_GET['genero'] : 'Todos') . " | ";
        $filtrosTexto .= "Tipo: " . (isset($_GET['tipo_participante']) && $_GET['tipo_participante'] !== 'todos' ? $_GET['tipo_participante'] : 'Todos');
        
        if (isset($_GET['carrera']) && $_GET['carrera'] !== 'todas') {
            // CORRECCIÓN: Obtener el nombre de la carrera si es un ID
            $nombreCarrera = obtenerNombrePorFiltro($conexion, 'carrera', $_GET['carrera']);
            $filtrosTexto .= " | Carrera: " . $nombreCarrera;
        } else {
            $filtrosTexto .= " | Carrera: Todas";
        }
        
        // INICIO DE MODIFICACIÓN: Agregar Facultad y Campus con mapeo a nombre
        if (isset($_GET['facultad']) && $_GET['facultad'] !== 'todas') {
            $nombreFacultad = obtenerNombrePorFiltro($conexion, 'facultad', $_GET['facultad']);
            $filtrosTexto .= " | Facultad: " . $nombreFacultad;
        } else {
            $filtrosTexto .= " | Facultad: Todas";
        }

        if (isset($_GET['campus']) && $_GET['campus'] !== 'todos') {
            $nombreCampus = obtenerNombrePorFiltro($conexion, 'campus', $_GET['campus']);
            $filtrosTexto .= " | Campus: " . $nombreCampus;
        } else {
            $filtrosTexto .= " | Campus: Todos";
        }
        
        $sheet->setCellValue('A' . $filaActual, $filtrosTexto);
        $sheet->mergeCells('A' . $filaActual . ':' . $maxColTabla . $filaActual);
        
        $filaActual += 2; // Espacio después de filtros
    }
    
    // ===================================
    // ESTADÍSTICAS
    // ===================================
    $filaStats = $filaActual;
    $maxColStats = 'E'; // 5 columnas
    
    $sheet->setCellValue('A' . $filaStats, 'Total Participantes');
    $sheet->setCellValue('B' . $filaStats, 'Hombres');
    $sheet->setCellValue('C' . $filaStats, 'Mujeres');
    $sheet->setCellValue('D' . $filaStats, 'Otros'); // NUEVO
    $sheet->setCellValue('E' . $filaStats, 'Mostrando');
    
    $sheet->getStyle('A' . $filaStats . ':' . $maxColStats . $filaStats)->getFont()->setBold(true);
    $sheet->getStyle('A' . $filaStats . ':' . $maxColStats . $filaStats)->getFill()
        ->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_principal);
    $sheet->getStyle('A' . $filaStats . ':' . $maxColStats . $filaStats)->getFont()->getColor()->setARGB('FFFFFFFF');
    $sheet->getStyle('A' . $filaStats . ':' . $maxColStats . $filaStats)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    
    // Bordes estadísticas
    $sheet->getStyle('A' . $filaStats . ':' . $maxColStats . $filaStats)->getBorders()->getAllBorders()
        ->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('FF' . $verde_oscuro);
    
    $filaStats++;
    $sheet->setCellValue('A' . $filaStats, count($datos));
    $sheet->setCellValue('B' . $filaStats, $total_hombres);
    $sheet->setCellValue('C' . $filaStats, $total_mujeres);
    $sheet->setCellValue('D' . $filaStats, $total_otros); // NUEVO VALOR
    $sheet->setCellValue('E' . $filaStats, count($datos));
    $sheet->getStyle('A' . $filaStats . ':' . $maxColStats . $filaStats)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    $sheet->getStyle('A' . $filaStats . ':' . $maxColStats . $filaStats)->getFont()->setBold(true);
    $sheet->getStyle('A' . $filaStats . ':' . $maxColStats . $filaStats)->getFill()
        ->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFFFFF');
    
    // Bordes datos estadísticas
    $sheet->getStyle('A' . $filaStats . ':' . $maxColStats . $filaStats)->getBorders()->getAllBorders()
        ->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('FF' . $verde_oscuro);
    
    // ===================================
    // ENCABEZADOS DE TABLA
    // ===================================
    $filaEncabezado = $filaStats + 2;
    $filaActual = $filaEncabezado;
    
    // Headers definition
    if ($esEventoPorEquipos) {
        // 7 columns: A-G
        $teamMemberHeaders = ['Matrícula', 'Nombre Completo', 'Rol', 'Correo', 'Género', 'Tipo', 'Carrera/Facultad'];
        $teamMemberColumns = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        $maxColTablaTeam = 'G';
        
        // Start from $filaEncabezado but only apply headers inside the loop.
    } elseif ($esReporteEvento) {
        // Individual event: 7 columns (A-G)
        $encabezados = ['Matrícula', 'Nombre Completo', 'Correo', 'Género', 'Tipo', 'Carrera/Facultad', 'Fecha Inscripción'];
        $columnas = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        $maxColTabla = 'G';
        
        foreach ($encabezados as $index => $encabezado) {
            $celda = $columnas[$index] . $filaEncabezado;
            $sheet->setCellValue($celda, $encabezado);
            $sheet->getStyle($celda)->getFont()->setBold(true);
            $sheet->getStyle($celda)->getFill()
                ->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_oscuro);
            $sheet->getStyle($celda)->getFont()->getColor()->setARGB('FFFFFFFF');
            $sheet->getStyle($celda)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }
        $filaActual++;
    } else {
        // General report: 8 columns (A-H)
        $encabezados = ['Matrícula', 'Nombre Completo', 'Correo', 'Género', 'Tipo', 'Carrera/Facultad', 'Evento', 'Fecha Inscripción'];
        $columnas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        $maxColTabla = 'H';
        
        foreach ($encabezados as $index => $encabezado) {
            $celda = $columnas[$index] . $filaEncabezado;
            $sheet->setCellValue($celda, $encabezado);
            $sheet->getStyle($celda)->getFont()->setBold(true);
            $sheet->getStyle($celda)->getFill()
                ->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_oscuro);
            $sheet->getStyle($celda)->getFont()->getColor()->setARGB('FFFFFFFF');
            $sheet->getStyle($celda)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }
        $filaActual++;
    }
    
    // ===================================
    // DATOS (Diferenciación por Equipo o Individual)
    // ===================================
    
    if ($esEventoPorEquipos) {
        // === REPORTE POR EQUIPO ===
        $fill = false;
        $teamCounter = 1; // Para enumeración
        foreach ($reporte_equipo as $equipo) {
            // 1. Team Name Row (Centered and Enumerated)
            $sheet->setCellValue('A' . $filaActual, 'EQUIPO ' . $teamCounter . ': ' . $equipo['nombre']);
            $sheet->mergeCells('A' . $filaActual . ':' . $maxColTablaTeam . $filaActual); // Use maxColTablaTeam = G
            $sheet->getStyle('A' . $filaActual)->getFont()->setBold(true)->getColor()->setARGB('FF' . $verde_principal);
            $sheet->getStyle('A' . $filaActual)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER); // Centered
            $sheet->getStyle('A' . $filaActual)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_claro);
            $sheet->getStyle('A' . $filaActual . ':' . $maxColTablaTeam . $filaActual)->getBorders()->getAllBorders()
                ->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('FF' . $verde_oscuro);
            $filaActual++;
            
            // 2. Team Member Headers (Drawn before members)
            $filaHeadersEquipo = $filaActual;
            foreach ($teamMemberHeaders as $index => $encabezado) {
                $celda = $teamMemberColumns[$index] . $filaHeadersEquipo;
                $sheet->setCellValue($celda, $encabezado);
                $sheet->getStyle($celda)->getFont()->setBold(true);
                $sheet->getStyle($celda)->getFill()
                    ->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_oscuro);
                $sheet->getStyle($celda)->getFont()->getColor()->setARGB('FFFFFFFF');
                $sheet->getStyle($celda)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            }
            $filaActual++; // Move past the new sub-header row

            // 3. Members
            foreach ($equipo['integrantes'] as $member) {
                $member_rol = $member['es_capitan'] ? 'Capitán' : 'Integrante'; // New Rol Logic
                
                $member_data = [
                    $member['participante_matricula'],
                    $member['nombre_completo'], // Removed (Capitán)
                    $member_rol, // New Rol column
                    $member['correo_institucional'],
                    $member['genero'],
                    $member['tipo_participante'],
                    $member['carrera_display']
                ];
                
                $member_style = 'FFFFFFFF'; // White background for all members
                
                for ($i = 0; $i < count($member_data); $i++) {
                    $cell = $teamMemberColumns[$i] . $filaActual;
                    $sheet->setCellValue($cell, $member_data[$i]);
                    $sheet->getStyle($cell)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB($member_style);
                    $sheet->getStyle($cell)->getBorders()->getAllBorders()
                        ->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('FF' . $verde_oscuro);
                }
                
                $filaActual++;
            }
            $fill = !$fill; // Toggle color for the *next* team
            
            // Add a separator space
            $filaActual++;
            $teamCounter++; // Increment team counter
        }
        
    } else {
        // === REPORTE INDIVIDUAL O GENERAL ===
        $fill = false;
        foreach ($datos as $row) {
            // Alternar colores de fila
            $fillColor = $fill ? 'FF' . $verde_claro : 'FFFFFFFF';
            
            $sheet->setCellValue('A' . $filaActual, $row['participante_matricula']);
            $sheet->setCellValue('B' . $filaActual, $row['nombre_completo']);
            $sheet->setCellValue('C' . $filaActual, $row['correo_institucional']);
            $sheet->setCellValue('D' . $filaActual, $row['genero']);
            $sheet->setCellValue('E' . $filaActual, $row['tipo_participante']);
            $sheet->setCellValue('F' . $filaActual, $row['carrera_display']);
            
            if ($esReporteEvento) {
                // Sin columna Evento
                $sheet->setCellValue('G' . $filaActual, date('d/m/Y H:i', strtotime($row['fecha_inscripcion'])));
            } else {
                // Con columna Evento
                $sheet->setCellValue('G' . $filaActual, $row['evento_nombre']);
                $sheet->setCellValue('H' . $filaActual, date('d/m/Y H:i', strtotime($row['fecha_inscripcion'])));
            }
            
            $sheet->getStyle('A' . $filaActual . ':' . $maxColTabla . $filaActual)->getFill()
                ->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB($fillColor);
            
            $filaActual++;
            $fill = !$fill;
        }
        
        // Bordes tabla completa (solo para individual/general)
        $rangoTabla = 'A' . $filaEncabezado . ':' . $maxColTabla . ($filaActual - 1);
        $sheet->getStyle($rangoTabla)->getBorders()->getAllBorders()
            ->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('FF' . $verde_oscuro);
    }

    
    // ===================================
    // AJUSTAR ANCHOS
    // ===================================
    $sheet->getColumnDimension('A')->setWidth(15);
    $sheet->getColumnDimension('B')->setWidth(35);
    $sheet->getColumnDimension('C')->setWidth(15); // Rol/Correo (ajustado para el rol)
    $sheet->getColumnDimension('D')->setWidth(35); // Correo/Género (ajustado para el rol)
    $sheet->getColumnDimension('E')->setWidth(12); // Género/Tipo (ajustado para el rol)
    $sheet->getColumnDimension('F')->setWidth(15); // Tipo/Carrera (ajustado para el rol)
    $sheet->getColumnDimension('G')->setWidth(30); // Carrera/Fecha (ajustado para el rol)
    
    if (!$esEventoPorEquipos && $esReporteEvento) {
        $sheet->getColumnDimension('G')->setWidth(20); // Fecha
    } elseif (!$esEventoPorEquipos) {
        $sheet->getColumnDimension('G')->setWidth(35); // Evento
        $sheet->getColumnDimension('H')->setWidth(20); // Fecha
    }
    
    // ===================================
    // PIE DE PÁGINA
    // ===================================
    $filaPie = $filaActual + 2;
    $sheet->setCellValue('A' . $filaPie, 'Generado el: ' . date('d/m/Y H:i:s'));
    $sheet->mergeCells('A' . $filaPie . ':' . ($esEventoPorEquipos ? $maxColTablaTeam : $maxColTabla) . $filaPie);
    $sheet->getStyle('A' . $filaPie)->getFont()->setItalic(true)->setSize(9);
    $sheet->getStyle('A' . $filaPie)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    $sheet->getStyle('A' . $filaPie)->getFont()->getColor()->setARGB('FF666666');
    
    // ===================================
    // GENERAR ARCHIVO (nombre según tipo de reporte)
    // ===================================
    
    if ($esReporteEvento) {
        $filename = 'participantes_' . preg_replace('/[^a-zA-Z0-9]/', '_', $nombreEvento) . '_' . date('Ymd_His') . '.xlsx';
    } else {
        $filename = 'reporte_inscripciones_' . date('Ymd_His') . '.xlsx';
    }
    
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment;filename="' . $filename . '"');
    header('Cache-Control: max-age=0');
    
    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    
    if (isset($stmt)) {
        mysqli_stmt_close($stmt);
    }
    mysqli_close($conexion);
    exit;
    
} catch(Exception $e) {
    die('Error al generar el reporte: ' . $e->getMessage());
}
?>