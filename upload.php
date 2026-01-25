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
 * Genera una miniatura WebP optimizada de una imagen
 * @param string $sourcePath Ruta de la imagen original
 * @param string $thumbnailDir Directorio donde guardar la miniatura
 * @param int $size Tamaño de la miniatura (cuadrado)
 * @param int $quality Calidad WebP (0-100)
 * @return string|null Ruta de la miniatura o null si falla
 */
function generateWebPThumbnail($sourcePath, $thumbnailDir, $size = 400, $quality = 80)
{
    // Verificar que GD está disponible
    if (!extension_loaded('gd')) {
        error_log('GD extension not available for thumbnail generation');
        return null;
    }

    // Obtener información de la imagen
    $imageInfo = @getimagesize($sourcePath);
    if ($imageInfo === false) {
        error_log('Failed to get image info for: ' . $sourcePath);
        return null;
    }

    $mime = $imageInfo['mime'];

    // Crear imagen desde el archivo según tipo
    switch ($mime) {
        case 'image/jpeg':
            $sourceImage = @imagecreatefromjpeg($sourcePath);
            break;
        case 'image/png':
            $sourceImage = @imagecreatefrompng($sourcePath);
            break;
        case 'image/gif':
            $sourceImage = @imagecreatefromgif($sourcePath);
            break;
        case 'image/webp':
            $sourceImage = @imagecreatefromwebp($sourcePath);
            break;
        default:
            error_log('Unsupported image type for thumbnail: ' . $mime);
            return null;
    }

    if ($sourceImage === false) {
        error_log('Failed to create image resource from: ' . $sourcePath);
        return null;
    }

    // Obtener dimensiones originales
    $originalWidth = imagesx($sourceImage);
    $originalHeight = imagesy($sourceImage);

    // Calcular dimensiones manteniendo aspecto (crop cuadrado centrado)
    $cropSize = min($originalWidth, $originalHeight);
    $cropX = ($originalWidth - $cropSize) / 2;
    $cropY = ($originalHeight - $cropSize) / 2;

    // Crear imagen de miniatura
    $thumbnail = imagecreatetruecolor($size, $size);

    // Preservar transparencia para PNG/GIF
    imagealphablending($thumbnail, false);
    imagesavealpha($thumbnail, true);

    // Redimensionar con crop centrado
    imagecopyresampled(
        $thumbnail,
        $sourceImage,
        0,
        0,
        $cropX,
        $cropY,
        $size,
        $size,
        $cropSize,
        $cropSize
    );

    // Generar nombre de archivo para miniatura
    $fileName = basename($sourcePath);
    $fileNameWithoutExt = pathinfo($fileName, PATHINFO_FILENAME);
    $thumbnailPath = $thumbnailDir . $fileNameWithoutExt . '.webp';

    // Guardar como WebP
    $success = imagewebp($thumbnail, $thumbnailPath, $quality);

    // Liberar memoria
    imagedestroy($sourceImage);
    imagedestroy($thumbnail);

    if ($success) {
        return $thumbnailPath;
    } else {
        error_log('Failed to save WebP thumbnail: ' . $thumbnailPath);
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
            // Generar miniatura WebP
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