<?php
require_once __DIR__ . '/security_config.php';
startSecureSession();
setSecurityHeaders();
header('Content-Type: application/json');

if (empty($_SESSION['is_logged_in'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

// Validate CSRF token
$input = json_decode(file_get_contents('php://input'), true);
$csrfToken = $input['csrf_token'] ?? '';

if (!validateCSRFToken($csrfToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Token de seguridad inválido']);
    exit;
}

$dataFile = '/var/www/data_private/datos_app.json';
$inputData = file_get_contents('php://input');
$decoded = json_decode($inputData, true);

// Remove csrf_token from data before saving
if (isset($decoded['csrf_token'])) {
    unset($decoded['csrf_token']);
    $inputData = json_encode($decoded);
}

// Validar que sea JSON lícito
if ($decoded === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'JSON inválido']);
    exit;
}

// Asegurar directorio
$dir = dirname($dataFile);
if (!is_dir($dir)) {
    mkdir($dir, 0750, true);
}

if (file_put_contents($dataFile, $inputData) !== false) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al escribir archivo']);
}
?>
