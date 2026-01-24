<?php
// Desactivar salida de errores HTML, solo log
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

session_start();

try {
    // --- Seguridad: Solo admin ---
    if (!isset($_SESSION['is_logged_in']) || $_SESSION['is_logged_in'] !== true) {
        throw new Exception('Acceso denegado', 403);
    }

    if (!isset($_FILES['backup_file'])) {
        throw new Exception('No se recibió el archivo de respaldo', 400);
    }

    $file = $_FILES['backup_file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Error en la subida: código ' . $file['error'], 400);
    }

    // Verificar extensión ZIP
    if (!class_exists('ZipArchive')) {
        throw new Exception('La extensión ZIP de PHP no está instalada en el servidor.', 500);
    }

    $zip = new ZipArchive();
    $res = $zip->open($file['tmp_name']);

    if ($res !== TRUE) {
        throw new Exception("Error al abrir el archivo ZIP. Código: $res", 500);
    }

    $filesProcessed = [];
    $errors = [];
    $dataDir = '/var/www/data_private/';

    // Asegurar directorio data_private
    if (!is_dir($dataDir)) {
        if (!mkdir($dataDir, 0777, true)) {
            throw new Exception("No se pudo crear el directorio de datos privados.", 500);
        }
    }

    // Procesar ZIP
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $filename = $zip->getNameIndex($i);
        $baseName = basename($filename);
        if (empty($baseName) || substr($filename, -1) === '/')
            continue; // Directorios

        $content = $zip->getFromIndex($i);
        if ($content === false) {
            $errors[] = "No se pudo leer: " . $filename;
            continue;
        }

        // --- A: JSON Data ---
        if (substr($filename, -5) === '.json') {
            $targetPath = $dataDir . $baseName;
            if (file_put_contents($targetPath, $content) !== false) {
                chmod($targetPath, 0666);
                $filesProcessed[] = "Data: " . $baseName;
            } else {
                $errors[] = "Error escribiendo: " . $baseName;
            }
        }

        // --- B: Media (uploads/) ---
        if (preg_match('/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|ogv)$/i', $filename)) {
            $uploadsDir = __DIR__ . '/uploads/';
            if (!is_dir($uploadsDir)) {
                mkdir($uploadsDir, 0777, true);
                chmod($uploadsDir, 0777);
            }

            // Normalizar ruta relativa (quitar prefijo uploads/ si existe)
            $relativePath = $filename;
            if (strpos($filename, 'uploads/') === 0) {
                $relativePath = substr($filename, strlen('uploads/'));
            }

            // Seguridad: evitar Path Traversal
            $relativePath = str_replace(['../', '..\\'], '', $relativePath);

            if (empty($relativePath))
                continue;

            $targetPath = $uploadsDir . $relativePath;
            $targetDir = dirname($targetPath);

            if (!is_dir($targetDir)) {
                mkdir($targetDir, 0777, true);
                chmod($targetDir, 0777);
            }

            if (file_put_contents($targetPath, $content) !== false) {
                chmod($targetPath, 0644);
                $filesProcessed[] = "Media: " . $relativePath;
            } else {
                $errors[] = "Error escribiendo media: " . $relativePath;
            }
        }
    }

    $zip->close();

    echo json_encode([
        'success' => true,
        'message' => 'Restauración completada con éxito.',
        'log' => [
            'count' => count($filesProcessed),
            'files' => array_slice($filesProcessed, 0, 10),
            'errors' => $errors
        ]
    ]);

} catch (Exception $e) {
    if ($e->getCode() && is_int($e->getCode()) && $e->getCode() >= 400 && $e->getCode() < 600) {
        http_response_code($e->getCode());
    } else {
        http_response_code(500);
    }
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>