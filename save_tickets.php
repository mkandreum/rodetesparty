<?php
session_start();
header('Content-Type: application/json');

// --- Seguridad: Determinar si el usuario es admin ---
$isAdmin = isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'] === true;

$dataFile = '/var/www/data_private/entradas_db.json';
// --- Configuración de Errores para JSON ---
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

function json_error_handler($errno, $errstr, $errfile, $errline)
{
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Error PHP: $errstr en $errfile:$errline"]);
    exit;
}
set_error_handler('json_error_handler');

// Capturar errores fatales
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_COMPILE_ERROR)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => "Error Fatal PHP: {$error['message']} en {$error['file']}:{$error['line']}"]);
    }
});

try {
    $input = file_get_contents('php://input');
    $newTickets = json_decode($input, true);

    if ($newTickets === null) {
        throw new Exception('JSON inválido');
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
        mkdir($dir, 0777, true);
    }

    if (file_put_contents($dataFile, json_encode($newTickets, JSON_PRETTY_PRINT)) !== false) {
        // NUEVO: Enviar emails para tickets nuevos (incluido Admin)
        if (!empty($newlyAddedTickets)) {
            require_once __DIR__ . '/send_email.php';

            // Cargar eventos para obtener información
            $appStateFile = '/var/www/data_private/datos_app.json';
            if (file_exists($appStateFile)) {
                $appStateJson = file_get_contents($appStateFile);
                $appState = json_decode($appStateJson, true);
                $events = $appState['events'] ?? [];

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
                        $body = generateTicketEmailHTML($ticket, $event);

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
        throw new Exception('Error al escribir archivo');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>