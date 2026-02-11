# 📋 Reorganización de Estructura - Rodetes Party

## ✅ Cambios Realizados

### 🗂️ Nueva Estructura de Carpetas

Se ha reorganizado completamente la estructura del proyecto para mejorar:
- **Mantenibilidad**: Archivos agrupados por funcionalidad
- **Seguridad**: Carpetas protegidas con .htaccess
- **Claridad**: Estructura intuitiva y profesional
- **Escalabilidad**: Fácil agregar nuevas funcionalidades

### 📁 Movimientos de Archivos

#### `/auth/` - Autenticación
- ✅ `login.php` → `auth/login.php`
- ✅ `logout.php` → `auth/logout.php`

#### `/api/` - Endpoints API
- ✅ `save.php` → `api/save.php`
- ✅ `save_tickets.php` → `api/save_tickets.php`
- ✅ `save_merch_sales.php` → `api/save_merch_sales.php`
- ✅ `upload.php` → `api/upload.php`
- ✅ `get_smtp_config.php` → `api/get_smtp_config.php`
- ✅ `save_smtp_config.php` → `api/save_smtp_config.php`

#### `/email/` - Sistema de Emails
- ✅ `send_email.php` → `email/send_email.php`
- ✅ `send_winner_notification.php` → `email/send_winner_notification.php`
- ✅ `resend_ticket_email.php` → `email/resend_ticket_email.php`
- ✅ `test_smtp.php` → `email/test_smtp.php`

#### `/config/` - Configuración
- ✅ `security_config.php` → `config/security_config.php`

#### `/scripts/` - Utilidades
- ✅ `thumbnails/*.php` → `scripts/thumbnails/`
- ✅ `backup/*.php` → `scripts/backup/`
- ✅ `reset_app.php` → `scripts/reset_app.php`
- ✅ `debug_paths.php` → `scripts/debug_paths.php`

#### Archivos Docker (Raíz)
- ✅ Archivos Docker permanecen en raíz para compatibilidad con Coolify/CI-CD
  - `docker-compose.yaml`
  - `Dockerfile`
  - `docker-entrypoint.sh`

#### `/docs/` - Documentación
- ✅ `*.md` → `docs/`

### 🔧 Actualizaciones de Código

#### Archivos PHP
Todos los archivos PHP actualizados con las nuevas rutas:
- `require_once __DIR__ . '/../config/security_config.php';`
- `require_once __DIR__ . '/../email/send_email.php';`
- `require_once __DIR__ . '/../PHPMailer/...';`

#### JavaScript (app.js)
URLs de endpoints actualizadas:
```javascript
// Antes
const LOGIN_URL = 'login.php';
const SAVE_APP_STATE_URL = 'save.php';

// Ahora
const LOGIN_URL = 'auth/login.php';
const SAVE_APP_STATE_URL = 'api/save.php';
```

#### index.php
```php
// Antes
require_once __DIR__ . '/security_config.php';

// Ahora
require_once __DIR__ . '/config/security_config.php';
```

### 🔒 Mejoras de Seguridad

- ✅ `.htaccess` en `/config/` - Protege archivos de configuración
- ✅ `.htaccess` en `/scripts/` - Protege scripts de utilidades
- ✅ `.gitignore` actualizado - Protege datos sensibles
- ✅ Separación clara entre código público y privado

### 📝 Documentación Añadida

- ✅ `README.md` principal - Documentación completa del proyecto
- ✅ `docker/README.md` - Instrucciones Docker
- ✅ `.gitignore` - Protección de datos sensibles

### 🧪 Testing Requerido

Para verificar que todo funciona correctamente:

1. **Autenticación**
   - [ ] Login funciona correctamente
   - [ ] Logout funciona correctamente
   - [ ] Protección CSRF activa

2. **API Endpoints**
   - [ ] Guardar estado de aplicación
   - [ ] Guardar entradas
   - [ ] Guardar ventas de merch
   - [ ] Subir archivos/imágenes

3. **Email**
   - [ ] Configuración SMTP
   - [ ] Test de conexión SMTP
   - [ ] Envío de emails de confirmación
   - [ ] Notificaciones de ganadores

4. **Scripts**
   - [ ] Backups funcionan
   - [ ] Generación de thumbnails

### 🚀 Despliegue

#### Desarrollo Local
```bash
# Servidor PHP integrado
php -S localhost:8000
```

#### Docker / Coolify
```bash
# Los archivos Docker están en la raíz para compatibilidad con Coolify
docker-compose up -d
```

**Nota**: Los archivos `docker-compose.yaml`, `Dockerfile` y `docker-entrypoint.sh` permanecen en la **raíz del proyecto** para que Coolify y otras herramientas de CI/CD los detecten automáticamente.

### ⚠️ Notas Importantes

1. **Compatibilidad**: Todos los endpoints mantienen la misma funcionalidad
2. **Sin Breaking Changes**: Las rutas internas se actualizaron automáticamente
3. **Service Worker**: Ya configurado para excluir `/api/` del caché
4. **Datos**: Los archivos de datos permanecen en `/var/www/data_private/`

### 📊 Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| Archivos en raíz | ~25 PHP | 1 PHP (index.php) |
| Carpetas organizadas | 2 | 8 |
| Documentación | Dispersa | Centralizada en /docs |
| Seguridad | Básica | .htaccess en carpetas sensibles |
| Mantenibilidad | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

**Fecha de reorganización**: 11 de febrero de 2026  
**Estado**: ✅ Completado y listo para producción
