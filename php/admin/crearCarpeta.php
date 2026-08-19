<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../includes/conexion.php';

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Método no permitido");
    }

    if (!isset($_POST['evento_id'])) {
        throw new Exception("Datos incompletos: Falta evento_id.");
    }

    $evento_id = intval($_POST['evento_id']);
    
    // --- NUEVO: Detectar si el sistema pide crear una subcarpeta ---
    // Si tu Javascript envía un nombre específico para la carpeta nueva:
    $nombreSubCarpeta = isset($_POST['nombre_carpeta']) ? trim($_POST['nombre_carpeta']) : '';
    // Si tu Javascript envía el ID de la carpeta padre donde se va a crear:
    $padreId = isset($_POST['padre_id']) ? trim($_POST['padre_id']) : '';

    // 1. Configurar cliente Google con la CUENTA DE SERVICIO
    $client = new \Google_Client();
    $client->setAuthConfig(__DIR__ . '/../includes/credenciales-drive.json');
    $client->addScope(\Google_Service_Drive::DRIVE);

    $driveService  = new \Google_Service_Drive($client);
    $idCarpetaRaiz = '0AJ4PDsSEBerEUk9PVA'; 

    // 2. Obtener nombre del evento de la BD (para la carpeta principal)
    $stmtEvento = $conexion->prepare("SELECT nombre FROM evento WHERE id = ?");
    $stmtEvento->bind_param("i", $evento_id);
    $stmtEvento->execute();
    $res          = $stmtEvento->get_result()->fetch_assoc();
    $nombreEvento = $res ? trim($res['nombre']) : "Evento_" . $evento_id;

    // 3. Crear o verificar la carpeta PRINCIPAL del evento
    $idCarpetaEvento = obtenerOcrearCarpeta($driveService, $nombreEvento, [$idCarpetaRaiz]);

    $idCarpetaFinal = $idCarpetaEvento;

    // 4. ¿El usuario pidió crear una SUBCARPETA?
    if (!empty($nombreSubCarpeta)) {
        // Si el Javascript nos mandó en qué carpeta meterla, usamos esa. Si no, la metemos directo en la del evento.
        $idDestino = !empty($padreId) ? $padreId : $idCarpetaEvento;
        
        // Creamos la subcarpeta en Drive
        $idCarpetaFinal = obtenerOcrearCarpeta($driveService, $nombreSubCarpeta, [$idDestino]);
    }

    echo json_encode([
        'success'   => true,
        'mensaje'   => 'Carpeta lista en Drive',
        'folder_id' => $idCarpetaFinal
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}

// --- FUNCIÓN ---
function obtenerOcrearCarpeta($driveService, $nombre, $padres) {
    if (empty($nombre)) $nombre = "SinNombre";
    $nombreEscapado = str_replace("'", "\\'", $nombre);
    $idPadre        = $padres[0];
    $query          = "name = '$nombreEscapado' and '$idPadre' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";

    // --- MAGIA AÑADIDA PARA BUSCAR EN LA UNIDAD COMPARTIDA ---
    $files = $driveService->files->listFiles([
        'q' => $query,
        'supportsAllDrives' => true,
        'includeItemsFromAllDrives' => true,
        'corpora' => 'allDrives'
    ])->getFiles();
    
    if (count($files) > 0) return $files[0]->getId();

    $metadata = new Google_Service_Drive_DriveFile([
        'name'     => $nombre,
        'parents'  => $padres,
        'mimeType' => 'application/vnd.google-apps.folder',
    ]);
    
    // --- MAGIA AÑADIDA PARA CREAR EN LA UNIDAD COMPARTIDA ---
    return $driveService->files->create($metadata, [
        'fields' => 'id',
        'supportsAllDrives' => true
    ])->id;
}
?>