<?php
session_start();
header('Content-Type: application/json');

// Solo admin puede guardar configuración SMTP
$isAdmin = isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'] === true;
if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

$dataFile = '/var/www/data_private/smtp_config.json';
$input = file_get_contents('php://input');
$config = json_decode($input, true);

if ($config === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'JSON inválido']);
    exit;
}

// Validar campos obligatorios (password es opcional si ya existe config previa, pero obligatorio si es nueva)
$requiredFields = ['host', 'port', 'username', 'encryption'];
foreach ($requiredFields as $field) {
    if (empty($config[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Campo obligatorio faltante: $field"]);
        exit;
    }
}

// Si la password viene vacía, intentamos mantener la anterior
if (empty($config['password'])) {
    if (file_exists($dataFile)) {
        $oldConfig = json_decode(file_get_contents($dataFile), true);
        if ($oldConfig && isset($oldConfig['password'])) {
            $config['password'] = $oldConfig['password'];
        }
    }
}

// Si sigue vacía (y es nueva config), error (a menos que quieran guardar sin pass, poco probable para SMTP auth)
if (empty($config['password'])) {
    // Podríamos permitirlo si el servidor no requiere auth, pero lo normal es que sí.
    // Dejamos pasar si el usuario lo deja vacío explícitamente sabiendo que fallará si require auth.
}

// Asegurar directorio
$dir = dirname($dataFile);
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}

// Guardar configuración
if (file_put_contents($dataFile, json_encode($config, JSON_PRETTY_PRINT)) !== false) {
    echo json_encode(['success' => true, 'message' => 'Configuración SMTP guardada']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar configuración']);
}
?>