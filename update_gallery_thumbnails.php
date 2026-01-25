<?php
/**
 * Script auxiliar para actualizar datos_app.json con referencias de miniaturas
 * Usado por generate_thumbnails_client.html
 */

session_start();

header('Content-Type: application/json');

// Verificar autenticación
if (!isset($_SESSION['is_logged_in']) || $_SESSION['is_logged_in'] !== true) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

// Obtener datos del POST
$input = file_get_contents('php://input');
$galleryData = json_decode($input, true);

if (!$galleryData) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
    exit;
}

$dataFile = '/var/www/data_private/datos_app.json';

try {
    // Leer datos actuales
    if (!file_exists($dataFile)) {
        throw new Exception('Archivo datos_app.json no encontrado');
    }

    $jsonContent = file_get_contents($dataFile);
    $appState = json_decode($jsonContent, true);

    if (!$appState || !isset($appState['events'])) {
        throw new Exception('Datos de aplicación inválidos');
    }

    // Actualizar cada evento con sus miniaturas
    $updated = 0;
    foreach ($appState['events'] as &$event) {
        if (isset($galleryData[$event['id']])) {
            $event['galleryImages'] = $galleryData[$event['id']]['images'];
            $event['galleryThumbnails'] = $galleryData[$event['id']]['thumbnails'];
            $updated++;
        }
    }

    // Guardar cambios
    $success = file_put_contents($dataFile, json_encode($appState, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    if ($success === false) {
        throw new Exception('Error al guardar datos_app.json');
    }

    echo json_encode([
        'success' => true,
        'message' => "Actualizado correctamente",
        'eventsUpdated' => $updated
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>