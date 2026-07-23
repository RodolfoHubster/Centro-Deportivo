<?php
ob_start(); // Prevent headers already sent issues
/**
 * Generar Reporte Excel - Pausas Activas (Por Facultad, Carrera y Género)
 */

require_once('../../vendor/autoload.php');
include '../includes/conexion.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

try {
    $evento_id = isset($_GET['evento_id']) ? intval($_GET['evento_id']) : 0;

    if ($evento_id <= 0) {
        die('ID de evento no válido.');
    }

    // 1. Obtener nombre del evento
    $sqlEv = "SELECT nombre FROM evento WHERE id = ?";
    $stmtEv = mysqli_prepare($conexion, $sqlEv);
    mysqli_stmt_bind_param($stmtEv, 'i', $evento_id);
    mysqli_stmt_execute($stmtEv);
    $resEv = mysqli_stmt_get_result($stmtEv);
    $evento = mysqli_fetch_assoc($resEv);
    $nombreEvento = $evento ? $evento['nombre'] : 'Pausa Activa';
    mysqli_stmt_close($stmtEv);

    // 2. Consulta de estadísticas jerárquica
    $sql = "SELECT 
                f.id AS facultad_id,
                f.nombre AS facultad_nombre,
                c.id AS carrera_id,
                CASE WHEN c.es_tronco_comun = 1 THEN CONCAT(c.area_tronco_comun, ' (Tronco Común)') ELSE c.nombre END AS carrera_nombre,
                COALESCE(ecc.cupo_hombres, 0) AS cupo_hombres,
                COALESCE(ecc.cupo_mujeres, 0) AS cupo_mujeres,
                (COALESCE(ecc.cupo_hombres, 0) + COALESCE(ecc.cupo_mujeres, 0)) AS cupo_total,
                SUM(CASE WHEN LOWER(ipa.sexo) IN ('hombre', 'masculino', 'm') THEN 1 ELSE 0 END) AS hombres_registrados,
                SUM(CASE WHEN LOWER(ipa.sexo) IN ('mujer', 'femenino', 'f') THEN 1 ELSE 0 END) AS mujeres_registradas,
                COUNT(ipa.id) AS total_registrados
            FROM evento_carrera_cupos ecc
            JOIN carrera c ON ecc.carrera_id = c.id
            JOIN facultad f ON c.facultad_id = f.id
            LEFT JOIN inscripcion_pausa_activa ipa 
                   ON ipa.evento_id = ecc.evento_id 
                  AND ipa.carrera_id = ecc.carrera_id
            WHERE ecc.evento_id = ?
            GROUP BY f.id, f.nombre, c.id, c.nombre, ecc.cupo_hombres, ecc.cupo_mujeres
            ORDER BY f.nombre ASC, c.nombre ASC";

    $stmt = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    $resultado = mysqli_stmt_get_result($stmt);

    $facultadesMap = [];
    $tot_cupo_h = 0; $tot_h_reg = 0;
    $tot_cupo_m = 0; $tot_m_reg = 0;
    $tot_gral = 0; $tot_cupo_gral = 0;

    while ($row = mysqli_fetch_assoc($resultado)) {
        $facId = $row['facultad_id'];
        
        if (!isset($facultadesMap[$facId])) {
            $facultadesMap[$facId] = [
                'facultad_nombre' => $row['facultad_nombre'],
                'cupo_hombres' => 0, 'cupo_mujeres' => 0, 'cupo_total' => 0,
                'hombres_registrados' => 0, 'mujeres_registradas' => 0, 'total_registrados' => 0,
                'carreras' => []
            ];
        }

        $facultadesMap[$facId]['carreras'][] = $row;

        $facultadesMap[$facId]['cupo_hombres'] += $row['cupo_hombres'];
        $facultadesMap[$facId]['cupo_mujeres'] += $row['cupo_mujeres'];
        $facultadesMap[$facId]['cupo_total'] += $row['cupo_total'];
        $facultadesMap[$facId]['hombres_registrados'] += $row['hombres_registrados'];
        $facultadesMap[$facId]['mujeres_registradas'] += $row['mujeres_registradas'];
        $facultadesMap[$facId]['total_registrados'] += $row['total_registrados'];

        $tot_cupo_h += $row['cupo_hombres'];
        $tot_h_reg += $row['hombres_registrados'];
        $tot_cupo_m += $row['cupo_mujeres'];
        $tot_m_reg += $row['mujeres_registradas'];
        $tot_gral += $row['total_registrados'];
        $tot_cupo_gral += $row['cupo_total'];
    }
    mysqli_stmt_close($stmt);

    // CREAR EXCEL
    $verde_principal = '009600';
    $verde_claro = 'E8F5E9';
    $verde_oscuro = '388E3C';
    $gris_claro = 'F8F9FA';
    
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Pausas Activas');

    // Título Principal
    $sheet->setCellValue('A1', 'CENTRO DEPORTIVO - REPORTE DE PAUSAS ACTIVAS');
    $sheet->mergeCells('A1:H1');
    $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16)->getColor()->setARGB('FFFFFFFF');
    $sheet->getStyle('A1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_principal);
    $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

    $sheet->setCellValue('A2', $nombreEvento);
    $sheet->mergeCells('A2:H2');
    $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(13)->getColor()->setARGB('FF' . $verde_principal);
    $sheet->getStyle('A2')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_claro);
    $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

    // Resumen General de Estadísticas arriba
    $sheet->setCellValue('A4', 'Resumen General:');
    $sheet->getStyle('A4')->getFont()->setBold(true);

    $sheet->setCellValue('A5', 'Total Hombres');
    $sheet->setCellValue('B5', 'Total Mujeres');
    $sheet->setCellValue('C5', 'Total General');
    $sheet->setCellValue('A6', $tot_h_reg);
    $sheet->setCellValue('B6', $tot_m_reg);
    $sheet->setCellValue('C6', $tot_gral);
    $sheet->getStyle('A5:C5')->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
    $sheet->getStyle('A5:C5')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_oscuro);
    $sheet->getStyle('A5:C6')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    $sheet->getStyle('A5:C6')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

    // Encabezados de la Tabla principal por Facultad y Carrera
    $filaActual = 9;
    $cols = [
        ['titulo' => 'Facultad / Carrera', 'ancho' => 45],
        ['titulo' => 'Cupo Hombre', 'ancho' => 15],
        ['titulo' => 'Hombres', 'ancho' => 15],
        ['titulo' => 'Cupo Mujer', 'ancho' => 15],
        ['titulo' => 'Mujeres', 'ancho' => 15],
        ['titulo' => 'Total Registrados', 'ancho' => 18],
        ['titulo' => 'Cupo Total', 'ancho' => 15],
        ['titulo' => 'Ocupación', 'ancho' => 15]
    ];

    $colIdx = 1;
    foreach ($cols as $col) {
        $letra = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
        $sheet->setCellValue($letra . $filaActual, $col['titulo']);
        $sheet->getColumnDimension($letra)->setWidth($col['ancho']);
        $colIdx++;
    }
    
    $sheet->getStyle('A' . $filaActual . ':H' . $filaActual)->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
    $sheet->getStyle('A' . $filaActual . ':H' . $filaActual)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $verde_oscuro);
    $sheet->getStyle('A' . $filaActual . ':H' . $filaActual)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    
    $filaActual++;

    // Llenar Datos Jerárquicos
    foreach ($facultadesMap as $fac) {
        $pct = $fac['cupo_total'] > 0 ? round(($fac['total_registrados'] / $fac['cupo_total']) * 100) . '%' : '0%';
        
        // Fila Facultad
        $sheet->setCellValue('A' . $filaActual, $fac['facultad_nombre']);
        $sheet->setCellValue('B' . $filaActual, $fac['cupo_hombres']);
        $sheet->setCellValue('C' . $filaActual, $fac['hombres_registrados']);
        $sheet->setCellValue('D' . $filaActual, $fac['cupo_mujeres']);
        $sheet->setCellValue('E' . $filaActual, $fac['mujeres_registradas']);
        $sheet->setCellValue('F' . $filaActual, $fac['total_registrados']);
        $sheet->setCellValue('G' . $filaActual, $fac['cupo_total']);
        $sheet->setCellValue('H' . $filaActual, $pct);

        $sheet->getStyle('A' . $filaActual . ':H' . $filaActual)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . $gris_claro);
        $sheet->getStyle('A' . $filaActual . ':H' . $filaActual)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle('A' . $filaActual . ':H' . $filaActual)->getFont()->setBold(true);
        $sheet->getStyle('B' . $filaActual . ':H' . $filaActual)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        
        $filaActual++;

        // Filas Carreras
        foreach ($fac['carreras'] as $car) {
            $carPct = $car['cupo_total'] > 0 ? round(($car['total_registrados'] / $car['cupo_total']) * 100) . '%' : '0%';
            
            $sheet->setCellValue('A' . $filaActual, '    ↳ ' . $car['carrera_nombre']);
            $sheet->setCellValue('B' . $filaActual, $car['cupo_hombres']);
            $sheet->setCellValue('C' . $filaActual, $car['hombres_registrados']);
            $sheet->setCellValue('D' . $filaActual, $car['cupo_mujeres']);
            $sheet->setCellValue('E' . $filaActual, $car['mujeres_registradas']);
            $sheet->setCellValue('F' . $filaActual, $car['total_registrados']);
            $sheet->setCellValue('G' . $filaActual, $car['cupo_total']);
            $sheet->setCellValue('H' . $filaActual, $carPct);
    
            $sheet->getStyle('A' . $filaActual . ':H' . $filaActual)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFFFFF');
            $sheet->getStyle('A' . $filaActual . ':H' . $filaActual)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $sheet->getStyle('B' . $filaActual . ':H' . $filaActual)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            
            $filaActual++;
        }
    }

    // Fila de Total General
    $pctTotal = $tot_cupo_gral > 0 ? round(($tot_gral / $tot_cupo_gral) * 100) . '%' : '0%';
    $sheet->setCellValue('A' . $filaActual, 'TOTAL GENERAL');
    $sheet->setCellValue('B' . $filaActual, $tot_cupo_h);
    $sheet->setCellValue('C' . $filaActual, $tot_h_reg);
    $sheet->setCellValue('D' . $filaActual, $tot_cupo_m);
    $sheet->setCellValue('E' . $filaActual, $tot_m_reg);
    $sheet->setCellValue('F' . $filaActual, $tot_gral);
    $sheet->setCellValue('G' . $filaActual, $tot_cupo_gral);
    $sheet->setCellValue('H' . $filaActual, $pctTotal);

    $sheet->getStyle('A' . $filaActual . ':H' . $filaActual)->getFont()->setBold(true);
    $sheet->getStyle('A' . $filaActual . ':H' . $filaActual)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFD0E1D4');
    $sheet->getStyle('A' . $filaActual . ':H' . $filaActual)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_MEDIUM);
    $sheet->getStyle('B' . $filaActual . ':H' . $filaActual)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    $sheet->getStyle('A' . $filaActual)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

    $filename = 'Reporte_PausasActivas_' . date('Ymd_His') . '.xlsx';
    
    // Clear buffer before output
    ob_end_clean();
    
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment;filename="' . $filename . '"');
    header('Cache-Control: max-age=0');
    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;

} catch(Exception $e) { die('Error: ' . $e->getMessage()); }
?>