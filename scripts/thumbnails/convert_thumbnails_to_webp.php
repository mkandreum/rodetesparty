#!/usr/bin/env php
<?php
/**
 * Script CLI para convertir miniaturas JPG a WebP y eliminar las antiguas
 * Uso: php convert_thumbnails_to_webp.php
 */

// Verificar que se ejecuta desde CLI
if (php_sapi_name() !== 'cli') {
    die("Este script solo puede ejecutarse desde línea de comandos\n");
}

// Verificar que GD está disponible
if (!extension_loaded('gd')) {
    die("❌ Error: Extensión GD de PHP no disponible\n");
}

echo "🖼️  Conversor de Miniaturas JPG → WebP\n";
echo "=====================================\n\n";

$uploadsDir = __DIR__ . '/../../uploads/';
$thumbnailsDir = $uploadsDir . 'thumbnails/';

if (!is_dir($thumbnailsDir)) {
    die("❌ Error: Directorio de miniaturas no existe: $thumbnailsDir\n");
}

// Buscar todas las miniaturas JPG
$jpgFiles = glob($thumbnailsDir . '*.{jpg,jpeg}', GLOB_BRACE);

if (empty($jpgFiles)) {
    echo "ℹ️  No se encontraron miniaturas JPG para convertir\n";
    exit(0);
}

echo "📊 Encontradas " . count($jpgFiles) . " miniaturas JPG\n\n";

$converted = 0;
$errors = 0;
$totalSizeBefore = 0;
$totalSizeAfter = 0;

foreach ($jpgFiles as $jpgPath) {
    $filename = basename($jpgPath);
    $webpPath = $thumbnailsDir . pathinfo($filename, PATHINFO_FILENAME) . '.webp';

    try {
        // Obtener tamaño original
        $sizeBefore = filesize($jpgPath);
        $totalSizeBefore += $sizeBefore;

        // Cargar imagen JPG
        $img = @imagecreatefromjpeg($jpgPath);
        if ($img === false) {
            throw new Exception("No se pudo cargar la imagen");
        }

        // Convertir a WebP
        $success = imagewebp($img, $webpPath, 80);
        imagedestroy($img);

        if (!$success) {
            throw new Exception("No se pudo guardar como WebP");
        }

        // Verificar tamaño nuevo
        $sizeAfter = filesize($webpPath);
        $totalSizeAfter += $sizeAfter;

        // Calcular reducción
        $reduction = round((1 - ($sizeAfter / $sizeBefore)) * 100, 1);

        echo "✓ $filename → " . pathinfo($filename, PATHINFO_FILENAME) . ".webp (-{$reduction}%)\n";

        // Eliminar JPG original
        unlink($jpgPath);

        $converted++;

    } catch (Exception $e) {
        echo "✗ Error con $filename: " . $e->getMessage() . "\n";
        $errors++;
    }
}

echo "\n=====================================\n";
echo "📊 Resumen:\n";
echo "  ✓ Convertidas: $converted\n";
echo "  ✗ Errores: $errors\n";

if ($totalSizeBefore > 0) {
    $totalReduction = round((1 - ($totalSizeAfter / $totalSizeBefore)) * 100, 1);
    $savedMB = round(($totalSizeBefore - $totalSizeAfter) / 1024 / 1024, 2);

    echo "  📉 Reducción total: {$totalReduction}%\n";
    echo "  💾 Espacio ahorrado: {$savedMB} MB\n";
}

echo "\n✅ Proceso completado\n";
?>