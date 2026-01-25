<?php
/**
 * Script para generar miniaturas WebP de imágenes existentes
 * Ejecutar una sola vez (o cuando sea necesario) desde el navegador o CLI
 */

// Verificar que GD esté disponible
if (!extension_loaded('gd')) {
    die('Error: La extensión GD de PHP no está disponible. Se requiere para el procesamiento de imágenes.');
}

// Rutas
$uploadsDir = __DIR__ . '/uploads/';
$thumbnailsDir = $uploadsDir . 'thumbnails/';
$dataFile = '/var/www/data_private/datos_app.json';

// Crear directorio de miniaturas si no existe
if (!file_exists($thumbnailsDir)) {
    mkdir($thumbnailsDir, 0755, true);
}

/**
 * Genera una miniatura WebP optimizada de una imagen
 */
function generateThumbnail($sourcePath, $thumbnailDir, $size = 400, $quality = 80)
{
    $imageInfo = @getimagesize($sourcePath);
    if ($imageInfo === false) {
        return null;
    }

    $mime = $imageInfo['mime'];

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
            return null;
    }

    if ($sourceImage === false) {
        return null;
    }

    $originalWidth = imagesx($sourceImage);
    $originalHeight = imagesy($sourceImage);

    // Crop cuadrado centrado
    $cropSize = min($originalWidth, $originalHeight);
    $cropX = ($originalWidth - $cropSize) / 2;
    $cropY = ($originalHeight - $cropSize) / 2;

    $thumbnail = imagecreatetruecolor($size, $size);
    imagealphablending($thumbnail, false);
    imagesavealpha($thumbnail, true);

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

    $fileName = basename($sourcePath);
    $fileNameWithoutExt = pathinfo($fileName, PATHINFO_FILENAME);
    $thumbnailPath = $thumbnailDir . $fileNameWithoutExt . '.webp';

    $success = imagewebp($thumbnail, $thumbnailPath, $quality);

    imagedestroy($sourceImage);
    imagedestroy($thumbnail);

    return $success ? $thumbnailPath : null;
}

// Escanear directorio uploads
$images = glob($uploadsDir . '*.{jpg,jpeg,png,gif,webp}', GLOB_BRACE);
$processed = 0;
$skipped = 0;
$errors = 0;

echo "<h1>Generación de Miniaturas WebP</h1>";
echo "<p>Procesando imágenes en: $uploadsDir</p>";
echo "<ul>";

foreach ($images as $imagePath) {
    $fileName = basename($imagePath);
    $fileNameWithoutExt = pathinfo($fileName, PATHINFO_FILENAME);
    $expectedThumbnail = $thumbnailsDir . $fileNameWithoutExt . '.webp';

    // Saltar si la miniatura ya existe
    if (file_exists($expectedThumbnail)) {
        echo "<li>⏭️  Saltado (ya existe): $fileName</li>";
        $skipped++;
        continue;
    }

    $result = generateThumbnail($imagePath, $thumbnailsDir);

    if ($result) {
        echo "<li>✅ Procesado: $fileName → " . basename($result) . "</li>";
        $processed++;
    } else {
        echo "<li>❌ Error: $fileName</li>";
        $errors++;
    }
}

echo "</ul>";
echo "<h2>Resumen</h2>";
echo "<p>Procesadas: <strong>$processed</strong></p>";
echo "<p>Saltadas (ya existían): <strong>$skipped</strong></p>";
echo "<p>Errores: <strong>$errors</strong></p>";

// Cargar datos_app.json y actualizar referencias
if (file_exists($dataFile)) {
    echo "<h2>Actualizando datos_app.json</h2>";

    $jsonContent = file_get_contents($dataFile);
    $appState = json_decode($jsonContent, true);

    if ($appState && isset($appState['events'])) {
        $eventsUpdated = 0;

        foreach ($appState['events'] as &$event) {
            if (isset($event['galleryImages']) && is_array($event['galleryImages'])) {
                $thumbnails = [];
                foreach ($event['galleryImages'] as $imageUrl) {
                    $imageName = basename($imageUrl);
                    $nameWithoutExt = pathinfo($imageName, PATHINFO_FILENAME);
                    $thumbnailPath = 'uploads/thumbnails/' . $nameWithoutExt . '.webp';

                    // Verificar que la miniatura exista
                    if (file_exists(__DIR__ . '/' . $thumbnailPath)) {
                        $thumbnails[] = $thumbnailPath;
                    } else {
                        $thumbnails[] = null; // Mantener null para fallback
                    }
                }

                $event['galleryThumbnails'] = $thumbnails;
                $eventsUpdated++;
            }
        }

        // Guardar archivo actualizado
        $success = file_put_contents($dataFile, json_encode($appState, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        if ($success) {
            echo "<p>✅ Actualizado $eventsUpdated eventos con referencias de miniaturas</p>";
        } else {
            echo "<p>❌ Error al guardar datos_app.json</p>";
        }
    }
} else {
    echo "<p>⚠️  Archivo datos_app.json no encontrado</p>";
}

echo "<p><strong>¡Proceso completado!</strong></p>";
?>