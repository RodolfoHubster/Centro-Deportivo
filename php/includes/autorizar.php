<?php
require_once __DIR__ . '/../../vendor/autoload.php';

$client = new Google_Client();
$client->setAuthConfig(__DIR__ . '/credenciales-drive.json'); // El que descargaste
$client->setAccessType('offline');
$client->setApprovalPrompt('force');
$client->setIncludeGrantedScopes(true);
$client->addScope(Google_Service_Drive::DRIVE);
$client->setRedirectUri('http://localhost/Centro-Deportivo/php/includes/autorizar.php');

if (!isset($_GET['code'])) {
    $auth_url = $client->createAuthUrl();
    header('Location: ' . filter_var($auth_url, FILTER_SANITIZE_URL));
} else {
    $client->authenticate($_GET['code']);
    file_put_contents(__DIR__ . '/token.json', json_encode($client->getAccessToken()));
    echo "¡Éxito! El archivo token.json ha sido generado.";
}