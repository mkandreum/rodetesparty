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

    $filesProcessed = [];
    $errors = [];
    $dataDir = '/var/www/data_private/';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0777, true);
    }

    // 2. Procesar todos los archivos del ZIP
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $filename = $zip->getNameIndex($i);
        $baseName = basename($filename);
        if (empty($baseName))
            continue; // Saltar directorios

        $content = $zip->getFromIndex($i);
        if ($content === false) {
            $errors[] = "No se pudo leer el archivo: " . $filename;
            continue;
        }

        // --- Caso A: Archivos JSON (Datos) ---
        if (substr($filename, -5) === '.json') {
            $targetPath = $dataDir . $baseName;
            if (file_put_contents($targetPath, $content) !== false) {
                chmod($targetPath, 0666); // Permisos para que PHP pueda leer/escribir luego
                $filesProcessed[] = "Data: " . $baseName;
            } else {
                $errors[] = "Error al escribir data: " . $baseName;
            }
        }

        // --- Caso B: Imágenes y Vídeos (uploads/) ---
        $isMedia = preg_match('/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|ogv)$/i', $filename);

        if ($isMedia) {
            $uploadsDir = __DIR__ . '/uploads/';
            if (!is_dir($uploadsDir)) {
                mkdir($uploadsDir, 0777, true);
                chmod($uploadsDir, 0777);
            }

            // Si el archivo viene dentro de una carpeta 'uploads/' en el ZIP, mantenemos la estructura interna
            if (strpos($filename, 'uploads/') === 0) {
                $relativePath = substr($filename, strlen('uploads/'));
            } else {
                $relativePath = $filename;
            }

            if (empty($relativePath))
                continue;

            $targetPath = $uploadsDir . $relativePath;

            // Asegurar que existan subdirectorios si los hubiera
            $targetDir = dirname($targetPath);
            if (!is_dir($targetDir)) {
                mkdir($targetDir, 0777, true);
                chmod($targetDir, 0777);
            }

            if (file_put_contents($targetPath, $content) !== false) {
                chmod($targetPath, 0644); // Lectura para todos
                $filesProcessed[] = "Media: " . $relativePath;
            } else {
                $errors[] = "Error al escribir media: " . $relativePath;
            }
        }
    }

    $zip->close();
    echo json_encode([
        'success' => true,
        'message' => 'Restauración completada',
        'log' => [
            'count' => count($filesProcessed),
            'files' => array_slice($filesProcessed, 0, 10), // Solo primeros 10 para no saturar
            'errors' => $errors
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al abrir el archivo ZIP']);
}
?>