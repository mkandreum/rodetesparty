<?php
session_start();
header('Content-Type: application/json');

// Solo admin puede obtener configuración SMTP
$isAdmin = isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'] === true;
if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

$dataFile = '/var/www/data_private/smtp_config.json';

if (!file_exists($dataFile)) {
    echo json_encode(['success' => true, 'config' => null]);
    exit;
}

$configJson = file_get_contents($dataFile);
$config = json_decode($configJson, true);

if ($config === null) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al leer configuración']);
    exit;
}

// NO enviar el password al frontend por seguridad
unset($config['password']);

echo json_encode(['success' => true, 'config' => $config]);
?>