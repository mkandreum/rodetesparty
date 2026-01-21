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

    // 1. Procesar todos los archivos del ZIP
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $filename = $zip->getNameIndex($i);
        $baseName = basename($filename);
        if (empty($baseName))
            continue; // Saltar directorios

        // --- Caso A: Archivos JSON (Datos) ---
        if (substr($filename, -5) === '.json') {
            // Compatibilidad: aceptar tanto en data/ como en la raíz
            copy("zip://" . $file['tmp_name'] . "#" . $filename, $dataDir . $baseName);
        }

        // --- Caso B: Imágenes y Vídeos (uploads/) ---
        $isMedia = preg_match('/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|ogv)$/i', $filename);

        if ($isMedia) {
            $uploadsDir = __DIR__ . '/uploads/';
            if (!is_dir($uploadsDir)) {
                mkdir($uploadsDir, 0777, true);
            }

            // Si el archivo viene dentro de una carpeta 'uploads/' en el ZIP, mantenemos la estructura interna
            if (strpos($filename, 'uploads/') === 0) {
                $relativePath = substr($filename, strlen('uploads/'));
            } else {
                // Si es un backup plano (sin carpetas), lo ponemos directo en uploads/
                // NOTA: Esto ayuda a que coincida con las rutas 'uploads/archivo.png' guardadas en el JSON
                $relativePath = $filename;
            }

            if (empty($relativePath))
                continue;

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