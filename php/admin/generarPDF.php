<?php
/**
 * Generar Reporte PDF - Versión Jerárquica con Filtros Completos
 */

require_once('../../vendor/tecnickcom/tcpdf/tcpdf.php');
include '../includes/conexion.php';

// Función mejorada para abreviar carreras de forma inteligente
function abreviarCarrera($nombre) {
    if (strlen($nombre) <= 20) return $nombre; // Si es corto, no hacer nada

    $reemplazos = [
        'Ingeniería en' => 'Ing.',
        'Ingeniería'    => 'Ing.',
        'Licenciatura en' => 'Lic.',
        'Licenciatura'  => 'Lic.',
        'Computacionales' => 'Comp.',
        'Sistemas'      => 'Sist.',
        'Tecnologías'   => 'Tec.',
        'Información'   => 'Inf.',
        'Administración' => 'Adm.',
        'Electrónica'   => 'Elect.'
    ];

    // Aplicar reemplazos de palabras clave
    $resultado = str_ireplace(array_keys($reemplazos), array_values($reemplazos), $nombre);
    
    // Si aún es muy largo, limitar caracteres para que no rompa la tabla
    return (strlen($resultado) > 25) ? substr($resultado, 0, 22) . '...' : $resultado;
}

// Función para obtener nombres reales
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

try {
    $modo = isset($_GET['modo']) ? $_GET['modo'] : 'ver';
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

    // 2. FILTROS
    $whereConditions = []; $params = []; $types = '';
    
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

    if (!empty($whereConditions)) { $sql .= " WHERE " . implode(" AND ", $whereConditions); }
    $sql .= " ORDER BY tipo_registro ASC, evento_nombre ASC, nombre_equipo ASC, es_capitan DESC, nombre_completo ASC";
    
    if (!empty($params)) {
        $stmt = mysqli_prepare($conexion, $sql);
        mysqli_stmt_bind_param($stmt, $types, ...$params);
        mysqli_stmt_execute($stmt);
        $resultado = mysqli_stmt_get_result($stmt);
    } else {
        $resultado = mysqli_query($conexion, $sql);
    }

    $datos = []; $total_hombres = 0; $total_mujeres = 0; $total_otros = 0;
    $nombreEvento = ''; $tipoRegistroEvento = 'Mixto';

    while ($row = mysqli_fetch_assoc($resultado)) {
        // Aplicar la abreviación dinámica de carreras
        if ($row['es_tronco_comun']) {
            $row['carrera_display'] = "TC - " . $row['area_tronco_comun'];
        } else {
            $row['carrera_display'] = abreviarCarrera($row['carrera_nombre']);
        }
        
        if ($esReporteEvento && empty($nombreEvento)) {
            $nombreEvento = $row['evento_nombre']; $tipoRegistroEvento = $row['tipo_registro']; 
        }
        
        if ($row['genero'] === 'Masculino' || $row['genero'] === 'Hombre') $total_hombres++;
        else if ($row['genero'] === 'Femenino' || $row['genero'] === 'Mujer') $total_mujeres++;
        else $total_otros++;
        $datos[] = $row;
    }

    $color_principal   = [0, 150, 0]; $color_secundario  = [76, 175, 80];
    $color_encabezado  = [56, 142, 60]; $color_fondo_claro = [232, 245, 233];
    $color_seccion     = [25, 118, 210]; 

    class PDF_Deportivo extends TCPDF {
        private $color_principal; private $color_secundario;
        private $esReporteEvento; private $nombreEvento;
        
        public function __construct($colores, $esReporteEvento = false, $nombreEvento = '') {
            parent::__construct('L', PDF_UNIT, 'LETTER', true, 'UTF-8', false);
            $this->color_principal = $colores['principal'];
            $this->color_secundario = $colores['secundario'];
            $this->esReporteEvento = $esReporteEvento;
            $this->nombreEvento = $nombreEvento;
        }
        
        public function Header() {
            $logo = '../../public/images/centroDeportivo.png';
            if (file_exists($logo)) {
                $this->Image($logo, 15, 10, 30, 0, '', '', 'T', false, 300, '', false, false, 0, false, false, false);
            }
            $this->SetFillColor($this->color_principal[0], $this->color_principal[1], $this->color_principal[2]);
            $this->SetTextColor(255, 255, 255);
            $this->SetFont('helvetica', 'B', 18);
            $this->SetY(12);
            $this->Cell(0, 10, 'CENTRO DEPORTIVO', 0, 1, 'C', false);
            
            $this->SetFont('helvetica', 'B', 14);
            $this->SetTextColor($this->color_secundario[0], $this->color_secundario[1], $this->color_secundario[2]);
            
            if ($this->esReporteEvento) {
                $this->Cell(0, 8, 'Reporte de Participantes', 0, 1, 'C', false);
                $this->SetFont('helvetica', 'B', 12);
                $this->SetTextColor($this->color_principal[0], $this->color_principal[1], $this->color_principal[2]);
                $this->Cell(0, 6, $this->nombreEvento, 0, 1, 'C', false);
            } else {
                $this->Cell(0, 8, 'Reporte General de Inscripciones', 0, 1, 'C', false);
            }
            $this->Ln(5);
        }
        
        public function Footer() {
            $this->SetY(-15);
            $this->SetFont('helvetica', 'I', 8);
            $this->SetTextColor(100, 100, 100);
            $this->Cell(0, 10, 'Página ' . $this->getAliasNumPage() . ' de ' . $this->getAliasNbPages(), 0, 0, 'C');
        }
    }

    $pdf = new PDF_Deportivo(['principal' => $color_principal, 'secundario' => $color_secundario], $esReporteEvento, $nombreEvento);
    $pdf->SetMargins(10, $esReporteEvento ? 50 : 45, 10);
    $pdf->SetAutoPageBreak(TRUE, 15);
    $pdf->AddPage();

    if (!$esReporteEvento) {
        $pdf->SetFont('helvetica', 'B', 10); $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFillColor($color_fondo_claro[0], $color_fondo_claro[1], $color_fondo_claro[2]);
        $pdf->Cell(0, 7, 'Filtros Aplicados:', 0, 1, 'L', true);
        
        $pdf->SetFont('helvetica', '', 9);
        $filtrosTexto = "";
        if (isset($_GET['buscar']) && !empty($_GET['buscar'])) $filtrosTexto .= "Búsqueda: " . $_GET['buscar'] . " | ";
        $filtrosTexto .= "Género: " . (isset($_GET['genero']) && $_GET['genero'] !== 'todos' ? $_GET['genero'] : 'Todos') . " | ";
        $filtrosTexto .= "Tipo: " . (isset($_GET['tipo_participante']) && $_GET['tipo_participante'] !== 'todos' ? $_GET['tipo_participante'] : 'Todos');
        
        if (isset($_GET['carrera']) && $_GET['carrera'] !== 'todas') $filtrosTexto .= " | Carrera: " . obtenerNombrePorFiltro($conexion, 'carrera', $_GET['carrera']);
        else $filtrosTexto .= " | Carrera: Todas";
        
        if (isset($_GET['facultad']) && $_GET['facultad'] !== 'todas') $filtrosTexto .= " | Facultad: " . obtenerNombrePorFiltro($conexion, 'facultad', $_GET['facultad']);
        else $filtrosTexto .= " | Facultad: Todas";

        if (isset($_GET['campus']) && $_GET['campus'] !== 'todos') $filtrosTexto .= " | Campus: " . obtenerNombrePorFiltro($conexion, 'campus', $_GET['campus']);
        else $filtrosTexto .= " | Campus: Todos";
        
        $pdf->MultiCell(0, 6, $filtrosTexto, 0, 'L');
        $pdf->Ln(3);
    }

    // Estadísticas
    $pageWidth = $pdf->getPageWidth() - 20;
    $colWidth = $pageWidth / 5;
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->SetFillColor($color_principal[0], $color_principal[1], $color_principal[2]); $pdf->SetTextColor(255, 255, 255);
    $pdf->Cell($colWidth, 8, 'Total', 1, 0, 'C', true); $pdf->Cell($colWidth, 8, 'Hombres', 1, 0, 'C', true);
    $pdf->Cell($colWidth, 8, 'Mujeres', 1, 0, 'C', true); $pdf->Cell($colWidth, 8, 'Otros', 1, 0, 'C', true);
    $pdf->Cell($colWidth, 8, 'Mostrando', 1, 1, 'C', true);

    $pdf->SetFont('helvetica', 'B', 11); $pdf->SetTextColor($color_principal[0], $color_principal[1], $color_principal[2]); $pdf->SetFillColor(255, 255, 255);
    $pdf->Cell($colWidth, 8, count($datos), 1, 0, 'C', true); $pdf->Cell($colWidth, 8, $total_hombres, 1, 0, 'C', true);
    $pdf->Cell($colWidth, 8, $total_mujeres, 1, 0, 'C', true); $pdf->Cell($colWidth, 8, $total_otros, 1, 0, 'C', true);
    $pdf->Cell($colWidth, 8, count($datos), 1, 1, 'C', true); $pdf->Ln(5);

    // Definición de columnas con el nuevo orden
    $cols = [
        ['titulo' => 'Apellido P.', 'campo' => 'ap_paterno', 'w' => 15, 'align' => 'L'],
        ['titulo' => 'Apellido M.', 'campo' => 'ap_materno', 'w' => 15, 'align' => 'L'],
        ['titulo' => 'Nombre',      'campo' => 'solo_nombre', 'w' => 15, 'align' => 'L'],
        ['titulo' => 'Matrícula',   'campo' => 'participante_matricula', 'w' => 12, 'align' => 'C'],
        ['titulo' => 'Carrera/Fac.', 'campo' => 'carrera_display', 'w' => 22, 'align' => 'L'],
        ['titulo' => 'Correo',      'campo' => 'correo_institucional', 'w' => 25, 'align' => 'L'],
        ['titulo' => 'Tipo',        'campo' => 'tipo_participante', 'w' => 10, 'align' => 'C'],
        ['titulo' => 'Género',      'campo' => 'genero', 'w' => 10, 'align' => 'C'],
    ];

    $mostrarRol = ($esReporteEvento && $tipoRegistroEvento !== 'Por equipos') ? false : true;
    if ($mostrarRol) { array_splice($cols, 3, 0, [['titulo' => 'Rol', 'campo' => 'rol_calculado', 'w' => 10, 'align' => 'C']]); }
    if (!$esReporteEvento) { $cols[] = ['titulo' => 'Evento', 'campo' => 'evento_nombre', 'w' => 15, 'align' => 'L']; }

    $totalWeight = 0; foreach($cols as $c) $totalWeight += $c['w'];
    $colWidths = []; foreach($cols as $k => $c) { $colWidths[$k] = ($c['w'] / $totalWeight) * $pageWidth; }

    function drawHeaderPDF($pdf, $cols, $widths, $colores) {
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->SetFillColor($colores[0], $colores[1], $colores[2]); $pdf->SetTextColor(255, 255, 255);
        foreach($cols as $k => $c) { $pdf->Cell($widths[$k], 7, $c['titulo'], 1, 0, 'C', true); }
        $pdf->Ln();
    }

    drawHeaderPDF($pdf, $cols, $colWidths, $color_encabezado);

    $ultimoTipoRegistro = null; $ultimoEquipo = null; $contadorEq = 0; $fill = false;

    foreach ($datos as $row) {
        // Separación de nombres
        $partesNombre = explode(' ', trim($row['nombre_completo']), 3);
        $row['ap_paterno'] = $partesNombre[0] ?? '';
        $row['ap_materno'] = $partesNombre[1] ?? '';
        $row['solo_nombre'] = $partesNombre[2] ?? '';

        $tipoActual = $row['tipo_registro'];
        $row['rol_calculado'] = ($row['es_capitan'] == 1) ? 'Capitán' : (($tipoActual == 'Por equipos') ? 'Miembro' : '-');

        if ($pdf->GetY() > 180) { $pdf->AddPage(); drawHeaderPDF($pdf, $cols, $colWidths, $color_encabezado); }

        if (!$esReporteEvento && $tipoActual !== $ultimoTipoRegistro) {
            $pdf->Ln(2);
            $tituloSeccion = ($tipoActual === 'Por equipos') ? 'MODALIDAD: POR EQUIPOS' : 'MODALIDAD: INDIVIDUAL';
            $pdf->SetFont('helvetica', 'B', 11); $pdf->SetFillColor($color_seccion[0], $color_seccion[1], $color_seccion[2]); $pdf->SetTextColor(255, 255, 255);
            $pdf->Cell($pageWidth, 8, $tituloSeccion, 1, 1, 'C', true);
            drawHeaderPDF($pdf, $cols, $colWidths, $color_encabezado);
            $ultimoTipoRegistro = $tipoActual; $ultimoEquipo = null; $contadorEq = 0;
        }

        if ($tipoActual === 'Por equipos') {
            $equipoActual = $row['nombre_equipo'] ?? 'SIN EQUIPO';
            if ($equipoActual !== $ultimoEquipo) {
                $contadorEq++;
                $pdf->SetFont('helvetica', 'B', 10); $pdf->SetFillColor($color_fondo_claro[0], $color_fondo_claro[1], $color_fondo_claro[2]);
                $pdf->SetTextColor($color_principal[0], $color_principal[1], $color_principal[2]);
                $texto = ($equipoActual === 'SIN EQUIPO') ? 'SIN EQUIPO' : "EQUIPO $contadorEq: $equipoActual";
                $pdf->Cell($pageWidth, 7, $texto, 1, 1, 'L', true);
                $ultimoEquipo = $equipoActual; $fill = false;
            }
        }

        $pdf->SetFont('helvetica', '', 7); $pdf->SetTextColor(0, 0, 0); $pdf->SetFillColor(245, 245, 245);
        $usarFill = $fill ? true : false;
        
        foreach($cols as $k => $c) {
            $valor = $row[$c['campo']] ?? '';
            // El substr evita que el texto se desborde si aun abreviado es largo
            $pdf->Cell($colWidths[$k], 6, substr($valor, 0, 40), 1, 0, $c['align'], $usarFill);
        }
        $pdf->Ln(); $fill = !$fill;
    }

    $pdf->Output('Reporte.pdf', 'I');
    if (isset($stmt)) mysqli_stmt_close($stmt);
    mysqli_close($conexion);
    exit;

} catch(Exception $e) { die('Error: ' . $e->getMessage()); }
?>