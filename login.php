<?php
session_start();
header('Content-Type: application/json');

// --- Seguridad: Configuración desde Variables de Entorno (Docker) ---
$validEmail = getenv('ADMIN_EMAIL') ?: 'admin@rodetes.com';
$validPassword = getenv('ADMIN_PASSWORD') ?: 'admin';

// Leer entrada JSON
$input = json_decode(file_get_contents('php://input'), true);
$email = $input['email'] ?? '';
$password = $input['password'] ?? '';

if ($email === $validEmail && $password === $validPassword) {
    $_SESSION['is_logged_in'] = true;
    $_SESSION['admin_email'] = $email;
    echo json_encode(['success' => true]);
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Credenciales incorrectas']);
}
?>
