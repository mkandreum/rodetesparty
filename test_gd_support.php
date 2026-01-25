<?php
// test_gd_support.php - Chequeo rápido de GD y permisos

header('Content-Type: text/plain');

echo "--- PHP GD Verification ---\n";
echo "PHP Version: " . phpversion() . "\n";

if (extension_loaded('gd')) {
    echo "GD Extension: Loaded\n";
    $info = gd_info();
    echo "GD Version: " . $info['GD Version'] . "\n";
    echo "WebP Support: " . ($info['WebP Support'] ? 'YES' : 'NO') . "\n";
    echo "JPEG Support: " . ($info['JPEG Support'] ? 'YES' : 'NO') . "\n";
    echo "PNG Support: " . ($info['PNG Support'] ? 'YES' : 'NO') . "\n";
} else {
    echo "GD Extension: NOT LOADED\n";
}

echo "\n--- Function Existence ---\n";
echo "imagewebp exists: " . (function_exists('imagewebp') ? 'YES' : 'NO') . "\n";
echo "imagecreatefromjpeg exists: " . (function_exists('imagecreatefromjpeg') ? 'YES' : 'NO') . "\n";

echo "\n--- Directories ---\n";
$dirs = [
    'uploads',
    'uploads/thumbnails'
];

foreach ($dirs as $d) {
    if (file_exists($d)) {
        echo "[$d] exists. Writable: " . (is_writable($d) ? 'YES' : 'NO') . " Owner: " . fileowner($d) . "\n";
    } else {
        echo "[$d] DOES NOT EXIST (trying to create...)\n";
        @mkdir($d, 0755, true);
        echo "[$d] created? " . (file_exists($d) ? 'YES' : 'NO') . "\n";
    }
}
?>