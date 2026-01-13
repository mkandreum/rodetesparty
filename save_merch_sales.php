<?php
session_start();
header('Content-Type: application/json');

// --- Seguridad: Determinar si el usuario es admin ---
$isAdmin = isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'] === true;

$dataFile = '/var/www/data_private/merch_vendido.json';
$input = file_get_contents('php://input');

$newSales = json_decode($input, true);
if ($newSales === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'JSON inválido']);
    exit;
}

// --- Protección ---
if (!$isAdmin) {
    $currentSalesJson = file_exists($dataFile) ? file_get_contents($dataFile) : '[]';
    $currentSales = json_decode($currentSalesJson, true) ?: [];
    
    if (count($newSales) < count($currentSales)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Error: No puedes borrar ventas existentes.']);
        exit;
    }
}

// Asegurar directorio
$dir = dirname($dataFile);
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}

if (file_put_contents($dataFile, json_encode($newSales, JSON_PRETTY_PRINT)) !== false) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al escribir archivo']);
}
?>
