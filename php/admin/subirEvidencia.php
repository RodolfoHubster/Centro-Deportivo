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
    // carpeta_drive_id: ID de la carpeta de Drive donde subir el archivo.
    // Si viene vacío, se sube directo a la carpeta del evento.
    $carpetaDriveId = trim($_POST['carpeta_drive_id'] ?? '');

    // 1. Configurar cliente Google
    $client = new \Google_Client();
    $client->setAuthConfig(__DIR__ . '/../includes/credenciales-drive.json');
    $client->addScope(\Google_Service_Drive::DRIVE);

    $tokenPath   = __DIR__ . '/../includes/token.json';
    $accessToken = json_decode(file_get_contents($tokenPath), true);
    $client->setAccessToken($accessToken);

    if ($client->isAccessTokenExpired()) {
        $client->fetchAccessTokenWithRefreshToken($client->getRefreshToken());
        file_put_contents($tokenPath, json_encode($client->getAccessToken()));
    }

    $driveService  = new \Google_Service_Drive($client);
    $idCarpetaRaiz = '1gWLuRNotiGd9LqOctPSoOxoC3wS8GJY2';

    // 2. Determinar carpeta destino
    if (!empty($carpetaDriveId)) {
        // El usuario está dentro de una carpeta específica → subir ahí directamente
        $idDestino = $carpetaDriveId;
    } else {
        // Está en la raíz del evento → subir a la carpeta del evento
        $stmtEvento = $conexion->prepare("SELECT nombre FROM evento WHERE id = ?");
        $stmtEvento->bind_param("i", $evento_id);
        $stmtEvento->execute();
        $res         = $stmtEvento->get_result()->fetch_assoc();
        $nombreEvento = $res ? $res['nombre'] : "Evento_" . $evento_id;
        $idDestino   = obtenerOcrearCarpeta($driveService, $nombreEvento, [$idCarpetaRaiz]);
    }

    // 3. Subir archivo a la carpeta destino
    $fileMetadata = new \Google_Service_Drive_DriveFile([
        'name'    => $archivo['name'],
        'parents' => [$idDestino],
    ]);

    $content   = file_get_contents($archivo['tmp_name']);
    $driveFile = $driveService->files->create($fileMetadata, [
        'data'       => $content,
        'mimeType'   => $archivo['type'],
        'uploadType' => 'multipart',
        'fields'     => 'id, webViewLink, thumbnailLink',
    ]);

    // 4. Hacer el archivo público para poder previsualizar
    $driveService->permissions->create(
        $driveFile->id,
        new \Google_Service_Drive_Permission(['type' => 'anyone', 'role' => 'reader'])
    );

    // 5. Guardar en BD
    $stmt = $conexion->prepare(
        "INSERT INTO evidencia (evento_id, drive_file_id, tipo_archivo, url_vista) VALUES (?, ?, ?, ?)"
    );
    $stmt->bind_param("isss", $evento_id, $driveFile->id, $archivo['type'], $driveFile->webViewLink);
    $stmt->execute();

    // Construir URL de previsualización directa (para imágenes/video)
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

    $files = $driveService->files->listFiles(['q' => $query])->getFiles();
    if (count($files) > 0) return $files[0]->getId();

    $metadata = new Google_Service_Drive_DriveFile([
        'name'     => $nombre,
        'parents'  => $padres,
        'mimeType' => 'application/vnd.google-apps.folder',
    ]);
    return $driveService->files->create($metadata, ['fields' => 'id'])->id;
}
?>