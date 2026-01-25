<?php
// upload.php - Script para subir imágenes
// Seguridad: Verificar sesión, tipos de archivo, etc.

session_start();

header('Content-Type: application/json');

// 1. Verificar autenticación (ajustar según tu sistema de login)
if (!isset($_SESSION['is_logged_in']) || $_SESSION['is_logged_in'] !== true) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado. No logueado.']);
    exit;
}

// 2. Configuración
$uploadDir = 'uploads/'; // Directorio relativo a este script
$thumbnailDir = $uploadDir . 'thumbnails/'; // Directorio para miniaturas
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}
if (!file_exists($thumbnailDir)) {
    mkdir($thumbnailDir, 0755, true);
}

/**
 * Genera una miniatura optimizada usando ImageMagick
 * @param string $sourcePath Ruta de la imagen original
 * @param string $thumbnailDir Directorio donde guardar la miniatura
 * @param int $size Tamaño de la miniatura (cuadrado)
 * @param int $quality Calidad JPEG (0-100)
 * @return string|null Ruta de la miniatura o null si falla
 */
function generateWebPThumbnail($sourcePath, $thumbnailDir, $size = 400, $quality = 80)
{
    // Verificar si ImageMagick está disponible
    $output = [];
    $returnCode = 0;
    @exec('convert -version 2>&1', $output, $returnCode);

    if ($returnCode !== 0) {
        // ImageMagick no disponible, retornar null (la app seguirá funcionando sin miniaturas)
        error_log('ImageMagick not available for thumbnail generation');
        return null;
    }

    // Generar nombre de archivo para miniatura
    $fileName = basename($sourcePath);
    $fileNameWithoutExt = pathinfo($fileName, PATHINFO_FILENAME);
    $thumbnailPath = $thumbnailDir . $fileNameWithoutExt . '.jpg'; // Usar JPEG en vez de WebP

    // Comando ImageMagick: redimensionar, crop cuadrado centrado, convertir a JPEG
    $command = sprintf(
        'convert %s -resize %dx%d^ -gravity center -extent %dx%d -quality %d %s 2>&1',
        escapeshellarg($sourcePath),
        $size,
        $size,
        $size,
        $size,
        $quality,
        escapeshellarg($thumbnailPath)
    );

    $output = [];
    $returnCode = 0;
    exec($command, $output, $returnCode);

    if ($returnCode === 0 && file_exists($thumbnailPath)) {
        return $thumbnailPath;
    } else {
        error_log('Failed to generate thumbnail with ImageMagick: ' . implode("\n", $output));
        return null;
    }
}

// 3. Procesar archivo
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['file'];
        $fileName = basename($file['name']);
        $fileTmpPath = $file['tmp_name'];
        $fileSize = $file['size'];
        $fileType = $file['type'];

        // Validar tipo de archivo (solo imágenes)
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($fileType, $allowedTypes)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Tipo de archivo no permitido. Solo JPG, PNG, GIF, WEBP.']);
            exit;
        }

        // Validar tamaño (ej. max 5MB)
        if ($fileSize > 5 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El archivo es demasiado grande (Max 5MB).']);
            exit;
        }

        // Generar nombre único para evitar colisiones
        $newFileName = uniqid('img_', true) . '.' . pathinfo($fileName, PATHINFO_EXTENSION);
        $destPath = $uploadDir . $newFileName;

        if (move_uploaded_file($fileTmpPath, $destPath)) {
            // Generar miniatura (con ImageMagick o fallback)
            $thumbnailPath = generateWebPThumbnail($destPath, $thumbnailDir);

            // Éxito
            echo json_encode([
                'success' => true,
                'message' => 'Archivo subido correctamente.',
                'url' => $destPath, // Devolver la ruta relativa para guardar en BD
                'thumbnail' => $thumbnailPath // Ruta de la miniatura (o null si falló)
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al mover el archivo subido.']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No se recibió ningún archivo o hubo un error en la subida.']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
}
?>