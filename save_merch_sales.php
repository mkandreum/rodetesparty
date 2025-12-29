<?php
header('Content-Type: application/json');

// NOTA: Similar a save_tickets.php, permitimos escritura para registrar ventas públicas.

$dataFile = '/var/www/data_private/merch_vendido.json';
$input = file_get_contents('php://input');

// Validar que sea JSON lícito
if (json_decode($input) === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'JSON inválido']);
    exit;
}

// Asegurar directorio
$dir = dirname($dataFile);
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}

if (file_put_contents($dataFile, $input) !== false) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al escribir archivo']);
}
?>
