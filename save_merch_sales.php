<?php
session_start();
header('Content-Type: application/json');

// --- Seguridad: Determinar si el usuario es admin ---
$isAdmin = isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'] === true;

$dataFile = '/var/www/data_private/merch_vendido.json';
$input = file_get_contents('php://input');

$newSales = json_decode($input, true);
if ($newSales === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'JSON inválido']);
    exit;
}

// --- Protección ---
if (!$isAdmin) {
    $currentSalesJson = file_exists($dataFile) ? file_get_contents($dataFile) : '[]';
    $currentSales = json_decode($currentSalesJson, true) ?: [];

    if (count($newSales) < count($currentSales)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Error: No puedes borrar ventas existentes.']);
        exit;
    }

    // NUEVO: Detectar ventas nuevas para enviar email
    $currentSalesJson = file_exists($dataFile) ? file_get_contents($dataFile) : '[]';
    $currentSales = json_decode($currentSalesJson, true) ?: [];
    $currentSaleIds = array_column($currentSales, 'saleId');

    // Encontrar ventas que son nuevas
    $newlyAddedSales = [];
    foreach ($newSales as $sale) {
        if (!in_array($sale['saleId'], $currentSaleIds)) {
            $newlyAddedSales[] = $sale;
        }
    }
}

// Asegurar directorio
$dir = dirname($dataFile);
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}

if (file_put_contents($dataFile, json_encode($newSales, JSON_PRETTY_PRINT)) !== false) {
    // NUEVO: Enviar emails para ventas nuevas
    if (!$isAdmin && !empty($newlyAddedSales)) {
        require_once __DIR__ . '/send_email.php';

        // Cargar app state para obtener información de merch y drags
        $appStateFile = '/var/www/data_private/datos_app.json';
        if (file_exists($appStateFile)) {
            $appStateJson = file_get_contents($appStateFile);
            $appState = json_decode($appStateJson, true);

            foreach ($newlyAddedSales as $sale) {
                if (empty($sale['email']))
                    continue;

                $dragId = $sale['dragId'];
                $itemName = $sale['itemName'] ?? 'Artículo';
                $itemPrice = $sale['itemPrice'] ?? 0;

                // Simular itemData para las funciones de template
                $itemData = [
                    'name' => $itemName,
                    'price' => $itemPrice
                ];

                if ($dragId === 'web') {
                    // Email para Web Merch
                    $subject = "Confirmación de compra - {$itemName}";
                    $body = generateWebMerchEmailHTML($sale, $itemData);

                    $result = sendEmail($sale['email'], $subject, $body);
                    if (!$result['success']) {
                        error_log("Failed to send web merch email: " . $result['message']);
                    }

                    // Enviar notificación a Rodetes (Web Merch)
                    $emailNotifications = $appState['emailNotifications'] ?? [];
                    $webMerchConfig = $emailNotifications['webMerch'] ?? [];
                    $rodetesEmail = $webMerchConfig['notificationEmail'] ?? '';

                    if (!empty($rodetesEmail)) {
                        $sellerSubject = "💰 Nueva Venta Web: {$itemName}";
                        $sellerBody = generateSellerNotificationHTML($sale, $itemData, true);

                        $res = sendEmail($rodetesEmail, $sellerSubject, $sellerBody);
                        if (!$res['success']) {
                            error_log("Failed to send web merch notification to admin: " . $res['message']);
                        }
                    }

                } else {
                    // Email para Drag Merch
                    $drags = $appState['drags'] ?? [];
                    $drag = null;
                    foreach ($drags as $d) {
                        if ($d['id'] == $dragId) {
                            $drag = $d;
                            break;
                        }
                    }

                    if ($drag) {
                        // Obtener mensaje personalizado de la drag (si existe)
                        $emailNotifications = $appState['emailNotifications'] ?? [];
                        $dragEmailConfig = null;
                        if (isset($emailNotifications['drags'])) {
                            foreach ($emailNotifications['drags'] as $config) {
                                if ($config['dragId'] == $dragId) {
                                    $dragEmailConfig = $config;
                                    break;
                                }
                            }
                        }

                        $customMessage = $dragEmailConfig['buyerTemplate'] ?? '';
                        // Reemplazar {dragName} en el mensaje personalizado
                        $customMessage = str_replace('{dragName}', $drag['name'], $customMessage);

                        $subject = "Confirmación de compra - {$itemName} de {$drag['name']}";
                        $body = generateDragMerchEmailHTML($sale, $itemData, $drag, $customMessage);

                        $result = sendEmail($sale['email'], $subject, $body);
                        if (!$result['success']) {
                            error_log("Failed to send drag merch email: " . $result['message']);
                        }

                        // Enviar notificación a la drag
                        $dragNotifEmail = $dragEmailConfig['notificationEmail'] ?? '';

                        if (!empty($dragNotifEmail)) {
                            $sellerSubject = "💰 Nueva Venta Drag: {$itemName}";
                            $sellerBody = generateSellerNotificationHTML($sale, $itemData, false);

                            $res = sendEmail($dragNotifEmail, $sellerSubject, $sellerBody);
                            if (!$res['success']) {
                                error_log("Failed to send drag merch notification to drag: " . $res['message']);
                            }
                        }
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