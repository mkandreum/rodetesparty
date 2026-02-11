<?php
/**
 * Security Configuration
 * Include this file at the beginning of every PHP file that uses sessions
 */

/**
 * Start session and check for timeout
 */
function startSecureSession() {
    if (session_status() === PHP_SESSION_NONE) {
        // Configure secure session settings BEFORE starting session
        ini_set('session.cookie_httponly', '1'); // Prevent JavaScript access to session cookie
        ini_set('session.cookie_samesite', 'Strict'); // CSRF protection
        ini_set('session.use_strict_mode', '1'); // Reject uninitialized session IDs
        ini_set('session.use_only_cookies', '1'); // Don't accept session IDs in URLs
        
        // Enable secure cookies if HTTPS is available
        if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
            ini_set('session.cookie_secure', '1');
        }
        
        // Session timeout (30 minutes of inactivity)
        ini_set('session.gc_maxlifetime', '1800');
        ini_set('session.cookie_lifetime', '0'); // Session cookie (expires when browser closes)
        
        session_start();
        
        // Check for session timeout
        if (isset($_SESSION['LAST_ACTIVITY']) && (time() - $_SESSION['LAST_ACTIVITY'] > 1800)) {
            // Last request was more than 30 minutes ago
            session_unset();
            session_destroy();
            session_start();
        }
        $_SESSION['LAST_ACTIVITY'] = time();
        
        // Regenerate session ID periodically (every 5 minutes) to prevent fixation
        if (!isset($_SESSION['CREATED'])) {
            $_SESSION['CREATED'] = time();
        } else if (time() - $_SESSION['CREATED'] > 300) {
            session_regenerate_id(true);
            $_SESSION['CREATED'] = time();
        }
    }
}

/**
 * Generate CSRF token for current session
 */
function generateCSRFToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Validate CSRF token
 * @param string $token Token to validate
 * @return bool True if valid, false otherwise
 */
function validateCSRFToken($token) {
    if (empty($_SESSION['csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Get CSRF token for inclusion in forms/AJAX requests
 */
function getCSRFToken() {
    if (empty($_SESSION['csrf_token'])) {
        generateCSRFToken();
    }
    return $_SESSION['csrf_token'];
}

/**
 * Security headers to prevent common attacks
 */
function setSecurityHeaders() {
    // Prevent clickjacking
    header('X-Frame-Options: DENY');
    
    // Prevent MIME type sniffing
    header('X-Content-Type-Options: nosniff');
    
    // XSS protection (legacy browsers)
    header('X-XSS-Protection: 1; mode=block');
    
    // Referrer policy
    header('Referrer-Policy: strict-origin-when-cross-origin');
    
    // Permissions policy (disable unused features)
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
}
?>
