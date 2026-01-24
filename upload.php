<?php
/**
 * upload.php - Subida robusta de archivos para Rodetes
 * CON OPTIMIZACIÓN AUTOMÁTICA: WebP + Thumbnails
 */

// Desactivar visualización de errores para que no rompan el JSON
error_reporting(0);
ini_set('display_errors', 0);

session_start();
header('Content-Type: application/json');

function sendResponse($success, $message, $extra = [])
{
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit;
}

/**
 * Convierte una imagen a WebP y genera thumbnails
 * @param string $sourcePath Ruta de la imagen original
 * @param string $baseName Nombre base para los archivos de salida
 * @return array URLs de imagen principal y thumbnails
 */
function processImage($sourcePath, $baseName)
{
    $uploadDir = 'uploads/';
    $thumbDir = $uploadDir . 'thumbs/';

    // Crear directorio de thumbnails si no existe
    if (!is_dir($thumbDir)) {
        mkdir($thumbDir, 0777, true);
    }

    // Detectar tipo de imagen
    $imageInfo = getimagesize($sourcePath);
    if (!$imageInfo) {
        throw new Exception('No se pudo leer la información de la imagen');
    }

    $mimeType = $imageInfo['mime'];
    $originalWidth = $imageInfo[0];
    $originalHeight = $imageInfo[1];

    // Cargar imagen según tipo
    switch ($mimeType) {
        case 'image/jpeg':
            $sourceImage = imagecreatefromjpeg($sourcePath);
            break;
        case 'image/png':
            $sourceImage = imagecreatefrompng($sourcePath);
            break;
        case 'image/gif':
            $sourceImage = imagecreatefromgif($sourcePath);
            break;
        case 'image/webp':
            $sourceImage = imagecreatefromwebp($sourcePath);
            break;
        default:
            throw new Exception('Formato de imagen no soportado: ' . $mimeType);
    }

    if (!$sourceImage) {
        throw new Exception('Error al cargar la imagen');
    }

    // Generar nombre sin extensión
    $nameWithoutExt = pathinfo($baseName, PATHINFO_FILENAME);

    // Configuración de thumbnails (ancho máximo en px)
    $thumbSizes = [
        'small' => 400,
        'medium' => 800,
        'large' => 1200
    ];

    $result = [];

    // Generar imagen principal optimizada (máximo 1920px)
    $mainMaxWidth = 1920;
    if ($originalWidth > $mainMaxWidth) {
        $mainImage = resizeImage($sourceImage, $originalWidth, $originalHeight, $mainMaxWidth);
    } else {
        $mainImage = $sourceImage;
    }

    $mainPath = $uploadDir . $nameWithoutExt . '.webp';
    imagewebp($mainImage, $mainPath, 85); // Calidad 85%
    $result['url'] = $mainPath;

    if ($mainImage !== $sourceImage) {
        imagedestroy($mainImage);
    }

    // Generar thumbnails
    foreach ($thumbSizes as $sizeName => $maxWidth) {
        if ($originalWidth > $maxWidth) {
            $thumbImage = resizeImage($sourceImage, $originalWidth, $originalHeight, $maxWidth);
            $thumbPath = $thumbDir . $nameWithoutExt . '_' . $maxWidth . '.webp';
            imagewebp($thumbImage, $thumbPath, 80); // Calidad 80% para thumbnails
            $result['thumb_' . $sizeName] = $thumbPath;
            imagedestroy($thumbImage);
        } else {
            // Si la imagen original es más pequeña que el thumbnail, usar la principal
            $result['thumb_' . $sizeName] = $mainPath;
        }
    }

    // Liberar memoria
    imagedestroy($sourceImage);

    // Eliminar archivo temporal original si no es WebP
    if ($mimeType !== 'image/webp') {
        @unlink($sourcePath);
    }

    return $result;
}

/**
 * Redimensiona una imagen manteniendo aspecto
 */
function resizeImage($sourceImage, $originalWidth, $originalHeight, $maxWidth)
{
    $ratio = $originalWidth / $originalHeight;
    $newWidth = $maxWidth;
    $newHeight = (int) ($maxWidth / $ratio);

    $newImage = imagecreatetruecolor($newWidth, $newHeight);

    // Preservar transparencia para PNG
    imagealphablending($newImage, false);
    imagesavealpha($newImage, true);

    imagecopyresampled(
        $newImage,
        $sourceImage,
        0,
        0,
        0,
        0,
        $newWidth,
        $newHeight,
        $originalWidth,
        $originalHeight
    );

    return $newImage;
}

try {
    if (empty($_SESSION['is_logged_in'])) {
        http_response_code(403);
        sendResponse(false, 'No autorizado. Tu sesión puede haber expirado.');
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, 'Método no permitido');
    }

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errorMsg = 'No se recibió archivo';
        if (isset($_FILES['file'])) {
            switch ($_FILES['file']['error']) {
                case UPLOAD_ERR_INI_SIZE:
                    $errorMsg = 'El archivo excede upload_max_filesize';
                    break;
                case UPLOAD_ERR_FORM_SIZE:
                    $errorMsg = 'El archivo excede MAX_FILE_SIZE';
                    break;
                case UPLOAD_ERR_PARTIAL:
                    $errorMsg = 'Subida incompleta';
                    break;
                case UPLOAD_ERR_NO_FILE:
                    $errorMsg = 'No se subió ningún archivo';
                    break;
                case UPLOAD_ERR_NO_TMP_DIR:
                    $errorMsg = 'Falta carpeta temporal';
                    break;
                case UPLOAD_ERR_CANT_WRITE:
                    $errorMsg = 'Error al escribir en disco';
                    break;
            }
        }
        sendResponse(false, $errorMsg);
    }

    $uploadDir = 'uploads/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            sendResponse(false, 'No se pudo crear el directorio de subidas. Verifica permisos.');
        }
    }

    if (!is_writable($uploadDir)) {
        sendResponse(false, 'El directorio de subidas no tiene permisos de escritura.');
    }

    $file = $_FILES['file'];
    $fileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($file['name'])); // Sanitizar nombre
    $targetName = time() . '_' . $fileName;
    $targetPath = $uploadDir . $targetName;

    // Validar tipo de archivo
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    // Procesar según tipo
    if (strpos($mimeType, 'image/') === 0) {
        // Es una imagen - procesar con optimización
        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            http_response_code(500);
            sendResponse(false, 'Error al mover el archivo subido.');
        }

        try {
            $result = processImage($targetPath, $targetName);
            sendResponse(true, 'Imagen optimizada y subida con éxito', $result);
        } catch (Exception $e) {
            // Si falla la optimización, devolver imagen original
            sendResponse(true, 'Imagen subida (sin optimizar): ' . $e->getMessage(), ['url' => $targetPath]);
        }

    } elseif (strpos($mimeType, 'video/') === 0) {
        // Es un video - subir sin procesar
        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            sendResponse(true, 'Video subido con éxito', ['url' => $targetPath]);
        } else {
            http_response_code(500);
            sendResponse(false, 'Error al mover el archivo subido.');
        }
    } else {
        sendResponse(false, 'Tipo de archivo no permitido: ' . $mimeType);
    }

} catch (Exception $e) {
    http_response_code(500);
    sendResponse(false, 'Excepción en el servidor: ' . $e->getMessage());
} catch (Error $e) {
    http_response_code(500);
    sendResponse(false, 'Error fatal en el servidor: ' . $e->getMessage());
}
?>