<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../includes/conexion.php';

header('Content-Type: application/json');

try {
    $client = new \Google_Client();
    $client->setAuthConfig(__DIR__ . '/../includes/credenciales-drive.json');
    $client->addScope(\Google_Service_Drive::DRIVE);

    $driveService = new \Google_Service_Drive($client);
    $idCarpetaRaiz = '0AJ4PDsSEBerEUk9PVA';

    $evento_id = intval($_GET['evento_id'] ?? 0);

    if (!$evento_id) {
        throw new Exception('evento_id requerido');
    }

    // 1. Obtener nombre del evento y LIMPIAR espacios invisibles con trim()
    $stmt = $conexion->prepare("SELECT nombre FROM evento WHERE id = ?");
    $stmt->bind_param("i", $evento_id);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    $nombreEvento = $res ? trim($res['nombre']) : null;

    if (!$nombreEvento) {
        throw new Exception('Evento no encontrado en BD');
    }

    // 2. Buscar/Obtener ID de la carpeta del evento
    $idCarpetaEvento = obtenerIDCarpeta($driveService, $nombreEvento, $idCarpetaRaiz);

    if (!$idCarpetaEvento) {
        // La carpeta aún no existe o Google aún no la indexa
        echo json_encode([
            'success' => true, 
            'data' => [], 
            'debug' => "No se encontró ninguna carpeta llamada '$nombreEvento' dentro de la raíz."
        ]);
        exit;
    }

    // 3. Listar RECURSIVAMENTE
    $todosLosItems = [];
    listarRecursivo($driveService, $idCarpetaEvento, [], $todosLosItems);

    echo json_encode([
        'success' => true, 
        'data' => $todosLosItems, 
        'debug' => "Se encontró la carpeta '$nombreEvento' (ID: $idCarpetaEvento). Tiene " . count($todosLosItems) . " archivos adentro."
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}

function obtenerIDCarpeta($driveService, $nombre, $padreId) {
    $nombreEscapado = str_replace("'", "\\'", $nombre);
    $q = "name = '$nombreEscapado' and '$padreId' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    
    // --- AQUÍ ESTÁ LA MAGIA PARA LA UNIDAD COMPARTIDA ---
    $files = $driveService->files->listFiles([
        'q' => $q, 
        'fields' => 'files(id)',
        'supportsAllDrives' => true,
        'includeItemsFromAllDrives' => true,
        'corpora' => 'allDrives'
    ])->getFiles();
    
    return count($files) > 0 ? $files[0]->getId() : null;
}

function listarRecursivo($driveService, $folderId, $currentPath, &$result) {
    // --- Y AQUÍ TAMBIÉN SE AÑADEN LOS PARÁMETROS ---
    $files = $driveService->files->listFiles([
        'q'      => "'$folderId' in parents and trashed = false",
        'fields' => 'files(id, name, mimeType, webViewLink, createdTime)',
        'supportsAllDrives' => true,
        'includeItemsFromAllDrives' => true,
        'corpora' => 'allDrives'
    ])->getFiles();

    foreach ($files as $file) {
        $esCarpeta = $file->getMimeType() === 'application/vnd.google-apps.folder';
        $item = [
            'id'       => $file->getId(),
            'tipo'     => $esCarpeta ? 'carpeta' : 'archivo',
            'nombre'   => $file->getName(),
            'url'      => $file->getWebViewLink(),
            'fecha'    => $file->getCreatedTime(),
            'path'     => $currentPath,
            'driveId'  => $file->getId(),
        ];
        $result[] = $item;

        if ($esCarpeta) {
            listarRecursivo($driveService, $file->getId(), array_merge($currentPath, [$file->getName()]), $result);
        }
    }
}
?>