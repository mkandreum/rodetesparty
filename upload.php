<?php
session_start();
header('Content-Type: application/json');

if (empty($_SESSION['is_logged_in'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'No se recibió archivo o hubo error']);
    exit;
}

$uploadDir = 'uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$file = $_FILES['file'];
$fileName = basename($file['name']);
// Evitar sobrescritura simple añadiendo timestamp
$targetName = time() . '_' . $fileName;
$targetPath = $uploadDir . $targetName;

// Validar tipo de archivo (básico)
$fileType = mime_content_type($file['tmp_name']);
if (strpos($fileType, 'image/') !== 0 && strpos($fileType, 'video/') !== 0) {
     echo json_encode(['success' => false, 'message' => 'Tipo de archivo no permitido. Solo imágenes y videos.']);
     exit;
}

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    // Devolver la URL relativa/absoluta según configuración.
    // Aquí devolvemos relativa a la raíz web.
    echo json_encode(['success' => true, 'url' => $targetPath]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al mover el archivo subido']);
}
?>
