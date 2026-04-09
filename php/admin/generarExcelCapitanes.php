<?php
/**
 * Reporte Exclusivo de Capitanes (Excel) - Formato de Cuadrícula Exacto
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

    // CONSULTA: Orden exacto según la imagen solicitada
    $sql = "SELECT 
                v.nombre_equipo,        -- Columna A
                u.apellido_paterno,     -- Columna B
                u.apellido_materno,     -- Columna C
                u.nombre,               -- Columna D
                v.participante_matricula, -- Columna E
                u.telefono,             -- Columna F
                v.correo_institucional  -- Columna G
            FROM v_inscripciones_completas v
            JOIN usuario u ON v.participante_matricula = u.matricula OR v.correo_institucional = u.correo
            WHERE v.evento_id = ? AND v.es_capitan = 1
            ORDER BY v.nombre_equipo ASC";

    $stmt = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    $resultado = mysqli_stmt_get_result($stmt);

    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Capitanes');

    // 1. DEFINICIÓN DE ENCABEZADOS
    $encabezados = [
        'A' => 'Equipo', 
        'B' => 'Apellido Paterno', 
        'C' => 'Apellido Materno', 
        'D' => 'Nombre', 
        'E' => 'Matrícula', 
        'F' => 'Teléfono', 
        'G' => 'Correo'
    ];

    $naranja_capitan = 'F9B233';

    foreach($encabezados as $letra => $titulo) {
        $sheet->setCellValue($letra . '1', $titulo);
        
        // Estilo exacto: Negrita, Fondo Naranja, Centrado y Bordes
        $sheet->getStyle($letra . '1')->applyFromArray([
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => $naranja_capitan]
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER
            ],
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN]
            ]
        ]);
        
        // Ancho automático para que se vea limpio
        $sheet->getColumnDimension($letra)->setAutoSize(true);
    }

    // 2. LLENADO DE DATOS CON FORMATO DE CUADRO
    $fila = 2;
    while ($row = mysqli_fetch_assoc($resultado)) {
        // Mapeo manual para evitar errores de alineación
        $sheet->setCellValue('A' . $fila, $row['nombre_equipo']);
        $sheet->setCellValue('B' . $fila, $row['apellido_paterno']);
        $sheet->setCellValue('C' . $fila, $row['apellido_materno']);
        $sheet->setCellValue('D' . $fila, $row['nombre']);
        $sheet->setCellValue('E' . $fila, $row['participante_matricula']);
        $sheet->setCellValue('F' . $fila, $row['telefono']);
        $sheet->setCellValue('G' . $fila, $row['correo_institucional']);

        // Aplicar bordes delgados a toda la fila para crear el efecto de "cuadro"
        $rangoFila = 'A' . $fila . ':G' . $fila;
        $sheet->getStyle($rangoFila)->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000']
                ]
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER
            ]
        ]);

        // Centrar específicamente Matrícula y Teléfono
        $sheet->getStyle('E' . $fila . ':F' . $fila)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $fila++;
    }

    // 3. DESCARGA DEL ARCHIVO
    if (ob_get_length()) ob_end_clean();

    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment;filename="Reporte_Capitanes_'.date('d-m-Y').'.xlsx"');
    header('Cache-Control: max-age=0');

    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;

} catch(Exception $e) {
    die("Error al generar el cuadro: " . $e->getMessage());
}