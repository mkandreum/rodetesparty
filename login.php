<?php
session_start();
header('Content-Type: application/json');

// --- Seguridad: Configuración desde Variables de Entorno (Docker) ---
$validEmail = getenv('ADMIN_EMAIL') ?: 'admin@rodetes.com';
$validPassword = getenv('ADMIN_PASSWORD') ?: 'admin';

// Leer entrada JSON
$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');
$clientHash = $input['hash'] ?? '';

// Debug logging
error_log("LOGIN ATTEMPT:");
error_log("Input Email: '" . $email . "'");
error_log("Client Hash: '" . $clientHash . "'");

// Calcular hash de la contraseña correcta
$validPasswordHash = hash('sha256', $validPassword);


if ($email === $validEmail && $clientHash === $validPasswordHash) {
    $_SESSION['is_logged_in'] = true;
    $_SESSION['admin_email'] = $email;
    echo json_encode(['success' => true]);
} else {
    http_response_code(401);
    
    // Provide more specific error messages
    if ($email !== $validEmail) {
        error_log("Login Failed: Email mismatch. Got: '$email', Expected: '$validEmail'");
        echo json_encode(['success' => false, 'message' => 'Email incorrecto']);
    } else {
        error_log("Login Failed: Password hash mismatch. Expected Hash: " . $validPasswordHash);
        echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta']);
    }
}

?>
