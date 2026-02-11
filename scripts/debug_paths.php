<?php
header('Content-Type: text/plain');
echo "CWD: " . getcwd() . "\n";
echo "DIR: " . __DIR__ . "\n";
echo "Uploads dir exists: " . (is_dir('uploads') ? 'YES' : 'NO') . "\n";
echo "Uploads dir writable: " . (is_writable('uploads') ? 'YES' : 'NO') . "\n";
echo "Data private dir exists: " . (is_dir('/var/www/data_private') ? 'YES' : 'NO') . "\n";
echo "Data private dir writable: " . (is_writable('/var/www/data_private') ? 'YES' : 'NO') . "\n";

echo "\nFiles in uploads/:\n";
if (is_dir('uploads')) {
    $files = scandir('uploads');
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        echo "- $file (" . (is_dir("uploads/$file") ? 'DIR' : 'FILE') . ")\n";
    }
}
?>
