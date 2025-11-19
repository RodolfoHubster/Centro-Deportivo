<?php
/**
 * Generar Reporte PDF de Inscripciones
 * Versión personalizada con logo y nuevos colores
 */

require_once('../../vendor/tecnickcom/tcpdf/tcpdf.php');
include '../includes/conexion.php';

try {
    // Capturar modo de salida
    $modo = isset($_GET['modo']) ? $_GET['modo'] : 'ver';
    
    // ===================================
    // DETECTAR SI ES REPORTE DE UN EVENTO ESPECÍFICO
    // ===================================
    $esReporteEvento = isset($_GET['evento_id']) && !empty($_GET['evento_id']) && $_GET['evento_id'] !== 'todos';
    
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
                fecha_inscripcion,
                equipo_id,
                es_capitan
            FROM v_inscripciones_completas";
    
    $whereConditions = [];
    $params = [];
    $types = '';
    $nombreEvento = ''; // Para almacenar el nombre del evento
    
    // Filtro por evento
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
        
        // Filtro por tipo
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
    $total_otros = 0; // NUEVO: Conteo de "Prefiero no decirlo"
    
    while ($row = mysqli_fetch_assoc($resultado)) {
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
        } else if ($row['genero'] === 'Prefiero no decirlo') { // NUEVO: Conteo de 'Otros'
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
    // DEFINIR COLORES PERSONALIZADOS
    // ===================================
    $color_principal   = [0, 150, 0];      // Verde fuerte (#009600)
    $color_secundario  = [76, 175, 80];    // Verde material suave (#4CAF50)
    $color_encabezado  = [56, 142, 60];    // Verde oscuro elegante (#388E3C)
    $color_fondo_claro = [232, 245, 233];  // Verde muy claro pastel (#E8F5E9)

    
    // ===================================
    // CREAR PDF CON ENCABEZADO PERSONALIZADO
    // ===================================
    
    class PDF_Deportivo extends TCPDF {
        private $color_principal;
        private $color_secundario;
        private $esReporteEvento;
        private $nombreEvento;
        
        public function __construct($colores, $esReporteEvento = false, $nombreEvento = '') {
            parent::__construct('L', PDF_UNIT, 'LETTER', true, 'UTF-8', false);
            $this->color_principal = $colores['principal'];
            $this->color_secundario = $colores['secundario'];
            $this->esReporteEvento = $esReporteEvento;
            $this->nombreEvento = $nombreEvento;
        }
        
        public function Header() {
            // Ruta del logo - ajusta según tu estructura de carpetas
            $logo = '../../public/images/centroDeportivo.png';
            
            // Verificar si existe el logo
            if (file_exists($logo)) {
                // Logo en la esquina superior izquierda
                $this->Image($logo, 15, 10, 30, 0, '', '', 'T', false, 300, '', false, false, 0, false, false, false);
            }
            
            // Configurar colores del encabezado
            $this->SetFillColor($this->color_principal[0], $this->color_principal[1], $this->color_principal[2]);
            $this->SetTextColor(255, 255, 255);
            
            // Título principal
            $this->SetFont('helvetica', 'B', 18);
            $this->SetY(12);
            $this->Cell(0, 10, 'CENTRO DEPORTIVO', 0, 1, 'C', false);
            
            // Subtítulo - cambia según el tipo de reporte
            $this->SetFont('helvetica', 'B', 14);
            $this->SetTextColor($this->color_secundario[0], $this->color_secundario[1], $this->color_secundario[2]);
            
            if ($this->esReporteEvento) {
                $this->Cell(0, 8, 'Participantes del Evento', 0, 1, 'C', false);
                $this->SetFont('helvetica', 'B', 12);
                $this->SetTextColor($this->color_principal[0], $this->color_principal[1], $this->color_principal[2]);
                $this->Cell(0, 6, $this->nombreEvento, 0, 1, 'C', false);
            } else {
                $this->Cell(0, 8, 'Reporte de Inscripciones a Eventos', 0, 1, 'C', false);
            }
            
            // Línea decorativa
            $this->SetDrawColor($this->color_secundario[0], $this->color_secundario[1], $this->color_secundario[2]);
            $this->SetLineWidth(0.8);
            $left = $this->getMargins()['left'];
            $right = $this->getPageWidth() - $this->getMargins()['right'];
            $yPos = $this->esReporteEvento ? 40 : 35;
            $this->Line($left, $yPos, $right, $yPos);

            $this->Ln(5);
        }
        
        public function Footer() {
            $this->SetY(-15);
            $this->SetFont('helvetica', 'I', 8);
            $this->SetTextColor(100, 100, 100);
            $this->Cell(0, 10, 'Página ' . $this->getAliasNumPage() . ' de ' . $this->getAliasNbPages(), 0, 0, 'C');
        }
    }
    
    $pdf = new PDF_Deportivo([
        'principal' => $color_principal,
        'secundario' => $color_secundario
    ], $esReporteEvento, $nombreEvento);
    
    $pdf->SetCreator('Centro Deportivo');
    $pdf->SetAuthor('Sistema de Inscripciones');
    $pdf->SetTitle($esReporteEvento ? 'Participantes - ' . $nombreEvento : 'Reporte de Inscripciones');
    
    $ajusteMargen = $esReporteEvento ? 50 : 45;
    $pdf->SetMargins(10, $ajusteMargen, 10);
    $pdf->SetAutoPageBreak(TRUE, 15);
    
    $pdf->AddPage();
    
    // ===================================
    // FILTROS APLICADOS (solo si NO es reporte de evento)
    // ===================================
    if (!$esReporteEvento) {
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFillColor($color_fondo_claro[0], $color_fondo_claro[1], $color_fondo_claro[2]);
        $pdf->Cell(0, 7, 'Filtros Aplicados:', 0, 1, 'L', true);
        
        $pdf->SetFont('helvetica', '', 9);
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
        
        $pdf->MultiCell(0, 6, $filtrosTexto, 0, 'L');
        $pdf->Ln(3);
    }
    
    // ===================================
    // CALCULAR ANCHO DISPONIBLE
    // ===================================
    $pageWidth = $pdf->getPageWidth() - $pdf->getMargins()['left'] - $pdf->getMargins()['right'];
    
    // ===================================
    // ESTADÍSTICAS
    // ===================================
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->SetFillColor($color_principal[0], $color_principal[1], $color_principal[2]);
    $pdf->SetTextColor(255, 255, 255);

    $colWidth = $pageWidth / 5; // 5 columnas

    $pdf->SetX($pdf->getMargins()['left']); 

    // Fila de encabezados de estadísticas
    $pdf->Cell($colWidth, 8, 'Total Registros', 1, 0, 'C', true);
    $pdf->Cell($colWidth, 8, 'Hombres', 1, 0, 'C', true);
    $pdf->Cell($colWidth, 8, 'Mujeres', 1, 0, 'C', true);
    $pdf->Cell($colWidth, 8, 'Otros', 1, 0, 'C', true); // NUEVO
    $pdf->Cell($colWidth, 8, 'Mostrando', 1, 1, 'C', true);

    $pdf->SetFont('helvetica', 'B', 11);
    $pdf->SetTextColor($color_principal[0], $color_principal[1], $color_principal[2]);
    $pdf->SetFillColor(255, 255, 255);

    $pdf->SetX($pdf->getMargins()['left']);

    // Fila de datos de estadísticas
    $pdf->Cell($colWidth, 8, count($datos), 1, 0, 'C', true);
    $pdf->Cell($colWidth, 8, $total_hombres, 1, 0, 'C', true);
    $pdf->Cell($colWidth, 8, $total_mujeres, 1, 0, 'C', true);
    $pdf->Cell($colWidth, 8, $total_otros, 1, 0, 'C', true); // NUEVO VALOR
    $pdf->Cell($colWidth, 8, count($datos), 1, 1, 'C', true);
    $pdf->Ln(5);

    // ===================================
    // TABLA DE DATOS
    // ===================================
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->SetFillColor($color_encabezado[0], $color_encabezado[1], $color_encabezado[2]);
    $pdf->SetTextColor(255, 255, 255);

    // Definir anchos de columna (ajustados para incluir "Nº")
    $w_num = 10;
    
    if ($esReporteEvento && $esEventoPorEquipos) { 
        // Anchos para Reporte por Equipos (7 columnas + Nº)
        $w_matricula = 25;
        $w_nombre = 50;
        $w_rol = 20;
        $w_correo = 50;
        $w_genero = 20;
        $w_tipo = 25;
        // La última columna toma el espacio restante
        $w_carrera = $pageWidth - ($w_num + $w_matricula + $w_nombre + $w_rol + $w_correo + $w_genero + $w_tipo);
        
        // Skip writing headers here, they are written inside the loop

    } else if ($esReporteEvento) {
        // Anchos para Reporte Individual (no-equipo) (6 columnas + Nº)
        $w_matricula = 25;
        $w_nombre = 55;
        $w_correo = 55; // Ajustado
        $w_genero = 20;
        $w_tipo = 25;
        $w_carrera = $pageWidth - ($w_num + $w_matricula + $w_nombre + $w_correo + $w_genero + $w_tipo);
        
        $pdf->SetX($pdf->getMargins()['left']);
        $pdf->Cell($w_num, 7, 'Nº', 1, 0, 'C', true);
        $pdf->Cell($w_matricula, 7, 'Matrícula', 1, 0, 'C', true);
        $pdf->Cell($w_nombre, 7, 'Nombre', 1, 0, 'C', true);
        $pdf->Cell($w_correo, 7, 'Correo', 1, 0, 'C', true);
        $pdf->Cell($w_genero, 7, 'Género', 1, 0, 'C', true);
        $pdf->Cell($w_tipo, 7, 'Tipo', 1, 0, 'C', true);
        $pdf->Cell($w_carrera, 7, 'Carrera', 1, 1, 'C', true);
    } else {
        // Anchos para Reporte General (7 columnas + Nº)
        $w_matricula = 20;
        $w_nombre = 45; // Ajustado
        $w_correo = 50; // Ajustado
        $w_genero = 18;
        $w_tipo = 25;
        $w_carrera = 45; // Ajustado
        $w_evento = $pageWidth - ($w_num + $w_matricula + $w_nombre + $w_correo + $w_genero + $w_tipo + $w_carrera);

        $pdf->SetX($pdf->getMargins()['left']);
        $pdf->Cell($w_num, 7, 'Nº', 1, 0, 'C', true);
        $pdf->Cell($w_matricula, 7, 'Matrícula', 1, 0, 'C', true);
        $pdf->Cell($w_nombre, 7, 'Nombre', 1, 0, 'C', true);
        $pdf->Cell($w_correo, 7, 'Correo', 1, 0, 'C', true);
        $pdf->Cell($w_genero, 7, 'Género', 1, 0, 'C', true);
        $pdf->Cell($w_tipo, 7, 'Tipo', 1, 0, 'C', true);
        $pdf->Cell($w_carrera, 7, 'Carrera', 1, 0, 'C', true);
        $pdf->Cell($w_evento, 7, 'Evento', 1, 1, 'C', true);
    }

    // Datos
    $pdf->SetFont('helvetica', '', 7);
    $pdf->SetTextColor(0, 0, 0);
    $fill = false;
    $contador = 1;
    
    if ($esEventoPorEquipos) {
        // === DATOS PARA REPORTE POR EQUIPOS ===
        foreach ($reporte_equipo as $equipo) {
            
            // 1. Fila del Equipo (Centered, Enumerated)
            $pdf->SetX($pdf->getMargins()['left']);
            $pdf->SetFillColor($color_fondo_claro[0], $color_fondo_claro[1], $color_fondo_claro[2]);
            $pdf->SetFont('helvetica', 'B', 8);
            $pdf->SetTextColor($color_principal[0], $color_principal[1], $color_principal[2]);
            $pdf->Cell($pageWidth, 7, 'EQUIPO ' . $contador . ': ' . $equipo['nombre'], 1, 1, 'C', true);
            $contador++; // El contador de equipos

            // 2. Encabezado de Miembros del Equipo
            $pdf->SetFont('helvetica', 'B', 8);
            $pdf->SetFillColor($color_encabezado[0], $color_encabezado[1], $color_encabezado[2]);
            $pdf->SetTextColor(255, 255, 255);
            $pdf->SetX($pdf->getMargins()['left']);
            $pdf->Cell($w_num, 7, 'Nº', 1, 0, 'C', true);
            $pdf->Cell($w_matricula, 7, 'Matrícula', 1, 0, 'C', true);
            $pdf->Cell($w_nombre, 7, 'Nombre', 1, 0, 'C', true);
            $pdf->Cell($w_rol, 7, 'Rol', 1, 0, 'C', true); 
            $pdf->Cell($w_correo, 7, 'Correo', 1, 0, 'C', true);
            $pdf->Cell($w_genero, 7, 'Género', 1, 0, 'C', true);
            $pdf->Cell($w_tipo, 7, 'Tipo', 1, 0, 'C', true);
            $pdf->Cell($w_carrera, 7, 'Carrera', 1, 1, 'C', true);
            
            // 3. Integrantes
            $pdf->SetFont('helvetica', '', 7);
            $pdf->SetTextColor(0, 0, 0);
            $fillMember = false; // Alternating color for members
            $subContador = 1; // Contador de miembros por equipo

            foreach ($equipo['integrantes'] as $member) {
                $pdf->SetX($pdf->getMargins()['left']);
                
                // Color alternado para la fila del miembro
                if ($fillMember) {
                    $pdf->SetFillColor(245, 245, 245);
                } else {
                    $pdf->SetFillColor(255, 255, 255); 
                }
                
                $member_rol = $member['es_capitan'] ? 'Capitán' : 'Integrante';
                
                $pdf->Cell($w_num, 6, $subContador, 1, 0, 'C', true);
                $pdf->Cell($w_matricula, 6, $member['participante_matricula'], 1, 0, 'C', true);
                $pdf->Cell($w_nombre, 6, substr($member['nombre_completo'], 0, 40), 1, 0, 'L', true);
                $pdf->Cell($w_rol, 6, $member_rol, 1, 0, 'C', true);
                $pdf->Cell($w_correo, 6, substr($member['correo_institucional'], 0, 35), 1, 0, 'L', true);
                $pdf->Cell($w_genero, 6, substr($member['genero'], 0, 10), 1, 0, 'C', true);
                $pdf->Cell($w_tipo, 6, substr($member['tipo_participante'], 0, 15), 1, 0, 'C', true);
                $pdf->Cell($w_carrera, 6, substr($member['carrera_display'], 0, 30), 1, 1, 'L', true);

                $fillMember = !$fillMember;
                $subContador++;
            }
            $pdf->Ln(2); // Small break between teams
        }
    } else {
        // === DATOS PARA REPORTE INDIVIDUAL (Original Logic) ===
        foreach ($datos as $row) {
            $pdf->SetX($pdf->getMargins()['left']);
            
            // Alternar colores de fila
            if ($fill) {
                $pdf->SetFillColor(245, 245, 245);
            } else {
                $pdf->SetFillColor(255, 255, 255);
            }
            
            $pdf->Cell($w_num, 6, $contador, 1, 0, 'C', true);
            $pdf->Cell($w_matricula, 6, $row['participante_matricula'], 1, 0, 'C', true);
            $pdf->Cell($w_nombre, 6, substr($row['nombre_completo'], 0, 30), 1, 0, 'L', true);
            $pdf->Cell($w_correo, 6, substr($row['correo_institucional'], 0, 35), 1, 0, 'L', true);
            $pdf->Cell($w_genero, 6, substr($row['genero'], 0, 10), 1, 0, 'C', true);
            $pdf->Cell($w_tipo, 6, substr($row['tipo_participante'], 0, 15), 1, 0, 'C', true);
            
            // Solo agregar columna Evento si NO es reporte de evento específico
            if (!$esReporteEvento) {
                $pdf->Cell($w_carrera, 6, substr($row['carrera_display'], 0, 30), 1, 0, 'L', true);
                $pdf->Cell($w_evento, 6, substr($row['evento_nombre'], 0, 20), 1, 1, 'L', true);
            } else {
                $pdf->Cell($w_carrera, 6, substr($row['carrera_display'], 0, 30), 1, 1, 'L', true);
            }
            
            $fill = !$fill;
            $contador++;
        }
    }
    
    // Pie de página con información
    $pdf->Ln(5);
    $pdf->SetFont('helvetica', 'I', 8);
    $pdf->SetTextColor(100, 100, 100);
    $pdf->Cell(0, 5, 'Generado el: ' . date('d/m/Y H:i:s'), 0, 0, 'C');
    
    // ===================================
    // SALIDA
    // ===================================
    
    $filename = $esReporteEvento 
        ? 'participantes_' . preg_replace('/[^a-zA-Z0-9]/', '_', $nombreEvento) . '_' . date('Ymd_His') . '.pdf'
        : 'reporte_inscripciones_' . date('Ymd_His') . '.pdf';
    
    if ($modo === 'descargar') {
        $pdf->Output($filename, 'D');
    } else {
        $pdf->Output($filename, 'I');
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