<?php
ob_start(); // Prevent headers already sent issues
/**
 * Generar Reporte PDF - Pausas Activas (Por Facultad, Carrera y Género)
 */

require_once('../../vendor/tecnickcom/tcpdf/tcpdf.php');
include '../includes/conexion.php';

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

    // 2. Consulta de estadísticas por facultad y carrera
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

    $color_principal   = [0, 150, 0]; 
    $color_secundario  = [76, 175, 80];
    $color_encabezado  = [56, 142, 60]; 
    $color_fondo_claro = [232, 245, 233];

    class PDF_PausasEstadisticas extends TCPDF {
        private $color_principal; private $color_secundario; private $nombreEvento;
        
        public function __construct($colores, $nombreEvento) {
            parent::__construct('L', PDF_UNIT, 'LETTER', true, 'UTF-8', false);
            $this->color_principal = $colores['principal'];
            $this->color_secundario = $colores['secundario'];
            $this->nombreEvento = $nombreEvento;
        }
        
        public function Header() {
            $logo = '../../public/images/centroDeportivo.png';
            if (file_exists($logo)) {
                $this->Image($logo, 15, 10, 25, 0, '', '', 'T', false, 300, '', false, false, 0, false, false, false);
            }
            $this->SetFillColor($this->color_principal[0], $this->color_principal[1], $this->color_principal[2]);
            $this->SetTextColor(255, 255, 255);
            $this->SetFont('helvetica', 'B', 16);
            $this->SetY(10);
            $this->Cell(0, 8, 'CENTRO DEPORTIVO - ESTADÍSTICAS DE PAUSAS ACTIVAS', 0, 1, 'C', false);
            
            $this->SetFont('helvetica', 'B', 12);
            $this->SetTextColor($this->color_secundario[0], $this->color_secundario[1], $this->color_secundario[2]);
            $this->Cell(0, 6, $this->nombreEvento, 0, 1, 'C', false);
            $this->Ln(5);
        }
        
        public function Footer() {
            $this->SetY(-15);
            $this->SetFont('helvetica', 'I', 8);
            $this->SetTextColor(100, 100, 100);
            $this->Cell(0, 10, 'Página ' . $this->getAliasNumPage() . ' de ' . $this->getAliasNbPages(), 0, 0, 'C');
        }
    }

    $pdf = new PDF_PausasEstadisticas(['principal' => $color_principal, 'secundario' => $color_secundario], $nombreEvento);
    $pdf->SetMargins(10, 42, 10);
    $pdf->SetAutoPageBreak(TRUE, 15);
    $pdf->AddPage();

    // Tarjetas de Resumen Superior
    $pageWidth = $pdf->getPageWidth() - 20;
    $cardWidth = $pageWidth / 3;
    
    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->SetFillColor(240, 248, 240);
    $pdf->SetTextColor(0, 100, 0);
    
    $pdf->Cell($cardWidth, 6, 'TOTAL HOMBRES REGISTRADOS', 1, 0, 'C', true);
    $pdf->Cell($cardWidth, 6, 'TOTAL MUJERES REGISTRADAS', 1, 0, 'C', true);
    $pdf->Cell($cardWidth, 6, 'TOTAL GENERAL', 1, 1, 'C', true);

    $pdf->SetFont('helvetica', 'B', 14);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->Cell($cardWidth, 8, $tot_h_reg, 1, 0, 'C', false);
    $pdf->Cell($cardWidth, 8, $tot_m_reg, 1, 0, 'C', false);
    $pdf->Cell($cardWidth, 8, $tot_gral, 1, 1, 'C', false);
    $pdf->Ln(5);

    // Columnas de la Tabla por Facultad
    $cols = [
        ['titulo' => 'Facultad / Carrera', 'w' => 85, 'align' => 'L'],
        ['titulo' => 'Cupo Hombre', 'w' => 25, 'align' => 'C'],
        ['titulo' => 'Hombres', 'w' => 25, 'align' => 'C'],
        ['titulo' => 'Cupo Mujer', 'w' => 25, 'align' => 'C'],
        ['titulo' => 'Mujeres', 'w' => 25, 'align' => 'C'],
        ['titulo' => 'Total Reg.', 'w' => 25, 'align' => 'C'],
        ['titulo' => 'Cupo Total', 'w' => 25, 'align' => 'C'],
        ['titulo' => 'Ocupación', 'w' => 25, 'align' => 'C'],
    ];

    $totalWeight = 0; foreach($cols as $c) $totalWeight += $c['w'];
    $colWidths = []; foreach($cols as $k => $c) { $colWidths[$k] = ($c['w'] / $totalWeight) * $pageWidth; }

    function drawHeaderEstadisticasPDF($pdf, $cols, $widths, $colores) {
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->SetFillColor($colores[0], $colores[1], $colores[2]); 
        $pdf->SetTextColor(255, 255, 255);
        foreach($cols as $k => $c) { 
            $pdf->Cell($widths[$k], 7, $c['titulo'], 1, 0, 'C', true); 
        }
        $pdf->Ln();
    }

    drawHeaderEstadisticasPDF($pdf, $cols, $colWidths, $color_encabezado);

    foreach ($facultadesMap as $fac) {
        if ($pdf->GetY() > 175) { 
            $pdf->AddPage(); 
            drawHeaderEstadisticasPDF($pdf, $cols, $colWidths, $color_encabezado); 
        }

        $pct = $fac['cupo_total'] > 0 ? round(($fac['total_registrados'] / $fac['cupo_total']) * 100) . '%' : '0%';

        $pdf->SetFont('helvetica', 'B', 9); 
        $pdf->SetTextColor(0, 0, 0); 
        $pdf->SetFillColor(240, 240, 240);
        
        // Fila Facultad (Gris claro)
        $pdf->Cell($colWidths[0], 6, $fac['facultad_nombre'], 1, 0, 'L', true);
        $pdf->Cell($colWidths[1], 6, $fac['cupo_hombres'], 1, 0, 'C', true);
        $pdf->Cell($colWidths[2], 6, $fac['hombres_registrados'], 1, 0, 'C', true);
        $pdf->Cell($colWidths[3], 6, $fac['cupo_mujeres'], 1, 0, 'C', true);
        $pdf->Cell($colWidths[4], 6, $fac['mujeres_registradas'], 1, 0, 'C', true);
        $pdf->Cell($colWidths[5], 6, $fac['total_registrados'], 1, 0, 'C', true);
        $pdf->Cell($colWidths[6], 6, $fac['cupo_total'], 1, 0, 'C', true);
        $pdf->Cell($colWidths[7], 6, $pct, 1, 0, 'C', true);
        $pdf->Ln(); 

        // Filas Carreras
        foreach ($fac['carreras'] as $car) {
            if ($pdf->GetY() > 185) { 
                $pdf->AddPage(); 
                drawHeaderEstadisticasPDF($pdf, $cols, $colWidths, $color_encabezado); 
            }
            $carPct = $car['cupo_total'] > 0 ? round(($car['total_registrados'] / $car['cupo_total']) * 100) . '%' : '0%';
            
            $pdf->SetFont('helvetica', '', 8); 
            $pdf->SetTextColor(60, 60, 60); 
            $pdf->Cell($colWidths[0], 6, '    ' . $car['carrera_nombre'], 1, 0, 'L', false);
            $pdf->Cell($colWidths[1], 6, $car['cupo_hombres'], 1, 0, 'C', false);
            $pdf->Cell($colWidths[2], 6, $car['hombres_registrados'], 1, 0, 'C', false);
            $pdf->Cell($colWidths[3], 6, $car['cupo_mujeres'], 1, 0, 'C', false);
            $pdf->Cell($colWidths[4], 6, $car['mujeres_registradas'], 1, 0, 'C', false);
            $pdf->Cell($colWidths[5], 6, $car['total_registrados'], 1, 0, 'C', false);
            $pdf->Cell($colWidths[6], 6, $car['cupo_total'], 1, 0, 'C', false);
            $pdf->Cell($colWidths[7], 6, $carPct, 1, 0, 'C', false);
            $pdf->Ln();
        }
    }

    // Fila de Total General al pie de la tabla
    if ($pdf->GetY() > 175) { 
        $pdf->AddPage(); 
        drawHeaderEstadisticasPDF($pdf, $cols, $colWidths, $color_encabezado); 
    }
    
    $pctTotal = $tot_cupo_gral > 0 ? round(($tot_gral / $tot_cupo_gral) * 100) . '%' : '0%';
    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->SetFillColor(208, 225, 212);
    $pdf->SetTextColor(0, 0, 0);

    $pdf->Cell($colWidths[0], 7, 'TOTAL GENERAL', 1, 0, 'R', true);
    $pdf->Cell($colWidths[1], 7, $tot_cupo_h, 1, 0, 'C', true);
    $pdf->Cell($colWidths[2], 7, $tot_h_reg, 1, 0, 'C', true);
    $pdf->Cell($colWidths[3], 7, $tot_cupo_m, 1, 0, 'C', true);
    $pdf->Cell($colWidths[4], 7, $tot_m_reg, 1, 0, 'C', true);
    $pdf->Cell($colWidths[5], 7, $tot_gral, 1, 0, 'C', true);
    $pdf->Cell($colWidths[6], 7, $tot_cupo_gral, 1, 0, 'C', true);
    $pdf->Cell($colWidths[7], 7, $pctTotal, 1, 1, 'C', true);

    // Clear buffer before output
    ob_end_clean();

    $pdf->Output('Reporte_EstadisticasPausas.pdf', 'I');
    mysqli_close($conexion);
    exit;

} catch(Exception $e) { die('Error: ' . $e->getMessage()); }
?>