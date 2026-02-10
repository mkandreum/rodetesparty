<?php
require_once __DIR__ . '/security_config.php';
startSecureSession();
setSecurityHeaders();
header('Content-Type: application/json');

// --- Seguridad: Determinar si el usuario es admin ---
$isAdmin = isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'] === true;

$dataFile = '/var/www/data_private/merch_vendido.json';
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

// Extract sales from data structure
// Backward compatibility: The 'sales' key will exist in the new format (sent by app.js).
// Fallback to $data handles legacy code or direct API calls that might send sales array directly.
$newSales = $data['sales'] ?? $data;
if (!is_array($newSales)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Formato de datos inválido']);
    exit;
}

// --- Protección ---
// --- Protección y Detección de Cambios ---
$currentSalesJson = file_exists($dataFile) ? file_get_contents($dataFile) : '[]';
$currentSales = json_decode($currentSalesJson, true) ?: [];
$currentSaleIds = array_column($currentSales, 'saleId');

// Detectar ventas nuevas (para enviar email) - Aplica a todos (admin y user)
$newlyAddedSales = [];
foreach ($newSales as $sale) {
    if (!in_array($sale['saleId'], $currentSaleIds)) {
        $newlyAddedSales[] = $sale;
    }
}

// Protección contra borrado solo para NO admins
if (!$isAdmin) {
    if (count($newSales) < count($currentSales)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Error: No puedes borrar ventas existentes.']);
        exit;
    }
}

// Asegurar directorio
$dir = dirname($dataFile);
if (!is_dir($dir)) {
    mkdir($dir, 0750, true);
}

if (file_put_contents($dataFile, json_encode($newSales, JSON_PRETTY_PRINT)) !== false) {
    // NUEVO: Enviar emails para ventas nuevas (incluso si es Admin probando)
    if (!empty($newlyAddedSales)) {
        require_once __DIR__ . '/send_email.php';

        // Cargar app state para obtener información de merch y drags
        $appStateFile = '/var/www/data_private/datos_app.json';
        if (file_exists($appStateFile)) {
            $appStateJson = file_get_contents($appStateFile);
            $appState = json_decode($appStateJson, true);

            // Obtener URL del logo de la app
            $logoUrl = $appState['appLogoUrl'] ?? 'https://rodetesparty.com/uploads/logo.png';

            foreach ($newlyAddedSales as $sale) {
                if (empty($sale['email']))
                    continue;

                $dragId = $sale['dragId'];
                $itemName = $sale['itemName'] ?? 'Artículo';
                $itemPrice = $sale['itemPrice'] ?? 0;
                // NUEVO: Recuperar URL de la imagen (debe haber sido guardada desde app.js)
                $imageUrl = $sale['imageUrl'] ?? '';

                // Simular itemData para las funciones de template
                $itemData = [
                    'name' => $itemName,
                    'price' => $itemPrice,
                    'imageUrl' => $imageUrl
                ];

                if ($dragId === 'web') {
                    // Email para Web Merch
                    $subject = "Confirmación de compra - {$itemName}";
                    $body = generateWebMerchEmailHTML($sale, $itemData, $logoUrl);

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
                        $sellerBody = generateSellerNotificationHTML($sale, $itemData, true, $logoUrl);

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
                        $body = generateDragMerchEmailHTML($sale, $itemData, $drag, $customMessage, $logoUrl);

                        $result = sendEmail($sale['email'], $subject, $body);
                        if (!$result['success']) {
                            error_log("Failed to send drag merch email: " . $result['message']);
                        }

                        // Enviar notificación a la drag
                        $dragNotifEmail = $dragEmailConfig['notificationEmail'] ?? '';

                        if (!empty($dragNotifEmail)) {
                            $sellerSubject = "💰 Nueva Venta Drag: {$itemName}";
                            $sellerBody = generateSellerNotificationHTML($sale, $itemData, false, $logoUrl);

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