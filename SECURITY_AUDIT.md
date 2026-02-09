# Auditoría de Seguridad - Rodetes Party

**Fecha**: 9 de febrero de 2026  
**Proyecto**: Rodetes Party - Aplicación Web PWA para gestión de eventos  
**Versión**: v14

---

## 📋 Resumen Ejecutivo

Este documento presenta los hallazgos de la auditoría de seguridad realizada en la aplicación Rodetes Party. Se han identificado varias vulnerabilidades de seguridad que requieren atención inmediata, así como recomendaciones para mejorar la postura de seguridad general de la aplicación.

### Estado General: ⚠️ REQUIERE MEJORAS

---

## 🔴 Vulnerabilidades Críticas

### 1. Autenticación Débil con SHA-256
**Severidad**: CRÍTICA  
**Ubicación**: `login.php:20`

**Problema**:
```php
$validPasswordHash = hash('sha256', $validPassword);
```

El sistema utiliza SHA-256 simple para hashear contraseñas, lo cual NO es seguro para autenticación. SHA-256 es un algoritmo de hashing rápido diseñado para checksums, no para contraseñas.

**Riesgos**:
- Vulnerable a ataques de fuerza bruta
- Vulnerable a ataques con rainbow tables
- No incluye salt automático
- No tiene factor de trabajo ajustable

**Recomendación**:
```php
// Usar password_hash y password_verify de PHP
$validPasswordHash = password_hash($validPassword, PASSWORD_ARGON2ID);
// Al verificar:
if (password_verify($clientPassword, $validPasswordHash)) {
    // Login exitoso
}
```

---

### 2. Permisos de Archivo Inseguros (0777)
**Severidad**: CRÍTICA  
**Ubicación**: Múltiples archivos

**Archivos afectados**:
- `save_smtp_config.php:52` - `mkdir($dir, 0777, true)`
- `save_tickets.php:43` - `mkdir($dir, 0777, true)`
- `save_merch_sales.php:44` - `mkdir($dir, 0777, true)`
- `save.php:24` - `mkdir($dir, 0777, true)`
- `restore_backup.php:73,106,126` - Múltiples usos de 0777

**Problema**:
Los permisos 0777 permiten lectura, escritura y ejecución para TODOS los usuarios (owner, group, world). Esto es extremadamente peligroso en un entorno de servidor.

**Riesgos**:
- Cualquier usuario del sistema puede leer datos sensibles
- Cualquier usuario puede modificar o eliminar archivos
- Posible escalada de privilegios
- Cumplimiento: Viola OWASP, PCI-DSS, GDPR

**Recomendación**:
```php
// Para directorios de datos
mkdir($dir, 0750, true); // rwxr-x---

// Para archivos de datos
chmod($file, 0640); // rw-r-----
```

---

### 3. Falta de Protección CSRF
**Severidad**: ALTA  
**Ubicación**: Todas las operaciones POST

**Problema**:
No se implementan tokens CSRF en ningún formulario o petición POST/PUT/DELETE.

**Archivos afectados**:
- `login.php`
- `save.php`
- `save_tickets.php`
- `save_smtp_config.php`
- `upload.php`
- Todas las operaciones de modificación

**Riesgos**:
- Un atacante puede forzar a un admin autenticado a realizar acciones no deseadas
- Modificación no autorizada de datos
- Subida de archivos maliciosos

**Recomendación**:
```php
// Generar token en sesión
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Validar en cada petición POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(403);
        die('CSRF token inválido');
    }
}
```

---

### 4. Gestión de Sesiones Insegura
**Severidad**: ALTA  
**Ubicación**: Configuración de sesiones

**Problemas identificados**:
- No se establecen parámetros seguros de sesión
- No hay regeneración de ID de sesión tras login
- No hay timeout de sesión
- No se configuran cookies seguras

**Recomendación**:
```php
// Configurar sesión segura
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1); // Si usa HTTPS
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_strict_mode', 1);

session_start();

// Regenerar ID tras login exitoso
session_regenerate_id(true);
```

---

## 🟡 Vulnerabilidades Medias

### 5. Validación Insuficiente de Uploads
**Severidad**: MEDIA  
**Ubicación**: `upload.php`

**Problemas**:
- Solo valida MIME type del navegador (fácil de falsificar)
- No valida contenido real del archivo
- No valida extensión de archivo de forma robusta

**Recomendación**:
```php
// Validar extensión y tipo real
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$realMimeType = finfo_file($finfo, $fileTmpPath);
finfo_close($finfo);

$allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

$ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

if (!in_array($realMimeType, $allowedMimes) || !in_array($ext, $allowedExts)) {
    // Rechazar
}
```

---

### 6. Sin Rate Limiting en Login
**Severidad**: MEDIA  
**Ubicación**: `login.php`

**Problema**:
No hay límite de intentos de login, permitiendo ataques de fuerza bruta.

**Recomendación**:
Implementar rate limiting basado en IP o implementar captcha después de X intentos fallidos.

---

### 7. Logs con Información Sensible
**Severidad**: MEDIA  
**Ubicación**: `login.php:15-17,32-36`

**Problema**:
```php
error_log("Input Email: '" . $email . "'");
error_log("Client Hash: '" . $clientHash . "'");
```

Los logs incluyen información potencialmente sensible.

**Recomendación**:
Evitar loggear información de autenticación completa en producción.

---

## 🔵 Vulnerabilidades Bajas / Mejoras

### 8. Configuración de Headers de Seguridad
**Severidad**: BAJA  
**Ubicación**: General

**Problema**:
Faltan headers de seguridad importantes.

**Recomendación**:
```php
// Agregar en index.php o .htaccess
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Permissions-Policy: geolocation=(), microphone=(), camera=()");
```

---

### 9. Content Security Policy (CSP)
**Severidad**: BAJA  
**Ubicación**: index.php

**Problema**:
No se implementa CSP, lo que podría ayudar a prevenir XSS.

**Recomendación**:
Implementar CSP apropiada para la aplicación.

---

### 10. Dependencias Externas sin SRI
**Severidad**: BAJA  
**Ubicación**: index.php

**Problema**:
Los recursos externos (Tailwind, CDNs) no tienen Subresource Integrity (SRI).

**Recomendación**:
```html
<script src="https://cdn.tailwindcss.com" 
    integrity="sha384-..." 
    crossorigin="anonymous"></script>
```

---

## ✅ Aspectos Positivos

1. ✅ Uso de variables de entorno para credenciales (`getenv()`)
2. ✅ Validación de sesión antes de operaciones sensibles
3. ✅ Headers JSON apropiados
4. ✅ Separación de datos privados (`/var/www/data_private/`)
5. ✅ Protección contra eliminación de tickets por usuarios no-admin
6. ✅ No se devuelve password SMTP al frontend (`get_smtp_config.php:30`)
7. ✅ Validación de JSON antes de procesarlo

---

## 📊 Resumen de Prioridades

### Acción Inmediata (Crítico)
1. ❗ Reemplazar SHA-256 con `password_hash()`/`password_verify()`
2. ❗ Corregir permisos de archivos de 0777 a 0750/0640
3. ❗ Implementar protección CSRF en todos los endpoints

### Acción Urgente (Alta)
4. ⚠️ Configurar sesiones seguras
5. ⚠️ Mejorar validación de uploads
6. ⚠️ Implementar rate limiting en login

### Acción Recomendada (Media/Baja)
7. 📌 Agregar headers de seguridad
8. 📌 Implementar CSP
9. 📌 Agregar SRI a recursos externos
10. 📌 Revisar logs de información sensible

---

## 🔧 Plan de Remediación

### Fase 1 - Inmediata (Esta Sprint)
- Cambiar sistema de autenticación a password_hash
- Corregir permisos de archivos
- Implementar tokens CSRF

### Fase 2 - Corto Plazo (Próxima Sprint)
- Configurar sesiones seguras
- Mejorar validación de uploads
- Rate limiting

### Fase 3 - Mediano Plazo (Próximo mes)
- Headers de seguridad
- CSP completa
- Auditoría de logs

---

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PHP Security Guide](https://www.php.net/manual/en/security.php)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

---

**Auditor**: GitHub Copilot Security Agent  
**Contacto**: Para preguntas sobre este informe, consultar con el equipo de desarrollo
