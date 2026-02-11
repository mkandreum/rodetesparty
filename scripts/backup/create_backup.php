<?php
require_once __DIR__ . '/../../config/security_config.php';
startSecureSession();

// --- Seguridad: Solo admin ---
if (!isset($_SESSION['is_logged_in']) || $_SESSION['is_logged_in'] !== true) {
    http_response_code(403);
    die("Acceso denegado");
}

$zipFileName = 'backup_rodetes_' . date('Y-m-d_H-i-s') . '.zip';
$zipPath = sys_get_temp_dir() . '/' . $zipFileName;

$zip = new ZipArchive();
if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
    http_response_code(500);
    die("Error al crear el archivo ZIP");
}

// 1. Añadir archivos JSON de datos privados
$dataDir = '/var/www/data_private/';
if (is_dir($dataDir)) {
    $files = glob($dataDir . '*.json');
    foreach ($files as $file) {
        if (is_file($file)) {
            // Guardar dentro de carpeta 'data/' en el zip
            $zip->addFile($file, 'data/' . basename($file));
        }
    }
}

// 2. Añadir imágenes de uploads/
$uploadsDir = __DIR__ . '/uploads/';
if (is_dir($uploadsDir)) {
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($uploadsDir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );

    foreach ($files as $name => $file) {
        if (!$file->isDir()) {
            $filePath = $file->getRealPath();
            $relativePath = substr($filePath, strlen($uploadsDir));
            // Guardar dentro de carpeta 'uploads/' en el zip
            $zip->addFile($filePath, 'uploads/' . $relativePath);
        }
    }
}

$zip->close();

// 3. Servir el archivo
if (file_exists($zipPath)) {
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $zipFileName . '"');
    header('Content-Length: ' . filesize($zipPath));
    header('Pragma: no-cache');
    header('Expires: 0');
    readfile($zipPath);

    // Borrar temporal
    unlink($zipPath);
    exit;
} else {
    http_response_code(500);
    die("Error al generar el archivo de respaldo.");
}
?>