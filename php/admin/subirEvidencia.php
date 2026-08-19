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

    if (!isset($_FILES['archivo']) || !isset($_POST['evento_id'])) {
        throw new Exception("Datos incompletos: Faltan archivo o evento_id.");
    }

    $evento_id      = intval($_POST['evento_id']);
    $archivo        = $_FILES['archivo'];
    $carpetaDriveId = trim($_POST['carpeta_drive_id'] ?? '');

    // 1. Configurar cliente Google con CUENTA DE SERVICIO
    $client = new \Google_Client();
    $client->setAuthConfig(__DIR__ . '/../includes/credenciales-drive.json');
    $client->addScope(\Google_Service_Drive::DRIVE);

    $driveService  = new \Google_Service_Drive($client);
    $idCarpetaRaiz = '0AJ4PDsSEBerEUk9PVA'; // Tu Unidad Compartida

    // 2. Determinar carpeta destino
    if (!empty($carpetaDriveId)) {
        $idDestino = $carpetaDriveId;
    } else {
        $stmtEvento = $conexion->prepare("SELECT nombre FROM evento WHERE id = ?");
        $stmtEvento->bind_param("i", $evento_id);
        $stmtEvento->execute();
        $res          = $stmtEvento->get_result()->fetch_assoc();
        $nombreEvento = $res ? $res['nombre'] : "Evento_" . $evento_id;
        $idDestino    = obtenerOcrearCarpeta($driveService, $nombreEvento, [$idCarpetaRaiz]);
    }

    // 3. Subir archivo a la carpeta destino
    $fileMetadata = new \Google_Service_Drive_DriveFile([
        'name'    => $archivo['name'],
        'parents' => [$idDestino],
    ]);

    $content   = file_get_contents($archivo['tmp_name']);
    $driveFile = $driveService->files->create($fileMetadata, [
        'data'              => $content,
        'mimeType'          => $archivo['type'],
        'uploadType'        => 'multipart',
        'fields'            => 'id, webViewLink, thumbnailLink',
        'supportsAllDrives' => true // <--- AQUÍ SE AÑADIÓ PARA SUBIR EL ARCHIVO
    ]);

    // 4. Hacer el archivo público para poder previsualizar
    $driveService->permissions->create(
        $driveFile->id,
        new \Google_Service_Drive_Permission(['type' => 'anyone', 'role' => 'reader']),
        ['supportsAllDrives' => true] // <--- AQUÍ SE AÑADIÓ PARA LOS PERMISOS
    );

    // 5. Guardar en BD
    $stmt = $conexion->prepare(
        "INSERT INTO evidencia (evento_id, drive_file_id, tipo_archivo, url_vista) VALUES (?, ?, ?, ?)"
    );
    $stmt->bind_param("isss", $evento_id, $driveFile->id, $archivo['type'], $driveFile->webViewLink);
    $stmt->execute();

    $previewUrl = "https://drive.google.com/uc?export=view&id=" . $driveFile->id;

    echo json_encode([
        'success'      => true,
        'mensaje'      => 'Archivo subido correctamente',
        'url'          => $driveFile->webViewLink,
        'preview_url'  => $previewUrl,
        'drive_id'     => $driveFile->id,
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

    // AQUÍ SE AÑADIÓ PARA BUSCAR CARPETAS EN LA UNIDAD COMPARTIDA
    $files = $driveService->files->listFiles([
        'q'                         => $query,
        'supportsAllDrives'         => true,
        'includeItemsFromAllDrives' => true,
        'corpora'                   => 'allDrives'
    ])->getFiles();

    if (count($files) > 0) return $files[0]->getId();

    $metadata = new Google_Service_Drive_DriveFile([
        'name'     => $nombre,
        'parents'  => $padres,
        'mimeType' => 'application/vnd.google-apps.folder',
    ]);
    
    // AQUÍ SE AÑADIÓ PARA CREAR CARPETAS EN LA UNIDAD COMPARTIDA
    return $driveService->files->create($metadata, [
        'fields'            => 'id',
        'supportsAllDrives' => true
    ])->id;
}
?>