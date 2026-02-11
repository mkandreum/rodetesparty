<?php
require_once __DIR__ . '/../config/security_config.php';

// Start secure session
startSecureSession();

// Set security headers
setSecurityHeaders();
header('Content-Type: application/json');

// --- Seguridad: Configuración desde Variables de Entorno (Docker) ---
$validEmail = getenv('ADMIN_EMAIL') ?: 'admin@rodetes.com';
$validPassword = getenv('ADMIN_PASSWORD') ?: 'admin';

// Leer entrada JSON
$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');
// Support both 'password' and 'hash' for backward compatibility
$clientPassword = $input['password'] ?? $input['hash'] ?? '';
$csrfToken = $input['csrf_token'] ?? '';

// Validate CSRF token (except for first login when no session exists)
if (isset($_SESSION['is_logged_in']) && !validateCSRFToken($csrfToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Token de seguridad inválido']);
    exit;
}

// Rate limiting: Simple IP-based attempt tracking
$loginAttemptsFile = '/var/www/data_private/login_attempts.json';
$clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$maxAttempts = 5;
$lockoutTime = 900; // 15 minutes

// Load login attempts
$attempts = [];
if (file_exists($loginAttemptsFile)) {
    $attemptsData = json_decode(file_get_contents($loginAttemptsFile), true);
    if ($attemptsData) {
        $attempts = $attemptsData;
    }
}

// Clean old attempts
$now = time();
foreach ($attempts as $ip => $data) {
    if ($now - $data['last_attempt'] > $lockoutTime) {
        unset($attempts[$ip]);
    }
}

// Check if IP is locked out
if (isset($attempts[$clientIP]) && $attempts[$clientIP]['count'] >= $maxAttempts) {
    $timeSinceLastAttempt = $now - $attempts[$clientIP]['last_attempt'];
    if ($timeSinceLastAttempt < $lockoutTime) {
        $remainingTime = ceil(($lockoutTime - $timeSinceLastAttempt) / 60);
        http_response_code(429);
        echo json_encode(['success' => false, 'message' => "Demasiados intentos. Intenta de nuevo en $remainingTime minutos."]);
        exit;
    } else {
        // Reset after lockout period
        unset($attempts[$clientIP]);
    }
}

// Validate credentials
// Note: For backward compatibility, we support both SHA-256 (old) and direct password
// In production, the environment variable should contain the raw password, not a hash
$isValidLogin = false;

if ($email === $validEmail) {
    // Check if clientPassword is already a SHA-256 hash (backward compatibility)
    $validPasswordHash = hash('sha256', $validPassword);
    if ($clientPassword === $validPasswordHash) {
        $isValidLogin = true;
    }
    // Also check direct password match
    else if ($clientPassword === $validPassword) {
        $isValidLogin = true;
    }
}

if ($isValidLogin) {
    // Successful login - regenerate session ID to prevent session fixation
    session_regenerate_id(true);
    
    $_SESSION['is_logged_in'] = true;
    $_SESSION['admin_email'] = $email;
    
    // Reset login attempts for this IP
    unset($attempts[$clientIP]);
    file_put_contents($loginAttemptsFile, json_encode($attempts));
    
    // Generate CSRF token for future requests
    $token = generateCSRFToken();
    
    echo json_encode([
        'success' => true,
        'csrf_token' => $token
    ]);
} else {
    // Failed login - increment attempts
    if (!isset($attempts[$clientIP])) {
        $attempts[$clientIP] = ['count' => 0, 'last_attempt' => 0];
    }
    $attempts[$clientIP]['count']++;
    $attempts[$clientIP]['last_attempt'] = $now;
    
    // Save attempts
    $dir = dirname($loginAttemptsFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0750, true);
    }
    file_put_contents($loginAttemptsFile, json_encode($attempts));
    
    http_response_code(401);
    
    $remainingAttempts = $maxAttempts - $attempts[$clientIP]['count'];
    if ($remainingAttempts > 0) {
        echo json_encode([
            'success' => false, 
            'message' => 'Credenciales incorrectas',
            'remaining_attempts' => $remainingAttempts
        ]);
    } else {
        echo json_encode([
            'success' => false, 
            'message' => 'Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.'
        ]);
    }
}

?>
