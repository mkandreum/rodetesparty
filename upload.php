<?php
/**
 * upload.php - Subida robusta de archivos para Rodetes
 */

// Desactivar visualización de errores para que no rompan el JSON
error_reporting(0);
ini_set('display_errors', 0);

session_start();
header('Content-Type: application/json');

function sendResponse($success, $message, $extra = []) {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit;
}

try {
    if (empty($_SESSION['is_logged_in'])) {
        http_response_code(403);
        sendResponse(false, 'No autorizado. Tu sesión puede haber expirado.');
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, 'Método no permitido');
    }

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errorMsg = 'No se recibió archivo';
        if (isset($_FILES['file'])) {
            switch ($_FILES['file']['error']) {
                case UPLOAD_ERR_INI_SIZE:   $errorMsg = 'El archivo excede upload_max_filesize'; break;
                case UPLOAD_ERR_FORM_SIZE:  $errorMsg = 'El archivo excede MAX_FILE_SIZE'; break;
                case UPLOAD_ERR_PARTIAL:    $errorMsg = 'Subida incompleta'; break;
                case UPLOAD_ERR_NO_FILE:     $errorMsg = 'No se subió ningún archivo'; break;
                case UPLOAD_ERR_NO_TMP_DIR: $errorMsg = 'Falta carpeta temporal'; break;
                case UPLOAD_ERR_CANT_WRITE:  $errorMsg = 'Error al escribir en disco'; break;
            }
        }
        sendResponse(false, $errorMsg);
    }

    $uploadDir = 'uploads/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            sendResponse(false, 'No se pudo crear el directorio de subidas. Verifica permisos.');
        }
    }

    if (!is_writable($uploadDir)) {
        sendResponse(false, 'El directorio de subidas no tiene permisos de escritura.');
    }

    $file = $_FILES['file'];
    $fileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($file['name'])); // Sanitizar nombre
    $targetName = time() . '_' . $fileName;
    $targetPath = $uploadDir . $targetName;

    // Validar tipo de archivo
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (strpos($mimeType, 'image/') !== 0 && strpos($mimeType, 'video/') !== 0) {
        sendResponse(false, 'Tipo de archivo no permitido: ' . $mimeType);
    }

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        sendResponse(true, 'Archivo subido con éxito', ['url' => $targetPath]);
    } else {
        http_response_code(500);
        sendResponse(false, 'Error al mover el archivo subido al destino final.');
    }

} catch (Exception $e) {
    http_response_code(500);
    sendResponse(false, 'Excepción en el servidor: ' . $e->getMessage());
} catch (Error $e) {
    http_response_code(500);
    sendResponse(false, 'Error fatal en el servidor: ' . $e->getMessage());
}
?>
