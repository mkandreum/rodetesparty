<?php
require_once __DIR__ . '/../config/security_config.php';
startSecureSession();
header('Content-Type: application/json');

// --- Seguridad: Determinar si el usuario es admin ---
$isAdmin = isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'] === true;

$dataFile = '/var/www/data_private/entradas_db.json';
$input = file_get_contents('php://input');

$data = json_decode($input, true);
if ($data === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'JSON inválido']);
    exit;
}

// Validate CSRF token for admin users
if ($isAdmin) {
    $csrfToken = $data['csrf_token'] ?? '';
    if (!validateCSRFToken($csrfToken)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Token de seguridad inválido']);
        exit;
    }
}

// Extract tickets from data structure
// Backward compatibility: The 'tickets' key will exist in the new format (sent by app.js).
// Fallback to $data handles legacy code or direct API calls that might send tickets array directly.
$newTickets = $data['tickets'] ?? $data;
if (!is_array($newTickets)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Formato de datos inválido']);
    exit;
}
// --- Protección ---
// NUEVO: Detectar tickets nuevos para enviar email (Aplica a todos, incluido Admin)
$currentTicketsJson = file_exists($dataFile) ? file_get_contents($dataFile) : '[]';
$currentTickets = json_decode($currentTicketsJson, true) ?: [];
$currentTicketIds = array_column($currentTickets, 'ticketId');

// Encontrar tickets que son nuevos
$newlyAddedTickets = [];
foreach ($newTickets as $ticket) {
    if (!in_array($ticket['ticketId'], $currentTicketIds)) {
        $newlyAddedTickets[] = $ticket;
    }
}

if (!$isAdmin) {
    if (count($newTickets) < count($currentTickets)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Error: No puedes borrar entradas existentes.']);
        exit;
    }
}

// Asegurar directorio
$dir = dirname($dataFile);
if (!is_dir($dir)) {
    mkdir($dir, 0750, true);
}

if (file_put_contents($dataFile, json_encode($newTickets, JSON_PRETTY_PRINT)) !== false) {
    // NUEVO: Enviar emails para tickets nuevos (incluido Admin)
    if (!empty($newlyAddedTickets)) {
        require_once __DIR__ . '/../email/send_email.php';

        // Cargar eventos para obtener información
        $appStateFile = '/var/www/data_private/datos_app.json';
        if (file_exists($appStateFile)) {
            $appStateJson = file_get_contents($appStateFile);
            $appState = json_decode($appStateJson, true);
            $events = $appState['events'] ?? [];
            $logoUrl = $appState['appLogoUrl'] ?? ''; // Obtener logo

            foreach ($newlyAddedTickets as $ticket) {
                // Buscar el evento correspondiente
                $event = null;
                foreach ($events as $ev) {
                    if ($ev['id'] == $ticket['eventId']) {
                        $event = $ev;
                        break;
                    }
                }

                if ($event && !empty($ticket['email'])) {
                    $subject = "Tu entrada para {$event['name']} - Rodetes Party";
                    $body = generateTicketEmailHTML($ticket, $event, $logoUrl); // Pasar logo

                    // Intentar enviar email (no bloqueante si falla)
                    $result = sendEmail($ticket['email'], $subject, $body);
                    if (!$result['success']) {
                        error_log("Failed to send ticket email: " . $result['message']);
                    }
                }
            }
        }
    }

    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al escribir archivo']);
}
?>
