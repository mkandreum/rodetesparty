<?php
// Función para enviar emails usando PHPMailer
require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';
require_once __DIR__ . '/PHPMailer/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function sendEmail($to, $subject, $body, $attachments = [])
{
    // Cargar configuración SMTP
    $smtpConfigFile = '/var/www/data_private/smtp_config.json';

    if (!file_exists($smtpConfigFile)) {
        error_log('SMTP config file not found');
        return ['success' => false, 'message' => 'Configuración SMTP no encontrada'];
    }

    $smtpConfigJson = file_get_contents($smtpConfigFile);
    $smtpConfig = json_decode($smtpConfigJson, true);

    if (!$smtpConfig || !isset($smtpConfig['enabled']) || !$smtpConfig['enabled']) {
        error_log('SMTP not enabled');
        return ['success' => false, 'message' => 'SMTP no habilitado'];
    }

    $mail = new PHPMailer(true);

    try {
        // Configuración del servidor
        $mail->isSMTP();
        $mail->Host = $smtpConfig['host'];
        $mail->SMTPAuth = true;
        $mail->Username = $smtpConfig['username'];
        $mail->Password = $smtpConfig['password'];
        $mail->SMTPSecure = $smtpConfig['encryption']; // 'tls' o 'ssl'
        $mail->Port = $smtpConfig['port'];
        $mail->CharSet = 'UTF-8';

        // Remitente
        $fromEmail = $smtpConfig['from_email'] ?? $smtpConfig['username'];
        $fromName = $smtpConfig['from_name'] ?? 'Rodetes Party';
        $mail->setFrom($fromEmail, $fromName);

        // Destinatario
        $mail->addAddress($to);

        // Adjuntos (si los hay)
        foreach ($attachments as $attachment) {
            if (isset($attachment['path'])) {
                $mail->addAttachment($attachment['path'], $attachment['name'] ?? '');
            }
        }

        // Contenido
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $body;
        $mail->AltBody = strip_tags($body); // Versión texto plano

        $mail->send();
        return ['success' => true, 'message' => 'Email enviado correctamente'];

    } catch (Exception $e) {
        error_log("Email error: {$mail->ErrorInfo}");
        return ['success' => false, 'message' => "Error al enviar email: {$mail->ErrorInfo}"];
    }
}



// Helper para asegurar URLs absolutas
function ensureAbsoluteUrl($url)
{
    if (empty($url))
        return '';
    if (filter_var($url, FILTER_VALIDATE_URL))
        return $url;

    // Asumir que es una ruta relativa en uploads/
    // Limpiar barras iniciales para evitar dobles //
    $cleanPath = ltrim($url, '/');
    return 'https://rodetesparty.sytes.net/' . $cleanPath;
}

// Función para generar HTML del email de ticket
function generateTicketEmailHTML($ticketData, $eventData, $logoUrl = '')
{
    $buyerName = htmlspecialchars($ticketData['nombre'] . ' ' . $ticketData['apellidos']);
    $eventName = htmlspecialchars($eventData['name']);
    $eventDate = date('d/m/Y H:i', strtotime($eventData['date']));
    $quantity = $ticketData['quantity'];
    $ticketId = htmlspecialchars($ticketData['ticketId']);

    $logoUrl = ensureAbsoluteUrl($logoUrl);
    if (empty($logoUrl)) {
        $logoUrl = 'https://rodetesparty.sytes.net/uploads/logo.png';
    }

    $html = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header-logo { text-align: center; padding-bottom: 20px; background: #000; }
            .header-title { background: #000; color: #F02D7D; padding: 10px 20px 20px; text-align: center; }
            .content { background: #f4f4f4; padding: 30px; }
            .ticket-info { background: #fff; padding: 20px; margin: 20px 0; border: 2px solid #F02D7D; }
            .qr-container { text-align: center; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .highlight { color: #F02D7D; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header-logo'>
                 <img src='$logoUrl' alt='Rodetes Party' style='max-height: 50px; display: block; margin: 0 auto;' onerror='this.style.display=\"none\"'>
            </div>
            <div class='header-title'>
                <h1>🎉 TU ENTRADA</h1>
            </div>
            <div class='content'>
                <p>Hola <strong>$buyerName</strong>,</p>
                <p>¡Gracias por tu compra! Aquí está tu entrada:</p>
                
                <div class='ticket-info'>
                    <p><strong>Evento:</strong> <span class='highlight'>$eventName</span></p>
                    <p><strong>Fecha:</strong> $eventDate</p>
                    <p><strong>Cantidad:</strong> $quantity entrada(s)</p>
                    <p><strong>ID:</strong> $ticketId</p>
                </div>
                
                <div class='qr-container'>
                    <p>Muestra este código en la entrada:</p>
                    <img src='https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TICKET_ID:$ticketId' alt='QR Code' width='200' height='200' style='border: 4px solid #fff; outline: 2px solid #000;'>
                </div>
                
                <p><strong style='color: #F02D7D;'>⚠️ IMPORTANTE:</strong> Guarda este email. Necesitarás mostrar el QR en la entrada.</p>
                
                <p>También hemos enviado la entrada a este email: <strong>" . htmlspecialchars($ticketData['email']) . "</strong></p>
                
                <p style='margin-top: 30px;'>¡Te esperamos! 🎊</p>
                <p><strong>Rodetes Party</strong></p>
            </div>
            <div class='footer'>
                <p>Este es un email automático. Por favor no respondas.</p>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}

// Función para generar HTML del email de Web Merch
function generateWebMerchEmailHTML($saleData, $itemData, $logoUrl = '')
{
    $buyerName = htmlspecialchars($saleData['nombre'] . ' ' . $saleData['apellidos']);
    $itemName = htmlspecialchars($itemData['name']);
    $quantity = $saleData['quantity'];
    $total = number_format($saleData['quantity'] * $itemData['price'], 2);

    $itemImage = ensureAbsoluteUrl($itemData['imageUrl'] ?? '');
    $logoUrl = ensureAbsoluteUrl($logoUrl);
    if (empty($logoUrl)) {
        $logoUrl = 'https://rodetesparty.sytes.net/uploads/logo.png';
    }

    $productImageHtml = '';
    if (!empty($itemImage)) {
        $productImageHtml = "
        <div style='text-align: center; margin: 20px 0;'>
             <img src='$itemImage' alt='$itemName' style='max-width: 200px; border: 1px solid #ddd; max-height: 200px; object-fit: contain;' onerror='this.style.display=\"none\"'>
        </div>";
    }

    $html = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header-logo { text-align: center; padding-bottom: 20px; background: #000; }
            .header-title { background: #000; color: #F02D7D; padding: 10px 20px 20px; text-align: center; }
            .content { background: #f4f4f4; padding: 30px; }
            .purchase-info { background: #fff; padding: 20px; margin: 20px 0; border: 2px solid #F02D7D; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .highlight { color: #F02D7D; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header-logo'>
                 <img src='$logoUrl' alt='Rodetes Party' style='max-height: 50px; display: block; margin: 0 auto;' onerror='this.style.display=\"none\"'>
            </div>
            <div class='header-title'>
                <h1>✅ CONFIRMACIÓN DE COMPRA</h1>
            </div>
            <div class='content'>
                <p>Hola <strong>$buyerName</strong>,</p>
                <p>¡Gracias por tu compra!</p>
                
                $productImageHtml
                
                <div class='purchase-info'>
                    <p><strong>Artículo:</strong> <span class='highlight'>$itemName</span></p>
                    <p><strong>Cantidad:</strong> $quantity</p>
                    <p><strong>Total:</strong> <span class='highlight'>$total €</span></p>
                </div>
                
                <p><strong>Próximos pasos:</strong></p>
                <p>El equipo de Rodetes se pondrá en contacto contigo próximamente a través de este email para coordinar el pago y la entrega de tu pedido.</p>
                
                <p style='margin-top: 30px;'>¡Gracias por tu apoyo! 💖</p>
                <p><strong>Rodetes Party</strong></p>
            </div>
            <div class='footer'>
                <p>Este es un email automático. Por favor no respondas.</p>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}

// Función para generar HTML del email de Drag Merch
function generateDragMerchEmailHTML($saleData, $itemData, $dragData, $customMessage = '', $logoUrl = '')
{
    $buyerName = htmlspecialchars($saleData['nombre'] . ' ' . $saleData['apellidos']);
    $itemName = htmlspecialchars($itemData['name']);
    $dragName = htmlspecialchars($dragData['name']);
    $quantity = $saleData['quantity'];
    $total = number_format($saleData['quantity'] * $itemData['price'], 2);
    $customMessageHTML = $customMessage ? "<p><em>" . nl2br(htmlspecialchars($customMessage)) . "</em></p>" : "";

    $itemImage = ensureAbsoluteUrl($itemData['imageUrl'] ?? '');
    $logoUrl = ensureAbsoluteUrl($logoUrl);
    if (empty($logoUrl)) {
        $logoUrl = 'https://rodetesparty.sytes.net/uploads/logo.png';
    }

    $productImageHtml = '';
    if (!empty($itemImage)) {
        $productImageHtml = "
        <div style='text-align: center; margin: 20px 0;'>
             <img src='$itemImage' alt='$itemName' style='max-width: 200px; border: 1px solid #ddd; max-height: 200px; object-fit: contain;' onerror='this.style.display=\"none\"'>
        </div>";
    }

    $html = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header-logo { text-align: center; padding-bottom: 20px; background: #000; }
            .header-title { background: #000; color: #F02D7D; padding: 10px 20px 20px; text-align: center; }
            .content { background: #f4f4f4; padding: 30px; }
            .purchase-info { background: #fff; padding: 20px; margin: 20px 0; border: 2px solid #F02D7D; }
            .custom-message { background: #fff9e6; padding: 15px; margin: 20px 0; border-left: 4px solid #F02D7D; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .highlight { color: #F02D7D; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header-logo'>
                 <img src='$logoUrl' alt='Rodetes Party' style='max-height: 50px; display: block; margin: 0 auto;' onerror='this.style.display=\"none\"'>
            </div>
             <div class='header-title'>
                <h1>✅ CONFIRMACIÓN DE COMPRA</h1>
            </div>
            <div class='content'>
                <p>Hola <strong>$buyerName</strong>,</p>
                <p>¡Gracias por tu compra!</p>
                
                $productImageHtml

                <div class='purchase-info'>
                    <p><strong>Artículo:</strong> <span class='highlight'>$itemName</span></p>
                    <p><strong>De:</strong> <span class='highlight'>$dragName</span></p>
                    <p><strong>Cantidad:</strong> $quantity</p>
                    <p><strong>Total:</strong> <span class='highlight'>$total €</span></p>
                </div>
                
                <p><strong>Próximos pasos:</strong></p>
                <p><strong>$dragName</strong> se pondrá en contacto contigo próximamente para coordinar el pago y la entrega de tu pedido.</p>
                
                $customMessageHTML
                
                <p style='margin-top: 30px;'>¡Gracias por tu apoyo! 💖</p>
                <p><strong>Rodetes Party</strong></p>
            </div>
            <div class='footer'>
                <p>Este es un email automático. Por favor no respondas.</p>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}

// Función para generar HTML de notificación al vendedor (Rodetes o Drag)
function generateSellerNotificationHTML($saleData, $itemData, $isWebMerch, $logoUrl = '')
{
    $buyerName = htmlspecialchars($saleData['nombre'] . ' ' . $saleData['apellidos']);
    $buyerEmail = htmlspecialchars($saleData['email']);
    $itemName = htmlspecialchars($itemData['name']);
    $quantity = $saleData['quantity'];
    $total = number_format($saleData['quantity'] * $itemData['price'], 2);

    $title = $isWebMerch ? "NUEVA VENTA WEB MERCH" : "¡NUEVA VENTA DE TU MERCH!";
    $color = $isWebMerch ? "#F02D7D" : "#9C27B0"; // Rosa para web, Morado para drag

    $itemImage = ensureAbsoluteUrl($itemData['imageUrl'] ?? '');
    $logoUrl = ensureAbsoluteUrl($logoUrl);
    if (empty($logoUrl)) {
        $logoUrl = 'https://rodetesparty.sytes.net/uploads/logo.png';
    }

    $productImageHtml = '';
    if (!empty($itemImage)) {
        $productImageHtml = "
        <div style='text-align: center; margin: 20px 0;'>
             <img src='$itemImage' alt='$itemName' style='max-width: 200px; border: 1px solid #ddd; max-height: 200px; object-fit: contain;' onerror='this.style.display=\"none\"'>
        </div>";
    }

    $html = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header-logo { text-align: center; padding-bottom: 20px; background: #000; }
            .header-title { background: #000; color: #fff; padding: 10px 20px 20px; text-align: center; border-bottom: 4px solid $color; }
            .content { background: #f4f4f4; padding: 30px; }
            .sale-info { background: #fff; padding: 20px; margin: 20px 0; border-left: 5px solid $color; }
            .buyer-info { background: #e8e8e8; padding: 15px; margin-top: 20px; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 20px; }
            .highlight { color: $color; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class='container'>
             <div class='header-logo'>
                 <img src='$logoUrl' alt='Rodetes Party' style='max-height: 50px; display: block; margin: 0 auto;' onerror='this.style.display=\"none\"'>
            </div>
            <div class='header-title'>
                <h1>💰 $title</h1>
            </div>
            <div class='content'>
                <p>¡Hola! Se ha registrado una nueva venta.</p>
                
                $productImageHtml

                <div class='sale-info'>
                    <p><strong>Artículo:</strong> <span class='highlight'>$itemName</span></p>
                    <p><strong>Cantidad:</strong> $quantity</p>
                    <p><strong>Total:</strong> <span class='highlight'>$total €</span></p>
                </div>
                
                <div class='buyer-info'>
                    <h3 style='margin-top:0;'>Datos del Comprador:</h3>
                    <p><strong>Nombre:</strong> $buyerName</p>
                    <p><strong>Email:</strong> <a href='mailto:$buyerEmail'>$buyerEmail</a></p>
                    <p><em>Ponte en contacto con el comprador para gestionar el pago y envío.</em></p>
                </div>
                
                <p style='margin-top: 30px;'>Rodetes Party Admin</p>
            </div>
            <div class='footer'>
                <p>Notificación automática del sistema de ventas.</p>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}

// Función para generar HTML del email de notificación al GANADOR del sorteo
function generateWinnerEmailHTML($winnerName, $eventName, $logoUrl = '')
{
    $winnerName = htmlspecialchars($winnerName);
    $eventName = htmlspecialchars($eventName);
    $logoUrl = ensureAbsoluteUrl($logoUrl);
    if (empty($logoUrl)) {
        $logoUrl = 'https://rodetesparty.sytes.net/uploads/logo.png';
    }

    $html = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header-logo { text-align: center; padding-bottom: 20px; background: #000; }
            .header-title { background: #000; color: #F02D7D; padding: 10px 20px 20px; text-align: center; }
            .content { background: #f4f4f4; padding: 30px; }
            .winner-box { background: #fff; padding: 20px; margin: 20px 0; border: 4px solid #F02D7D; text-align: center; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .highlight { color: #F02D7D; font-weight: bold; font-size: 1.2em; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header-logo'>
                 <img src='$logoUrl' alt='Rodetes Party' style='max-height: 50px; display: block; margin: 0 auto;' onerror='this.style.display=\"none\"'>
            </div>
            <div class='header-title'>
                <h1>👑 ¡HAS GANADO! 👑</h1>
            </div>
            <div class='content'>
                <p>¡Hola <strong>$winnerName</strong>!</p>
                <p>¡Tenemos grandes noticias para ti!</p>
                
                <div class='winner-box'>
                    <p style='font-size: 1.1em;'>Has sido el ganador/a del sorteo del evento:</p>
                    <p class='highlight'>$eventName</p>
                </div>
                
                <p>Por favor, <strong>acércate a la Drag presentadora</strong> (o al puesto de control) ahora mismo para recoger tu premio. 🎉</p>
                
                <p>¡Corre, te estamos esperando!</p>
                
                <p style='margin-top: 30px;'>¡Felicidades! 💖</p>
                <p><strong>Rodetes Party</strong></p>
            </div>
            <div class='footer'>
                <p>Este es un email automático. Por favor no respondas.</p>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}
?>