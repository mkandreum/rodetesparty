<?php
// Simple debug file to check what's wrong
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Debug Info</h1>";

// 1. Check PHP version
echo "<p><strong>PHP Version:</strong> " . phpversion() . "</p>";

// 2. Check if security_config exists
$configPath = __DIR__ . '/config/security_config.php';
echo "<p><strong>Config file exists:</strong> " . (file_exists($configPath) ? 'YES ✓' : 'NO ✗') . "</p>";
echo "<p><strong>Config path:</strong> $configPath</p>";

// 3. Try to require it
try {
    require_once $configPath;
    echo "<p><strong>Config loaded:</strong> YES ✓</p>";
} catch (Exception $e) {
    echo "<p><strong>Config loaded:</strong> NO ✗</p>";
    echo "<p><strong>Error:</strong> " . $e->getMessage() . "</p>";
}

// 4. Check data directory
$dataDir = '/var/www/data_private/';
echo "<p><strong>Data directory exists:</strong> " . (is_dir($dataDir) ? 'YES ✓' : 'NO ✗') . "</p>";
echo "<p><strong>Data directory writable:</strong> " . (is_writable($dataDir) ? 'YES ✓' : 'NO ✗') . "</p>";

// 5. Check required files
$files = [
    $dataDir . 'datos_app.json',
    $dataDir . 'entradas_db.json', 
    $dataDir . 'merch_vendido.json'
];

echo "<h3>Data Files:</h3><ul>";
foreach ($files as $file) {
    $exists = file_exists($file);
    $readable = $exists ? is_readable($file) : false;
    echo "<li>" . basename($file) . ": " . 
         ($exists ? '✓ exists' : '✗ missing') . 
         ($readable ? ' ✓ readable' : '') . 
         "</li>";
}
echo "</ul>";

// 6. Check function availability
echo "<h3>Functions:</h3><ul>";
$functions = ['startSecureSession', 'setSecurityHeaders', 'generateCSRFToken', 'validateCSRFToken'];
foreach ($functions as $func) {
    echo "<li>$func: " . (function_exists($func) ? '✓' : '✗') . "</li>";
}
echo "</ul>";

// 7. Check uploads directory
$uploadsDir = __DIR__ . '/uploads/';
echo "<p><strong>Uploads directory exists:</strong> " . (is_dir($uploadsDir) ? 'YES ✓' : 'NO ✗') . "</p>";
echo "<p><strong>Uploads directory writable:</strong> " . (is_writable($uploadsDir) ? 'YES ✓' : 'NO ✗') . "</p>";

echo "<hr><p><em>If you see this, PHP is working!</em></p>";
