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

    $driveId = trim($_POST['drive_id'] ?? '');

    if (empty($driveId)) {
        throw new Exception("drive_id requerido para eliminar.");
    }

    $client = new \Google_Client();
    $client->setAuthConfig(__DIR__ . '/../includes/credenciales-drive.json');
    $client->addScope(\Google_Service_Drive::DRIVE);

    $driveService = new \Google_Service_Drive($client);

    // 2. ENVIAR A LA PAPELERA (Más seguro que la destrucción total)
    try {
        $archivoActualizado = new \Google_Service_Drive_DriveFile();
        $archivoActualizado->setTrashed(true); // Le decimos a Google que lo mande a la papelera
        
        $driveService->files->update($driveId, $archivoActualizado, [
            'supportsAllDrives' => true
        ]);
    } catch (\Google_Service_Exception $e) {
        // Quitamos la evasión de errores para que si falla, nos diga la verdad en tu pestaña de Response
        throw new Exception("Error de Google Drive: " . $e->getMessage());
    }

    // 3. ELIMINAR DE LA BASE DE DATOS
    $stmt = $conexion->prepare("DELETE FROM evidencia WHERE drive_file_id = ?");
    $stmt->bind_param("s", $driveId);
    $stmt->execute();

    echo json_encode([
        'success' => true, 
        'mensaje' => '¡Archivo enviado a la papelera y registro eliminado de BD!'
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'mensaje' => $e->getMessage()]);
}
?>