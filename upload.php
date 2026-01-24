<?php
// upload.php - Script para subir imágenes
// Seguridad: Verificar sesión, tipos de archivo, etc.

session_start();

header('Content-Type: application/json');

// 1. Verificar autenticación (ajustar según tu sistema de login)
if (!isset($_SESSION['is_logged_in']) || $_SESSION['is_logged_in'] !== true) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado. No logueado.']);
    exit;
}

// 2. Configuración
$uploadDir = 'uploads/'; // Directorio relativo a este script
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// 3. Procesar archivo
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['file'];
        $fileName = basename($file['name']);
        $fileTmpPath = $file['tmp_name'];
        $fileSize = $file['size'];
        $fileType = $file['type'];

        // Validar tipo de archivo (solo imágenes)
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($fileType, $allowedTypes)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Tipo de archivo no permitido. Solo JPG, PNG, GIF, WEBP.']);
            exit;
        }

        // Validar tamaño (ej. max 5MB)
        if ($fileSize > 5 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El archivo es demasiado grande (Max 5MB).']);
            exit;
        }

        // Generar nombre único para evitar colisiones
        $newFileName = uniqid('img_', true) . '.' . pathinfo($fileName, PATHINFO_EXTENSION);
        $destPath = $uploadDir . $newFileName;

        if (move_uploaded_file($fileTmpPath, $destPath)) {
            // Éxito
            echo json_encode([
                'success' => true,
                'message' => 'Archivo subido correctamente.',
                'url' => $destPath // Devolver la ruta relativa para guardar en BD
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al mover el archivo subido.']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No se recibió ningún archivo o hubo un error en la subida.']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
}
?>