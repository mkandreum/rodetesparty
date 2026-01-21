<?php
require_once __DIR__ . '/send_email.php';

header('Content-Type: application/json');

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['ticketId']) || !isset($data['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos (ticketId, email)']);
    exit;
}

$ticketId = $data['ticketId'];
$email = $data['email'];

// Cargar estado de entradas
$dataFile = '/var/www/data_private/entradas_db.json';
if (!file_exists($dataFile)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'No hay base de datos de entradas']);
    exit;
}

$tickets = json_decode(file_get_contents($dataFile), true) ?: [];
$ticket = null;

// Buscar ticket
foreach ($tickets as $t) {
    if ($t['ticketId'] === $ticketId) {
        $ticket = $t;
        break;
    }
}

if (!$ticket) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Entrada no encontrada']);
    exit;
}

// Cargar info del evento
$appStateFile = '/var/www/data_private/datos_app.json';
$appState = json_decode(file_get_contents($appStateFile), true);
$events = $appState['events'] ?? [];
$event = null;

foreach ($events as $ev) {
    if ($ev['id'] == $ticket['eventId']) {
        $event = $ev;
        break;
    }
}

if (!$event) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Evento asociado no encontrado']);
    exit;
}

// Generar y enviar email
$subject = "REENVÍO: Tu entrada para {$event['name']} - Rodetes Party";
$body = generateTicketEmailHTML($ticket, $event);
$result = sendEmail($email, $subject, $body);

if ($result['success']) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Fallo al enviar email: ' . $result['message']]);
}
?>