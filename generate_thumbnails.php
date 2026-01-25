<?php
/**
 * Script de generación de miniaturas SIN dependencia de GD
 * Usa comandos del sistema (ImageMagick) si está disponible
 * Fallback: copia optimizada con JPEG
 */

// Rutas
$uploadsDir = __DIR__ . '/uploads/';
$thumbnailsDir = $uploadsDir . 'thumbnails/';
$dataFile = '/var/www/data_private/datos_app.json';

// Crear directorio de miniaturas si no existe
if (!file_exists($thumbnailsDir)) {
    mkdir($thumbnailsDir, 0755, true);
}

/**
 * Verifica si ImageMagick está disponible
 */
function checkImageMagick()
{
    $output = [];
    $returnCode = 0;
    @exec('convert -version 2>&1', $output, $returnCode);
    return $returnCode === 0;
}

/**
 * Genera miniatura usando ImageMagick (si está disponible)
 */
function generateThumbnailImageMagick($sourcePath, $thumbnailDir, $size = 400, $quality = 80)
{
    $fileName = basename($sourcePath);
    $fileNameWithoutExt = pathinfo($fileName, PATHINFO_FILENAME);
    $thumbnailPath = $thumbnailDir . $fileNameWithoutExt . '.jpg';

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

    return ($returnCode === 0 && file_exists($thumbnailPath)) ? $thumbnailPath : null;
}

/**
 * Fallback: simplemente copia la imagen como JPEG (sin redimensionar)
 * Útil si no hay ImageMagick ni GD
 */
function copyAsThumbnail($sourcePath, $thumbnailDir)
{
    $fileName = basename($sourcePath);
    $fileNameWithoutExt = pathinfo($fileName, PATHINFO_FILENAME);
    $thumbnailPath = $thumbnailDir . $fileNameWithoutExt . '.jpg';

    // Simplemente copiar el archivo
    if (copy($sourcePath, $thumbnailPath)) {
        return $thumbnailPath;
    }

    return null;
}

// Verificar capacidades del servidor
$hasImageMagick = checkImageMagick();

echo "<h1>Generación de Miniaturas - Modo Compatibilidad</h1>";
echo "<p><strong>ImageMagick:</strong> " . ($hasImageMagick ? "✅ Disponible" : "❌ No disponible") . "</p>";
echo "<p><strong>PHP GD:</strong> ❌ No disponible</p>";
echo "<hr>";

if (!$hasImageMagick) {
    echo "<div style='background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 10px 0;'>";
    echo "<strong>⚠️ Modo limitado:</strong> Sin GD ni ImageMagick, las miniaturas serán copias de las originales (no optimizadas).";
    echo "<br>Para mejor rendimiento, solicita a tu hosting habilitar PHP GD o ImageMagick.";
    echo "</div>";
}

echo "<p>Procesando imágenes en: <code>$uploadsDir</code></p>";
echo "<ul>";

// Escanear directorio uploads
$images = glob($uploadsDir . '*.{jpg,jpeg,png,gif,webp}', GLOB_BRACE);
$processed = 0;
$skipped = 0;
$errors = 0;

foreach ($images as $imagePath) {
    $fileName = basename($imagePath);
    $fileNameWithoutExt = pathinfo($fileName, PATHINFO_FILENAME);
    $expectedThumbnail = $thumbnailsDir . $fileNameWithoutExt . '.jpg';

    // Saltar si la miniatura ya existe
    if (file_exists($expectedThumbnail)) {
        echo "<li>⏭️  Saltado (ya existe): $fileName</li>";
        $skipped++;
        continue;
    }

    $result = null;

    // Intentar con ImageMagick primero
    if ($hasImageMagick) {
        $result = generateThumbnailImageMagick($imagePath, $thumbnailsDir);
    }

    // Fallback: copiar archivo
    if (!$result) {
        $result = copyAsThumbnail($imagePath, $thumbnailsDir);
    }

    if ($result) {
        $method = $hasImageMagick ? "ImageMagick" : "Copia";
        echo "<li>✅ Procesado ($method): $fileName → " . basename($result) . "</li>";
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

// Actualizar datos_app.json
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
                    $thumbnailPath = 'uploads/thumbnails/' . $nameWithoutExt . '.jpg';

                    if (file_exists(__DIR__ . '/' . $thumbnailPath)) {
                        $thumbnails[] = $thumbnailPath;
                    } else {
                        $thumbnails[] = null;
                    }
                }

                $event['galleryThumbnails'] = $thumbnails;
                $eventsUpdated++;
            }
        }

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

echo "<hr>";
echo "<p><strong>✅ Proceso completado</strong></p>";
echo "<p><a href='javascript:history.back()' style='padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;'>← Volver</a></p>";
?>