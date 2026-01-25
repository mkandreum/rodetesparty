<?php
// fix_thumbnails.php - Script para regenerar miniaturas WebP y actualizar JSON
// Combinación de lógica de conversión y actualización de base de datos.
header('Content-Type: text/plain; charset=utf-8');

// Seguridad básica: Solo permitir si está logueado (sesión iniciada)
session_start();
if (empty($_SESSION['is_logged_in'])) {
    http_response_code(403);
    die("❌ Acceso denegado. Debes estar logueado como administrador.");
}

echo "🛠️ REPARADOR DE MINIATURAS (JPG -> WebP)\n";
echo "==========================================\n\n";

$uploadsDir = __DIR__ . '/uploads/';
$thumbnailsDir = $uploadsDir . 'thumbnails/';
$dataFile = '/var/www/data_private/datos_app.json';

// --- FASE 1: Conversión de archivos en disco ---
echo "1️⃣ FASE 1: Convirtiendo archivos en disco...\n";

if (!is_dir($thumbnailsDir)) {
    die("❌ Error: Directorio de miniaturas no existe: $thumbnailsDir\n");
}

if (!extension_loaded('gd')) {
    die("❌ Error: Extensión GD no disponible\n");
}

$jpgFiles = glob($thumbnailsDir . '*.{jpg,jpeg}', GLOB_BRACE);
$converted = 0;
$errors = 0;

if (empty($jpgFiles)) {
    echo "ℹ️  No hay archivos JPG en la carpeta de miniaturas.\n";
} else {
    foreach ($jpgFiles as $jpgPath) {
        $filename = basename($jpgPath);
        $webpPath = $thumbnailsDir . pathinfo($filename, PATHINFO_FILENAME) . '.webp';

        // Solo convertir si no existe ya el WebP
        if (file_exists($webpPath)) {
            // echo "  ⏭️  $filename ya tiene versión WebP. Saltando.\n";
            continue;
        }

        try {
            $img = @imagecreatefromjpeg($jpgPath);
            if ($img === false)
                throw new Exception("Error cargando JPG");

            $success = imagewebp($img, $webpPath, 80);
            imagedestroy($img);

            if ($success) {
                echo "  ✓ Convertido: $filename -> " . basename($webpPath) . "\n";
                // Opcional: Borrar original? Mejor conservarlo por seguridad en este script
                $converted++;
            } else {
                throw new Exception("Falló imagewebp");
            }
        } catch (Exception $e) {
            echo "  ✗ Error $filename: " . $e->getMessage() . "\n";
            $errors++;
        }
    }
}
echo "\n  > Archivos nuevos convertidos: $converted\n";
echo "  > Errores: $errors\n\n";


// --- FASE 2: Actualización de base de datos (JSON) ---
echo "2️⃣ FASE 2: Actualizando datos_app.json...\n";

if (!file_exists($dataFile)) {
    die("❌ Error: datos_app.json no encontrado en $dataFile\n");
}

$jsonContent = file_get_contents($dataFile);
$appState = json_decode($jsonContent, true);

if (!$appState || !isset($appState['events'])) {
    die("❌ Error: JSON inválido o corrupto.\n");
}

$eventsUpdated = 0;
$thumbnailsUpdated = 0;

foreach ($appState['events'] as &$event) {
    if (!isset($event['galleryThumbnails']) || !is_array($event['galleryThumbnails'])) {
        continue;
    }

    $hasChanges = false;
    foreach ($event['galleryThumbnails'] as &$thumbnail) {
        if ($thumbnail && is_string($thumbnail)) {
            // Si la ruta termina en jpg/jpeg, cambiar a webp
            $newThumbnail = preg_replace('/\.jpe?g$/i', '.webp', $thumbnail);

            // Verificar si cambiamos algo
            if ($newThumbnail !== $thumbnail) {
                // Verificar si el archivo WebP realmente existe (por seguridad)
                // Nota: $thumbnail es relativo ej "uploads/thumbnails/foto.jpg"
                $absoluteWebPPath = __DIR__ . '/' . $newThumbnail;

                // Si existe el webp o acabamos de crearlo, actualizamos el JSON
                if (file_exists($absoluteWebPPath)) {
                    // echo "  Actualizando ref: $thumbnail -> $newThumbnail\n";
                    $thumbnail = $newThumbnail;
                    $thumbnailsUpdated++;
                    $hasChanges = true;
                } else {
                    echo "  ⚠️ No se encuentra archivo WebP para: $thumbnail (Se mantiene JPG)\n";
                }
            }
        }
    }

    if ($hasChanges) {
        $eventsUpdated++;
    }
}

// Guardar
if ($thumbnailsUpdated > 0) {
    $success = file_put_contents($dataFile, json_encode($appState, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    if ($success) {
        echo "\n✅ JSON guardado correctamente.\n";
    } else {
        echo "\n❌ Error al escribir en datos_app.json\n";
    }
} else {
    echo "\nℹ️  No hubo cambios necesarios en el JSON.\n";
}

echo "\n==========================================\n";
echo "🎉 PROCESO TERMINADO.\n";
echo "Eventos tocados: $eventsUpdated\n";
echo "Miniaturas linkeadas a WebP: $thumbnailsUpdated\n";
?>