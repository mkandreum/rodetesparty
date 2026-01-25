#!/usr/bin/env php
<?php
/**
 * Script CLI para actualizar referencias de miniaturas en datos_app.json
 * Cambia todas las rutas .jpg por .webp en galleryThumbnails
 * Uso: php update_json_thumbnails_to_webp.php
 */

// Verificar que se ejecuta desde CLI
if (php_sapi_name() !== 'cli') {
    die("Este script solo puede ejecutarse desde línea de comandos\n");
}

echo "📝 Actualizador de Referencias de Miniaturas\n";
echo "===========================================\n\n";

$dataFile = '/var/www/data_private/datos_app.json';

if (!file_exists($dataFile)) {
    die("❌ Error: Archivo no encontrado: $dataFile\n");
}

// Leer datos
echo "📖 Leyendo datos_app.json...\n";
$jsonContent = file_get_contents($dataFile);
$appState = json_decode($jsonContent, true);

if (!$appState || !isset($appState['events'])) {
    die("❌ Error: Datos inválidos en datos_app.json\n");
}

$eventsUpdated = 0;
$thumbnailsUpdated = 0;

// Procesar cada evento
foreach ($appState['events'] as &$event) {
    if (!isset($event['galleryThumbnails']) || !is_array($event['galleryThumbnails'])) {
        continue;
    }

    $hasChanges = false;

    foreach ($event['galleryThumbnails'] as &$thumbnail) {
        if ($thumbnail && is_string($thumbnail)) {
            // Cambiar .jpg por .webp
            $newThumbnail = preg_replace('/\.jpe?g$/i', '.webp', $thumbnail);

            if ($newThumbnail !== $thumbnail) {
                echo "  ✓ {$thumbnail} → {$newThumbnail}\n";
                $thumbnail = $newThumbnail;
                $thumbnailsUpdated++;
                $hasChanges = true;
            }
        }
    }

    if ($hasChanges) {
        $eventsUpdated++;
    }
}

// Guardar cambios
echo "\n💾 Guardando cambios...\n";
$success = file_put_contents($dataFile, json_encode($appState, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

if ($success === false) {
    die("❌ Error: No se pudo guardar datos_app.json\n");
}

echo "\n===========================================\n";
echo "✅ Proceso completado\n\n";
echo "📊 Resumen:\n";
echo "  • Eventos actualizados: $eventsUpdated\n";
echo "  • Miniaturas actualizadas: $thumbnailsUpdated\n";
echo "\n💡 Recarga la página web para ver los cambios\n";
?>