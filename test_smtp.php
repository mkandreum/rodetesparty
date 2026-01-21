<?php
session_start();
header('Content-Type: application/json');

// Solo admin puede probar SMTP
$isAdmin = isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'] === true;
if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);
$testEmail = $data['email'] ?? '';

if (empty($testEmail)) {
    echo json_encode(['success' => false, 'message' => 'Email de destino requerido']);
    exit;
}

require_once __DIR__ . '/send_email.php';

$subject = "Prueba de conexión SMTP - Rodetes Party";
$body = "
<h1>¡Prueba Exitosa!</h1>
<p>La configuración SMTP de Rodetes Party funciona correctamente.</p>
<p>Fecha: " . date('Y-m-d H:i:s') . "</p>
";

$result = sendEmail($testEmail, $subject, $body);

echo json_encode($result);
?>