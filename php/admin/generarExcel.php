<?php
/**
 * Generar Reporte Excel - Versión Jerárquica con Filtros Completos
 */

require_once('../../vendor/autoload.php');
include '../includes/conexion.php';

// Función para obtener nombres reales de los filtros
function obtenerNombrePorFiltro($conexion, $tabla, $valor) {
    if (is_numeric($valor) && intval($valor) > 0) {
        $id = intval($valor);
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
    return $valor;
}

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Settings;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Symfony\Component\Cache\Psr16Cache;

try {
    ini_set('memory_limit', '1024M'); 
    if (class_exists('Symfony\Component\Cache\Adapter\FilesystemAdapter')) {
        $pool = new FilesystemAdapter();
        $simpleCache = new Psr16Cache($pool);
        Settings::setCache($simpleCache);
    }

    $esReporteEvento = isset($_GET['evento_id']) && !empty($_GET['evento_id']) && $_GET['evento_id'] !== 'todos';

    // 1. CONSULTA
    $sql = "SELECT 
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
                nombre_equipo,
                tipo_registro,
                es_capitan
            FROM v_inscripciones_completas";
    
    // 2. APLICACIÓN DE FILTROS
    $whereConditions = [];
    $params = [];
    $types = '';
    
    if ($esReporteEvento) {
        if (is_numeric($_GET['evento_id'])) {
            $whereConditions[] = "evento_id = ?"; $params[] = intval($_GET['evento_id']); $types .= 'i';
        } else {
            $whereConditions[] = "evento_nombre = ?"; $params[] = $_GET['evento_id']; $types .= 's';
        }
    }
    if (isset($_GET['genero']) && !empty($_GET['genero']) && $_GET['genero'] !== 'todos') {
        $whereConditions[] = "genero = ?"; $params[] = $_GET['genero']; $types .= 's';
    }
    if (isset($_GET['tipo_participante']) && !empty($_GET['tipo_participante']) && $_GET['tipo_participante'] !== 'todos') {
        $whereConditions[] = "tipo_participante = ?"; $params[] = $_GET['tipo_participante']; $types .= 's';
    }
    if (isset($_GET['carrera']) && !empty($_GET['carrera']) && $_GET['carrera'] !== 'todas') {
        $carrera_filtro = $_GET['carrera'];
        if (is_numeric($carrera_filtro) && intval($carrera_filtro) > 0) {
            $whereConditions[] = "carrera_id = ?"; $params[] = intval($carrera_filtro); $types .= 'i';
        } else {
            $whereConditions[] = "(carrera_nombre = ? OR CONCAT('TC - ', area_tronco_comun) = ?)";
            $params[] = $carrera_filtro; $params[] = $carrera_filtro; $types .= 'ss';
        }
    }
    if (isset($_GET['facultad']) && !empty($_GET['facultad']) && $_GET['facultad'] !== 'todas') {
        $facultad_filtro = $_GET['facultad'];
        if (is_numeric($facultad_filtro) && intval($facultad_filtro) > 0) {
            $whereConditions[] = "facultad_id = ?"; $params[] = intval($facultad_filtro); $types .= 'i';
        } else {
            $whereConditions[] = "facultad_nombre = ?"; $params[] = $facultad_filtro; $types .= 's';
        }
    }
    if (isset($_GET['campus']) && !empty($_GET['campus']) && $_GET['campus'] !== 'todos') {
        $campus_filtro = $_GET['campus'];
        if (is_numeric($campus_filtro) && intval($campus_filtro) > 0) {
            $whereConditions[] = "campus_id = ?"; $params[] = intval($campus_filtro); $types .= 'i';
        } else {
            $whereConditions[] = "campus_nombre = ?"; $params[] = $campus_filtro; $types .= 's';
        }
    }
    if (isset($_GET['buscar']) && !empty($_GET['buscar'])) {
        $buscar = $_GET['buscar'];
        $whereConditions[] = "(nombre_completo LIKE ? OR participante_matricula LIKE ? OR correo_institucional LIKE ?)";
        $params[] = "%{$buscar}%"; $params[] = "%{$buscar}%"; $params[] = "%{$buscar}%"; $types .= 'sss';
    }

    if (!empty($whereConditions)) {
        $sql .= " WHERE " . implode(" AND ", $whereConditions);
    }
    
    // ORDENAMIENTO JERÁRQUICO: Tipo -> Evento -> Equipo -> Capitán
    $sql .= " ORDER BY tipo_registro ASC, evento_nombre ASC, nombre_equipo ASC, es_capitan DESC, nombre_completo ASC";
    
    // Ejecutar Consulta
    if (!empty($params)) {
        $stmt = mysqli_prepare($conexion, $sql);
        mysqli_stmt_bind_param($stmt, $types, ...$params);
        mysqli_stmt_execute($stmt);
        $resultado = mysqli_stmt_get_result($stmt);
    } else {
        $resultado = mysqli_query($conexion, $sql);
    }

    // Procesar Datos
    $datos = [];
    $total_hombres = 0; $total_mujeres = 0; $total_otros = 0;
    $nombreEvento = '';
    $tipoRegistroEvento = 'Mixto';

    while ($row = mysqli_fetch_assoc($resultado)) {
        if ($row['es_tronco_comun']) {
            $row['carrera_display'] = "TC - " . $row['area_tronco_comun'];
        } else {
            $row['carrera_display'] = $row['carrera_nombre'];
        }
        
        if ($esReporteEvento && empty($nombreEvento)) {
            $nombreEvento = $row['evento_nombre'];
            $tipoRegistroEvento = $row['tipo_registro']; 
        }

        if ($row['genero'] === 'Masculino' || $row['genero'] === 'Hombre') $total_hombres++;
        else if ($row['genero'] === 'Femenino' || $row['genero'] === 'Mujer') $total_mujeres++;
        else $total_otros++;

        $datos[] = $row;
    }

    // Configuración de Columnas
    $cols = [
        ['titulo' => 'Matrícula', 'campo' => 'participante_matricula', 'ancho' => 15],
        ['titulo' => 'Nombre Completo', 'campo' => 'nombre_completo', 'ancho' => 35],
        ['titulo' => 'Correo', 'campo' => 'correo_institucional', 'ancho' => 30],
        ['titulo' => 'Género', 'campo' => 'genero', 'ancho' => 15],
        ['titulo' => 'Tipo', 'campo' => 'tipo_participante', 'ancho' => 15],
        ['titulo' => 'Carrera / Facultad', 'campo' => 'carrera_display', 'ancho' => 30],
    ];

    $mostrarRol = true; 
    if ($esReporteEvento && $tipoRegistroEvento !== 'Por equipos') {
        $mostrarRol = false; 
    }

    if ($mostrarRol) {
        array_splice($cols, 2, 0, [['titulo' => 'Rol', 'campo' => 'rol_calculado', 'ancho' => 15]]);
    }

    if (!$esReporteEvento) {
        $cols[] = ['titulo' => 'Evento', 'campo' => 'evento_nombre', 'ancho' => 30];
    }
    
    $cols[] = ['titulo' => 'Fecha Reg.', 'campo' => 'fecha_inscripcion', 'ancho' => 20];


    // CREAR EXCEL
    $verde_principal = '009600';
    $verde_claro = 'E8F5E9';
    $verde_oscuro = '388E3C';
    $azul_seccion = '1976D2'; 
    
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Reporte');

    // Título Principal
    $maxLetra = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($cols));
    $tituloPrincipal = $esReporteEvento ? 'CENTRO DEPORTIVO - PARTICIPANTES' : 'CENTRO DEPORTIVO - REPORTE GENERAL';
    $sheet->setCellValue('A1', $tituloPrincipal);
    $sheet->mergeCells('A1:' . $maxLetra . '1');
    $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16)->getColor()->setARGB('FFFFFFFF');
    $sheet->getStyle('A1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_principal);
    $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

    $filaActual = 3;
    if ($esReporteEvento) {
        $sheet->setCellValue('A2', $nombreEvento . ' (' . ucfirst($tipoRegistroEvento) . ')');
        $sheet->mergeCells('A2:' . $maxLetra . '2');
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(14)->getColor()->setARGB('FF' . $verde_principal);
        $sheet->getStyle('A2')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_claro);
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $filaActual = 4;
    }

    // --- SECCIÓN DE FILTROS APLICADOS (RESTAURADA COMPLETA) ---
    if (!$esReporteEvento) {
        $sheet->setCellValue('A' . $filaActual, 'FILTROS APLICADOS:');
        $sheet->getStyle('A' . $filaActual)->getFont()->setBold(true);
        $sheet->getStyle('A' . $filaActual)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_claro);
        
        $filtrosTexto = "";
        
        // Búsqueda
        if (isset($_GET['buscar']) && !empty($_GET['buscar'])) {
            $filtrosTexto .= "Búsqueda: " . $_GET['buscar'] . " | ";
        }
        
        // Género y Tipo
        $filtrosTexto .= "Género: " . (isset($_GET['genero']) && $_GET['genero'] !== 'todos' ? $_GET['genero'] : 'Todos') . " | ";
        $filtrosTexto .= "Tipo: " . (isset($_GET['tipo_participante']) && $_GET['tipo_participante'] !== 'todos' ? $_GET['tipo_participante'] : 'Todos');
        
        // Carrera
        if (isset($_GET['carrera']) && $_GET['carrera'] !== 'todas') {
            $nombreCarrera = obtenerNombrePorFiltro($conexion, 'carrera', $_GET['carrera']);
            $filtrosTexto .= " | Carrera: " . $nombreCarrera;
        } else {
            $filtrosTexto .= " | Carrera: Todas";
        }
        
        // Facultad
        if (isset($_GET['facultad']) && $_GET['facultad'] !== 'todas') {
            $nombreFacultad = obtenerNombrePorFiltro($conexion, 'facultad', $_GET['facultad']);
            $filtrosTexto .= " | Facultad: " . $nombreFacultad;
        } else {
            $filtrosTexto .= " | Facultad: Todas";
        }

        // Campus
        if (isset($_GET['campus']) && $_GET['campus'] !== 'todos') {
            $nombreCampus = obtenerNombrePorFiltro($conexion, 'campus', $_GET['campus']);
            $filtrosTexto .= " | Campus: " . $nombreCampus;
        } else {
            $filtrosTexto .= " | Campus: Todos";
        }
        
        $filaActual++;
        $sheet->setCellValue('A' . $filaActual, $filtrosTexto);
        $sheet->mergeCells('A' . $filaActual . ':' . $maxLetra . $filaActual);
        $filaActual += 2;
    }

    // Estadísticas
    $sheet->setCellValue('A' . $filaActual, 'Total');
    $sheet->setCellValue('B' . $filaActual, 'Hombres');
    $sheet->setCellValue('C' . $filaActual, 'Mujeres');
    $sheet->setCellValue('D' . $filaActual, 'Otros');
    $sheet->setCellValue('E' . $filaActual, count($datos));
    $sheet->setCellValue('B' . ($filaActual+1), $total_hombres);
    $sheet->setCellValue('C' . ($filaActual+1), $total_mujeres);
    $sheet->setCellValue('D' . ($filaActual+1), $total_otros);
    
    $sheet->getStyle('A' . $filaActual . ':E' . $filaActual)->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
    $sheet->getStyle('A' . $filaActual . ':E' . $filaActual)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_principal);
    $sheet->getStyle('A' . $filaActual . ':E' . ($filaActual+1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    $sheet->getStyle('A' . $filaActual . ':E' . ($filaActual+1))->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
    
    $filaActual += 3;

    // Encabezados de Tabla
    $colIdx = 1;
    foreach ($cols as $col) {
        $letra = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
        $sheet->setCellValue($letra . $filaActual, $col['titulo']);
        $sheet->getColumnDimension($letra)->setWidth($col['ancho']);
        $colIdx++;
    }
    $sheet->getStyle('A' . $filaActual . ':' . $maxLetra . $filaActual)->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
    $sheet->getStyle('A' . $filaActual . ':' . $maxLetra . $filaActual)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_oscuro);
    
    $filaActual++;

    // Variables de control
    $ultimoTipoRegistro = null;
    $ultimoEquipo = null;
    $contadorEquipo = 0;
    $fill = false;

    foreach ($datos as $row) {
        $tipoActual = $row['tipo_registro']; 
        $row['rol_calculado'] = ($row['es_capitan'] == 1) ? 'CAPITÁN' : (($tipoActual == 'Por equipos') ? 'Integrante' : '');

        // 1. SEPARADOR DE SECCIÓN (Individual vs Equipo)
        if (!$esReporteEvento && $tipoActual !== $ultimoTipoRegistro) {
            $tituloSeccion = ($tipoActual === 'Por equipos') ? '--- EVENTOS POR EQUIPOS ---' : '--- EVENTOS INDIVIDUALES ---';
            
            $sheet->setCellValue('A' . $filaActual, $tituloSeccion);
            $sheet->mergeCells('A' . $filaActual . ':' . $maxLetra . $filaActual);
            
            $sheet->getStyle('A' . $filaActual)->getFont()->setBold(true)->setSize(12)->getColor()->setARGB('FFFFFFFF');
            $sheet->getStyle('A' . $filaActual)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $azul_seccion);
            $sheet->getStyle('A' . $filaActual)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            
            $ultimoTipoRegistro = $tipoActual;
            $ultimoEquipo = null;
            $contadorEquipo = 0;
            $filaActual++;
        }

        // 2. SEPARADOR DE EQUIPO
        if ($tipoActual === 'Por equipos') {
            $equipoActual = $row['nombre_equipo'] ?? 'SIN EQUIPO';
            
            if ($equipoActual !== $ultimoEquipo) {
                $contadorEquipo++;
                $textoEquipo = ($equipoActual === 'SIN EQUIPO') ? '⚠️ SIN EQUIPO ASIGNADO' : "EQUIPO $contadorEquipo: " . $equipoActual . " (" . $row['evento_nombre'] . ")";
                
                $sheet->setCellValue('A' . $filaActual, $textoEquipo);
                $sheet->mergeCells('A' . $filaActual . ':' . $maxLetra . $filaActual);
                
                $sheet->getStyle('A' . $filaActual)->getFont()->setBold(true)->getColor()->setARGB('FF' . $verde_principal);
                $sheet->getStyle('A' . $filaActual)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_claro);
                $sheet->getStyle('A' . $filaActual)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('A' . $filaActual . ':' . $maxLetra . $filaActual)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
                
                $ultimoEquipo = $equipoActual;
                $filaActual++;
                $fill = false;
            }
        }

        // Datos
        $colIdx = 1;
        $colorFondo = $fill ? 'FF' . $verde_claro : 'FFFFFFFF';
        foreach ($cols as $col) {
            $letra = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
            $valor = $row[$col['campo']] ?? '';
            
            if ($col['campo'] === 'fecha_inscripcion') $valor = date('d/m/Y H:i', strtotime($valor));
            
            $sheet->setCellValue($letra . $filaActual, $valor);
            $sheet->getStyle($letra . $filaActual)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB($colorFondo);
            $sheet->getStyle($letra . $filaActual)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('FF' . $verde_oscuro);
            $colIdx++;
        }
        $filaActual++;
        $fill = !$fill;
    }

    $filename = 'Reporte_' . date('Ymd_His') . '.xlsx';
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment;filename="' . $filename . '"');
    header('Cache-Control: max-age=0');
    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;

} catch(Exception $e) { die('Error: ' . $e->getMessage()); }
?>