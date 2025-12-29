<?php
header('Content-Type: application/json');

// NOTA: En un entorno real, esto debería validar el origen o token.
// Como es una app "legacy" reconvertida donde el cliente gestiona la compra, 
// permitimos escritura si el formato es correcto.

$dataFile = '/var/www/data_private/entradas_db.json';
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
