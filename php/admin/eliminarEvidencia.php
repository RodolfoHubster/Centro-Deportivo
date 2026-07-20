<?php
require_once __DIR__ . '/../../vendor/autoload.php';

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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'mensaje' => 'Método no permitido']);
    exit;
}

$driveId = $_POST['drive_id'] ?? '';

if (empty($driveId)) {
    echo json_encode(['success' => false, 'mensaje' => 'drive_id requerido']);
    exit;
}

try {
    // En Drive, eliminar una carpeta elimina todo su contenido automáticamente.
    // Usamos delete() que manda al trash, o podemos usar emptying permanently.
    // Para mandarlo a la papelera de Drive (más seguro):
    $driveService->files->delete($driveId);

    echo json_encode(['success' => true]);
} catch (\Google_Service_Exception $e) {
    $msg = $e->getMessage();
    // Si el archivo ya no existe en Drive, lo consideramos éxito
    if ($e->getCode() === 404) {
        echo json_encode(['success' => true, 'mensaje' => 'El archivo ya no existía en Drive']);
    } else {
        echo json_encode(['success' => false, 'mensaje' => 'Error de Drive: ' . $msg]);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}
?>
