<?php
/**
 * Generar Reporte PDF de Inscripciones
 */

// ESTA ES LA LÍNEA CORRECTA
require_once('../../vendor/tecnickcom/tcpdf/tcpdf.php');

include '../includes/conexion.php';


try {
    // Capturar modo de salida
    $modo = isset($_GET['modo']) ? $_GET['modo'] : 'ver';
    
    // ===================================
    // CAPTURAR FILTROS
    // ===================================
    
    $sql = "SELECT 
                participante_matricula,
                nombre_completo,
                correo_institucional,
                genero,
                tipo_participante,
                carrera_nombre,
                es_tronco_comun,
                area_tronco_comun,
                evento_nombre,
                fecha_inscripcion
            FROM v_inscripciones_completas";
    
    $whereConditions = [];
    $params = [];
    $types = '';
    
        // Filtro por evento (puede venir como ID o como nombre)
    if (isset($_GET['evento_id']) && !empty($_GET['evento_id']) && $_GET['evento_id'] !== 'todos') {
        // Si es numérico, buscar por ID
        if (is_numeric($_GET['evento_id'])) {
            $whereConditions[] = "evento_id = ?";
            $params[] = intval($_GET['evento_id']);
            $types .= 'i';
        } 
        // Si no es numérico, buscar por nombre
        else {
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
    
    // Filtro por tipo
    if (isset($_GET['tipo_participante']) && !empty($_GET['tipo_participante']) && $_GET['tipo_participante'] !== 'todos') {
        $whereConditions[] = "tipo_participante = ?";
        $params[] = mysqli_real_escape_string($conexion, $_GET['tipo_participante']);
        $types .= 's';
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
        
        $datos[] = $row;
        
        if ($row['genero'] === 'Masculino' || $row['genero'] === 'Hombre') {
            $total_hombres++;
        } else if ($row['genero'] === 'Femenino' || $row['genero'] === 'Mujer') {
            $total_mujeres++;
        }
    }
    
    // ===================================
    // CREAR PDF
    // ===================================
    
    $pdf = new TCPDF('L', PDF_UNIT, 'LETTER', true, 'UTF-8', false);
    
    $pdf->SetCreator('Centro Deportivo');
    $pdf->SetAuthor('Sistema de Inscripciones');
    $pdf->SetTitle('Reporte de Inscripciones');
    
    $pdf->SetMargins(10, 15, 10);
    $pdf->SetAutoPageBreak(TRUE, 15);
    
    $pdf->AddPage();
    
    // Título
    $pdf->SetFont('helvetica', 'B', 16);
    $pdf->SetFillColor(68, 114, 196);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->Cell(0, 10, 'REPORTE DE INSCRIPCIONES A EVENTOS DEPORTIVOS', 0, 1, 'C', true);
    $pdf->Ln(3);
    
    // Filtros
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFillColor(231, 230, 230);
    $pdf->Cell(0, 7, 'Filtros Aplicados:', 0, 1, 'L', true);
    
    $pdf->SetFont('helvetica', '', 9);
    $filtrosTexto = '';
    if (isset($_GET['buscar']) && !empty($_GET['buscar'])) {
        $filtrosTexto .= "Búsqueda: " . $_GET['buscar'] . " | ";
    }
    $filtrosTexto .= "Género: " . (isset($_GET['genero']) && $_GET['genero'] !== 'todos' ? $_GET['genero'] : 'Todos') . " | ";
    $filtrosTexto .= "Tipo: " . (isset($_GET['tipo_participante']) && $_GET['tipo_participante'] !== 'todos' ? $_GET['tipo_participante'] : 'Todos');
    
    $pdf->MultiCell(0, 6, $filtrosTexto, 0, 'L');
    $pdf->Ln(2);
    
    // Estadísticas
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->SetFillColor(68, 114, 196);
    $pdf->SetTextColor(255, 255, 255);
    $colWidth = ($pdf->getPageWidth() - 20) / 4;
    $pdf->Cell($colWidth, 7, 'Total', 1, 0, 'C', true);
    $pdf->Cell($colWidth, 7, 'Hombres', 1, 0, 'C', true);
    $pdf->Cell($colWidth, 7, 'Mujeres', 1, 0, 'C', true);
    $pdf->Cell($colWidth, 7, 'Mostrando', 1, 1, 'C', true);
    
    $pdf->SetFont('helvetica', '', 10);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFillColor(255, 255, 255);
    $pdf->Cell($colWidth, 7, count($datos), 1, 0, 'C');
    $pdf->Cell($colWidth, 7, $total_hombres, 1, 0, 'C');
    $pdf->Cell($colWidth, 7, $total_mujeres, 1, 0, 'C');
    $pdf->Cell($colWidth, 7, count($datos), 1, 1, 'C');
    $pdf->Ln(4);
    
    // Tabla
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->SetFillColor(68, 70, 106);
    $pdf->SetTextColor(255, 255, 255);
    
    $pdf->Cell(20, 7, 'Matrícula', 1, 0, 'C', true);
    $pdf->Cell(50, 7, 'Nombre', 1, 0, 'C', true);
    $pdf->Cell(55, 7, 'Correo', 1, 0, 'C', true);
    $pdf->Cell(18, 7, 'Género', 1, 0, 'C', true);
    $pdf->Cell(25, 7, 'Tipo', 1, 0, 'C', true);
    $pdf->Cell(50, 7, 'Carrera', 1, 0, 'C', true);
    $pdf->Cell(33, 7, 'Evento', 1, 1, 'C', true);
    
    // Datos
    $pdf->SetFont('helvetica', '', 7);
    $pdf->SetTextColor(0, 0, 0);
    $fill = false;
    
    foreach ($datos as $row) {
        $pdf->SetFillColor($fill ? 242 : 255, $fill ? 242 : 255, $fill ? 242 : 255);
        
        $pdf->Cell(20, 6, $row['participante_matricula'], 1, 0, 'C', true);
        $pdf->Cell(50, 6, substr($row['nombre_completo'], 0, 30), 1, 0, 'L', true);
        $pdf->Cell(55, 6, substr($row['correo_institucional'], 0, 35), 1, 0, 'L', true);
        $pdf->Cell(18, 6, substr($row['genero'], 0, 10), 1, 0, 'C', true);
        $pdf->Cell(25, 6, substr($row['tipo_participante'], 0, 15), 1, 0, 'C', true);
        $pdf->Cell(50, 6, substr($row['carrera_display'], 0, 30), 1, 0, 'L', true);
        $pdf->Cell(33, 6, substr($row['evento_nombre'], 0, 20), 1, 1, 'L', true);
        
        $fill = !$fill;
    }
    
    // Pie de página
    $pdf->Ln(5);
    $pdf->SetFont('helvetica', 'I', 8);
    $pdf->Cell(0, 5, 'Generado el: ' . date('d/m/Y H:i:s'), 0, 0, 'C');
    
    // ===================================
    // SALIDA
    // ===================================
    
    $filename = 'reporte_inscripciones_' . date('Ymd_His') . '.pdf';
    
    if ($modo === 'descargar') {
        $pdf->Output($filename, 'D'); // Descarga
    } else {
        $pdf->Output($filename, 'I'); // Ver en navegador
    }
    
    if (isset($stmt)) {
        mysqli_stmt_close($stmt);
    }
    mysqli_close($conexion);
    exit;
    
} catch(Exception $e) {
    die('Error al generar el PDF: ' . $e->getMessage());
}
?>