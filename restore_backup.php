<?php
session_start();

// --- Seguridad: Solo admin ---
if (!isset($_SESSION['is_logged_in']) || $_SESSION['is_logged_in'] !== true) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
    exit;
}

if (!isset($_FILES['backup_file'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No se recibió el archivo de respaldo']);
    exit;
}

$file = $_FILES['backup_file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Error en la subida: ' . $file['error']]);
    exit;
}

$zip = new ZipArchive();
if ($zip->open($file['tmp_name']) === TRUE) {

    // 1. Restaurar Datos Privados (JSON)
    $dataDir = '/var/www/data_private/';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0777, true);
    }

    // Buscar archivos en la carpeta 'data/' del ZIP
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $filename = $zip->getNameIndex($i);

        // Si el archivo está dentro de data/ y termina en .json
        if (strpos($filename, 'data/') === 0 && substr($filename, -5) === '.json') {
            $baseName = basename($filename);
            copy("zip://" . $file['tmp_name'] . "#" . $filename, $dataDir . $baseName);
        }

        // 2. Restaurar Imágenes (uploads/)
        if (strpos($filename, 'uploads/') === 0 && !empty(basename($filename))) {
            $uploadsDir = __DIR__ . '/uploads/';
            if (!is_dir($uploadsDir)) {
                mkdir($uploadsDir, 0777, true);
            }

            $relativePath = substr($filename, strlen('uploads/'));
            $targetPath = $uploadsDir . $relativePath;

            // Asegurar que existan subdirectorios si los hubiera
            $targetDir = dirname($targetPath);
            if (!is_dir($targetDir)) {
                mkdir($targetDir, 0777, true);
            }

            copy("zip://" . $file['tmp_name'] . "#" . $filename, $targetPath);
        }
    }

    $zip->close();
    echo json_encode(['success' => true, 'message' => 'Restauración completa realizada con éxito']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al abrir el archivo ZIP']);
}
?>