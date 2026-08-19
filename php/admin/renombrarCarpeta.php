<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../includes/conexion.php';

header('Content-Type: application/json');

try {
    // 1. Configurar Cliente de Google Drive
    $client = new \Google_Client();
    $client->setAuthConfig(__DIR__ . '/../includes/credenciales-drive.json');
    $client->addScope(\Google_Service_Drive::DRIVE);
    $driveService = new \Google_Service_Drive($client);

    // 2. Recibir datos
    $drive_id = trim($_POST['drive_id'] ?? '');
    $nuevo_nombre = trim($_POST['nuevo_nombre'] ?? '');

    if (empty($drive_id) || empty($nuevo_nombre)) {
        throw new Exception("Faltan datos requeridos (drive_id, nuevo_nombre)");
    }

    // 3. Preparar el nuevo archivo/carpeta con el nuevo nombre
    $emptyFile = new \Google_Service_Drive_DriveFile();
    $emptyFile->setName($nuevo_nombre);

    // 4. Actualizar en Drive
    $driveService->files->update($drive_id, $emptyFile, [
        'supportsAllDrives' => true
    ]);

    echo json_encode(['success' => true, 'mensaje' => 'Renombrado correctamente en Drive']);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}
?>
