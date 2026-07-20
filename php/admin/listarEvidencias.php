<?php
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../includes/conexion.php';

header('Content-Type: application/json');

// --- CONFIGURACIÓN CLIENTE GOOGLE ---
$client = new \Google_Client();
$client->setAuthConfig(__DIR__ . '/../includes/credenciales-drive.json');
$client->addScope(\Google_Service_Drive::DRIVE);

$tokenPath = __DIR__ . '/../includes/token.json';
$accessToken = json_decode(file_get_contents($tokenPath), true);
$client->setAccessToken($accessToken);

if ($client->isAccessTokenExpired()) {
    $client->fetchAccessTokenWithRefreshToken($client->getRefreshToken());
    file_put_contents($tokenPath, json_encode($client->getAccessToken()));
}

$driveService = new \Google_Service_Drive($client);
$idCarpetaRaiz = '1gWLuRNotiGd9LqOctPSoOxoC3wS8GJY2';

$evento_id = intval($_GET['evento_id'] ?? 0);

if (!$evento_id) {
    echo json_encode(['success' => false, 'mensaje' => 'evento_id requerido']);
    exit;
}

// 1. Obtener nombre del evento
$stmt = $conexion->prepare("SELECT nombre FROM evento WHERE id = ?");
$stmt->bind_param("i", $evento_id);
$stmt->execute();
$res = $stmt->get_result()->fetch_assoc();
$nombreEvento = $res ? $res['nombre'] : null;

if (!$nombreEvento) {
    echo json_encode(['success' => false, 'mensaje' => 'Evento no encontrado']);
    exit;
}

// 2. Buscar/Obtener ID de la carpeta del evento
$idCarpetaEvento = obtenerIDCarpeta($driveService, $nombreEvento, $idCarpetaRaiz);

if (!$idCarpetaEvento) {
    // La carpeta del evento aún no existe en Drive
    echo json_encode(['success' => true, 'data' => []]);
    exit;
}

// 3. Listar RECURSIVAMENTE todas las carpetas y archivos
$todosLosItems = [];
listarRecursivo($driveService, $idCarpetaEvento, [], $todosLosItems);

echo json_encode(['success' => true, 'data' => $todosLosItems]);

// ============================================================
// FUNCIONES
// ============================================================

/**
 * Busca el ID de una carpeta por nombre dentro de un padre dado.
 */
function obtenerIDCarpeta($driveService, $nombre, $padreId) {
    $nombreEscapado = str_replace("'", "\\'", $nombre);
    $q = "name = '$nombreEscapado' and '$padreId' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    $files = $driveService->files->listFiles(['q' => $q, 'fields' => 'files(id)'])->getFiles();
    return count($files) > 0 ? $files[0]->getId() : null;
}

/**
 * Lista recursivamente el contenido de una carpeta y construye items con path.
 */
function listarRecursivo($driveService, $folderId, $currentPath, &$result) {
    $files = $driveService->files->listFiles([
        'q'      => "'$folderId' in parents and trashed = false",
        'fields' => 'files(id, name, mimeType, webViewLink, createdTime)',
    ])->getFiles();

    foreach ($files as $file) {
        $esCarpeta = $file->getMimeType() === 'application/vnd.google-apps.folder';

        $item = [
            'id'       => $file->getId(),
            'tipo'     => $esCarpeta ? 'carpeta' : 'archivo',
            'nombre'   => $file->getName(),
            'url'      => $file->getWebViewLink(),
            'fecha'    => $file->getCreatedTime(),
            'path'     => $currentPath,   // ← path de la carpeta PADRE
            'driveId'  => $file->getId(),
        ];

        $result[] = $item;

        // Si es carpeta, entrar recursivamente
        if ($esCarpeta) {
            listarRecursivo($driveService, $file->getId(), array_merge($currentPath, [$file->getName()]), $result);
        }
    }
}
?>