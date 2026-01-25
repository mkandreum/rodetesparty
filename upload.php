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
 * Genera una miniatura WebP optimizada usando PHP GD
 * @param string $sourcePath Ruta de la imagen original
 * @param string $thumbnailDir Directorio donde guardar la miniatura
 * @param int $size Tamaño de la miniatura (cuadrado)
 * @param int $quality Calidad WebP (0-100)
 * @return array Array with ['path' => string|null, 'error' => string|null]
 */
function generateWebPThumbnail($sourcePath, $thumbnailDir, $size = 400, $quality = 80)
{
    // Verificar que GD está disponible
    if (!extension_loaded('gd')) {
        error_log('PHP GD extension not available for thumbnail generation');
        return ['path' => null, 'error' => 'PHP GD extension not available'];
    }

    // Generar nombre de archivo para miniatura (WebP)
    $fileName = basename($sourcePath);
    $fileNameWithoutExt = pathinfo($fileName, PATHINFO_FILENAME);
    $thumbnailPath = $thumbnailDir . $fileNameWithoutExt . '.webp'; // WebP format

    try {
        // Detectar tipo de imagen y cargar
        $imageInfo = getimagesize($sourcePath);
        if ($imageInfo === false) {
            throw new Exception('No se pudo leer la imagen');
        }

        $sourceImage = null;
        switch ($imageInfo[2]) {
            case IMAGETYPE_JPEG:
                $sourceImage = imagecreatefromjpeg($sourcePath);
                break;
            case IMAGETYPE_PNG:
                $sourceImage = imagecreatefrompng($sourcePath);
                break;
            case IMAGETYPE_GIF:
                $sourceImage = imagecreatefromgif($sourcePath);
                break;
            case IMAGETYPE_WEBP:
                $sourceImage = imagecreatefromwebp($sourcePath);
                break;
            default:
                throw new Exception('Tipo de imagen no soportado');
        }

        if ($sourceImage === false) {
            throw new Exception('No se pudo crear la imagen desde el archivo');
        }

        // Obtener dimensiones originales
        $srcWidth = imagesx($sourceImage);
        $srcHeight = imagesy($sourceImage);

        // Calcular crop cuadrado centrado
        $minDim = min($srcWidth, $srcHeight);
        $srcX = ($srcWidth - $minDim) / 2;
        $srcY = ($srcHeight - $minDim) / 2;

        // Crear imagen de destino
        $thumbnail = imagecreatetruecolor($size, $size);
        if ($thumbnail === false) {
            imagedestroy($sourceImage);
            throw new Exception('No se pudo crear la imagen de miniatura');
        }

        // Redimensionar con crop cuadrado
        imagecopyresampled(
            $thumbnail,
            $sourceImage,
            0,
            0,
            $srcX,
            $srcY,
            $size,
            $size,
            $minDim,
            $minDim
        );

        // Guardar como WebP
        $success = imagewebp($thumbnail, $thumbnailPath, $quality);

        // Liberar memoria
        imagedestroy($sourceImage);
        imagedestroy($thumbnail);

        if ($success && file_exists($thumbnailPath)) {
            return ['path' => $thumbnailPath, 'error' => null];
        } else {
            throw new Exception('No se pudo guardar la miniatura WebP (imagewebp returned false)');
        }
    } catch (Exception $e) {
        error_log('Error generating WebP thumbnail: ' . $e->getMessage());
        return ['path' => null, 'error' => $e->getMessage()];
    }
}

// 3. Procesar archivo
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Aumentar memoria para procesamiento de imágenes
    ini_set('memory_limit', '512M');

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
            // Generar miniatura (con PHP GD generando WebP)
            $thumbResult = generateWebPThumbnail($destPath, $thumbnailDir);
            $thumbnailPath = $thumbResult['path'];
            $thumbnailError = $thumbResult['error'];

            // Éxito
            echo json_encode([
                'success' => true,
                'message' => 'Archivo subido correctamente.',
                'url' => $destPath, // Ruta de imagen completa
                'thumbnail' => $thumbnailPath, // Ruta de miniatura WebP (o null si falló)
                'thumbnail_error' => $thumbnailError // Debug info
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