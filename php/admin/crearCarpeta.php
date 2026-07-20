<?php
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../includes/conexion.php';

header('Content-Type: application/json');

// --- CONFIGURACIÓN CLIENTE ---
$client = new \Google_Client();
$client->setAuthConfig(__DIR__ . '/../includes/credenciales-drive.json');
$client->addScope(\Google_Service_Drive::DRIVE); 

$accessToken = json_decode(file_get_contents(__DIR__ . '/../includes/token.json'), true);
$client->setAccessToken($accessToken);

if ($client->isAccessTokenExpired()) {
    $client->fetchAccessTokenWithRefreshToken($client->getRefreshToken());
    file_put_contents(__DIR__ . '/../includes/token.json', json_encode($client->getAccessToken()));
}

$driveService = new \Google_Service_Drive($client);
$idCarpetaRaiz = '1gWLuRNotiGd9LqOctPSoOxoC3wS8GJY2'; 

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $nombre = $_POST['nombre'] ?? '';
        $evento_id = intval($_POST['evento_id']);
        
        // 1. Obtener nombre del evento
        $stmt = $conexion->prepare("SELECT nombre FROM evento WHERE id = ?");
        $stmt->bind_param("i", $evento_id);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $nombreEvento = $res ? $res['nombre'] : "Evento_" . $evento_id;

        // 2. Crear/Obtener carpetas
        $idCarpetaEvento = obtenerOcrearCarpeta($driveService, $nombreEvento, [$idCarpetaRaiz]);
        $idNuevaCarpeta = obtenerOcrearCarpeta($driveService, $nombre, [$idCarpetaEvento]);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
    }
}

// --- FUNCIÓN (DEBE IR AL FINAL) ---
function obtenerOcrearCarpeta($driveService, $nombre, $padres) {
    if (empty($nombre)) $nombre = "SinNombre";
    
    $nombreEscapado = str_replace("'", "\\'", $nombre);
    $idPadre = $padres[0];
    $query = "name = '$nombreEscapado' and '$idPadre' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    
    $lista = $driveService->files->listFiles(['q' => $query]);
    $files = $lista->getFiles();

    if (count($files) > 0) return $files[0]->getId();

    $metadata = new Google_Service_Drive_DriveFile([
        'name' => $nombre,
        'parents' => $padres,
        'mimeType' => 'application/vnd.google-apps.folder'
    ]);
    return $driveService->files->create($metadata, ['fields' => 'id'])->id;
}
?>