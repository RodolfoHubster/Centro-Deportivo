<?php
/**
 * Generar Reporte Excel de Inscripciones
 * Versión con colores verde deportivo
 * Adaptable para reporte general o por evento específico
 */

require_once('../../vendor/autoload.php');
include '../includes/conexion.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

try {
    
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
                fecha_inscripcion
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

    // Solo aplicar estos filtros si NO es reporte de evento específico
    if (!$esReporteEvento) {
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
            $whereConditions[] = "(carrera_nombre = ? OR CONCAT('TC - ', area_tronco_comun) = ?)";
            $params[] = $carrera_filtro;
            $params[] = $carrera_filtro;
            $types .= 'ss';
        }
        
        // Búsqueda
        if (isset($_GET['buscar']) && !empty($_GET['buscar'])) {
            $buscar = mysqli_real_escape_string($conexion, $_GET['buscar']);
            $whereConditions[] = "(nombre_completo LIKE ? OR participante_matricula LIKE ? OR correo_institucional LIKE ?)";
            $params[] = "%{$buscar}%";
            $params[] = "%{$buscar}%";
            $params[] = "%{$buscar}%";
            $types .= 'sss';
        }
    }
    
    // Construir WHERE
    if (!empty($whereConditions)) {
        $sql .= " WHERE " . implode(" AND ", $whereConditions);
    }
    
    $sql .= " ORDER BY fecha_inscripcion DESC";
    
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
        
        if ($row['genero'] === 'Masculino' || $row['genero'] === 'Hombre') {
            $total_hombres++;
        } else if ($row['genero'] === 'Femenino' || $row['genero'] === 'Mujer') {
            $total_mujeres++;
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
    } else {
        $sheet->setCellValue('A1', 'CENTRO DEPORTIVO - REPORTE DE INSCRIPCIONES A EVENTOS');
        $sheet->mergeCells('A1:H1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('A1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_principal);
        $sheet->getStyle('A1')->getFont()->getColor()->setARGB('FFFFFFFF');
        $sheet->getRowDimension(1)->setRowHeight(30);
        
        $filaActual = 3; // Comenzar después del título
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
            $filtrosTexto .= " | Carrera: " . $_GET['carrera'];
        } else {
            $filtrosTexto .= " | Carrera: Todas";
        }
        
        $sheet->setCellValue('A' . $filaActual, $filtrosTexto);
        $sheet->mergeCells('A' . $filaActual . ':H' . $filaActual);
        
        $filaActual += 2; // Espacio después de filtros
    }
    
    // ===================================
    // ESTADÍSTICAS
    // ===================================
    $filaStats = $filaActual;
    $maxCol = $esReporteEvento ? 'D' : 'D';
    
    $sheet->setCellValue('A' . $filaStats, 'Total Participantes');
    $sheet->setCellValue('B' . $filaStats, 'Hombres');
    $sheet->setCellValue('C' . $filaStats, 'Mujeres');
    $sheet->setCellValue('D' . $filaStats, 'Mostrando');
    
    $sheet->getStyle('A' . $filaStats . ':' . $maxCol . $filaStats)->getFont()->setBold(true);
    $sheet->getStyle('A' . $filaStats . ':' . $maxCol . $filaStats)->getFill()
        ->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_principal);
    $sheet->getStyle('A' . $filaStats . ':' . $maxCol . $filaStats)->getFont()->getColor()->setARGB('FFFFFFFF');
    $sheet->getStyle('A' . $filaStats . ':' . $maxCol . $filaStats)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    
    // Bordes estadísticas
    $sheet->getStyle('A' . $filaStats . ':' . $maxCol . $filaStats)->getBorders()->getAllBorders()
        ->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('FF' . $verde_oscuro);
    
    $filaStats++;
    $sheet->setCellValue('A' . $filaStats, count($datos));
    $sheet->setCellValue('B' . $filaStats, $total_hombres);
    $sheet->setCellValue('C' . $filaStats, $total_mujeres);
    $sheet->setCellValue('D' . $filaStats, count($datos));
    $sheet->getStyle('A' . $filaStats . ':' . $maxCol . $filaStats)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    $sheet->getStyle('A' . $filaStats . ':' . $maxCol . $filaStats)->getFont()->setBold(true);
    $sheet->getStyle('A' . $filaStats . ':' . $maxCol . $filaStats)->getFill()
        ->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFFFFF');
    
    // Bordes datos estadísticas
    $sheet->getStyle('A' . $filaStats . ':' . $maxCol . $filaStats)->getBorders()->getAllBorders()
        ->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('FF' . $verde_oscuro);
    
    // ===================================
    // ENCABEZADOS DE TABLA (cambian según tipo de reporte)
    // ===================================
    $filaEncabezado = $filaStats + 2;
    
    if ($esReporteEvento) {
        // Sin columna "Evento"
        $encabezados = ['Matrícula', 'Nombre Completo', 'Correo', 'Género', 'Tipo', 'Carrera/Facultad', 'Fecha Inscripción'];
        $columnas = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        $maxColTabla = 'G';
    } else {
        // Con columna "Evento"
        $encabezados = ['Matrícula', 'Nombre Completo', 'Correo', 'Género', 'Tipo', 'Carrera/Facultad', 'Evento', 'Fecha Inscripción'];
        $columnas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        $maxColTabla = 'H';
    }
    
    foreach ($encabezados as $index => $encabezado) {
        $celda = $columnas[$index] . $filaEncabezado;
        $sheet->setCellValue($celda, $encabezado);
        $sheet->getStyle($celda)->getFont()->setBold(true);
        $sheet->getStyle($celda)->getFill()
            ->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_oscuro);
        $sheet->getStyle($celda)->getFont()->getColor()->setARGB('FFFFFFFF');
        $sheet->getStyle($celda)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    }
    
    // ===================================
    // DATOS
    // ===================================
    $filaActual = $filaEncabezado + 1;
    foreach ($datos as $row) {
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
        
        // Alternar colores verde claro
        if ($filaActual % 2 == 0) {
            $sheet->getStyle('A' . $filaActual . ':' . $maxColTabla . $filaActual)->getFill()
                ->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_claro);
        }
        
        $filaActual++;
    }
    
    // Bordes tabla completa
    $rangoTabla = 'A' . $filaEncabezado . ':' . $maxColTabla . ($filaActual - 1);
    $sheet->getStyle($rangoTabla)->getBorders()->getAllBorders()
        ->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('FF' . $verde_oscuro);
    
    // ===================================
    // AJUSTAR ANCHOS (según tipo de reporte)
    // ===================================
    $sheet->getColumnDimension('A')->setWidth(15);
    $sheet->getColumnDimension('B')->setWidth(35);
    $sheet->getColumnDimension('C')->setWidth(35);
    $sheet->getColumnDimension('D')->setWidth(12);
    $sheet->getColumnDimension('E')->setWidth(15);
    $sheet->getColumnDimension('F')->setWidth(30);
    
    if ($esReporteEvento) {
        $sheet->getColumnDimension('G')->setWidth(20); // Fecha
    } else {
        $sheet->getColumnDimension('G')->setWidth(35); // Evento
        $sheet->getColumnDimension('H')->setWidth(20); // Fecha
    }
    
    // ===================================
    // PIE DE PÁGINA
    // ===================================
    $filaPie = $filaActual + 2;
    $sheet->setCellValue('A' . $filaPie, 'Generado el: ' . date('d/m/Y H:i:s'));
    $sheet->mergeCells('A' . $filaPie . ':' . $maxColTabla . $filaPie);
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