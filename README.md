# 🎉 Rodetes Party - Estructura del Proyecto

## 📁 Organización de Carpetas

```
rodetesparty/
├── 📱 APLICACIÓN PRINCIPAL
│   ├── index.php              # Punto de entrada principal
│   ├── app.js                 # Lógica JavaScript de la aplicación
│   ├── style.css              # Estilos CSS
│   ├── manifest.json          # Manifest PWA
│   ├── sw.js                  # Service Worker
│   ├── uploads.ini            # Configuración de uploads
│   ├── docker-compose.yaml    # 🐳 Docker Compose (raíz para CI/CD)
│   ├── Dockerfile             # 🐳 Imagen Docker
│   └── docker-entrypoint.sh   # 🐳 Script de inicialización
│
├── 🔐 AUTH/ - Autenticación
│   ├── login.php              # Endpoint de login
│   └── logout.php             # Endpoint de logout
│
├── 🚀 API/ - Endpoints de API
│   ├── save.php               # Guardar estado de la app
│   ├── save_tickets.php       # Guardar entradas
│   ├── save_merch_sales.php   # Guardar ventas de merch
│   ├── upload.php             # Subir imágenes/videos
│   ├── get_smtp_config.php    # Obtener configuración SMTP
│   └── save_smtp_config.php   # Guardar configuración SMTP
│
├── 📧 EMAIL/ - Sistema de correos
│   ├── send_email.php                 # Funciones de envío de emails
│   ├── send_winner_notification.php   # Notificar ganadores
│   ├── resend_ticket_email.php        # Reenviar emails de entradas
│   └── test_smtp.php                  # Test de configuración SMTP
│
├── ⚙️ CONFIG/ - Configuración
│   └── security_config.php    # Configuración de seguridad y sesiones
│
├── 🛠️ SCRIPTS/ - Utilidades y Mantenimiento
│   ├── thumbnails/
│   │   ├── check_thumbnails.php
│   │   ├── convert_thumbnails_to_webp.php
│   │   ├── fix_thumbnails.php
│   │   ├── generate_thumbnails.php
│   │   └── update_json_thumbnails_to_webp.php
│   ├── backup/
│   │   ├── create_backup.php
│   │   └── restore_backup.php
│   ├── reset_app.php
│   └── debug_paths.php
│
├──  DOCS/ - Documentación
│   ├── EXECUTIVE_SUMMARY.md
│   ├── FUNCTIONS_ANALYSIS.md
│   ├── MOBILE_DESIGN_ANALYSIS.md
│   ├── SECURITY_AND_MOBILE_IMPROVEMENTS.md
│   └── SECURITY_AUDIT.md
│
├── 🎨 RECURSOS
│   ├── icons/                 # Iconos de la PWA
│   ├── PHPMailer/            # Librería de emails
│   └── uploads/              # Imágenes y archivos subidos
│       └── thumbnails/       # Miniaturas WebP
│
└── 📝 README.md              # Este archivo
```

## 🔒 Seguridad

- **Sesiones seguras**: Configuradas con HttpOnly, SameSite, y renovación periódica
- **CSRF Protection**: Tokens en todos los endpoints sensibles
- **Rate Limiting**: Protección contra ataques de fuerza bruta
- **Headers de seguridad**: X-Frame-Options, CSP, etc.
- **Validación de archivos**: Tipos y tamaños controlados en uploads

## 🚀 Endpoints de API

### Autenticación
- `POST /auth/login.php` - Iniciar sesión
- `POST /auth/logout.php` - Cerrar sesión

### Gestión de Datos
- `POST /api/save.php` - Guardar estado de aplicación (Admin)
- `POST /api/save_tickets.php` - Guardar entradas
- `POST /api/save_merch_sales.php` - Guardar ventas

### Archivos
- `POST /api/upload.php` - Subir imágenes/videos

### Configuración SMTP
- `GET /api/get_smtp_config.php` - Obtener configuración
- `POST /api/save_smtp_config.php` - Guardar configuración

### Emails
- `POST /email/send_winner_notification.php` - Notificar ganadores
- `POST /email/resend_ticket_email.php` - Reenviar confirmaciones
- `POST /email/test_smtp.php` - Test conexión SMTP

## 🛠️ Mantenimiento

### Backups
```bash
# Crear backup
php scripts/backup/create_backup.php

# Restaurar backup (vía interfaz web admin)
```

### Thumbnails
```bash
# Generar miniaturas WebP
php scripts/thumbnails/generate_thumbnails.php

# Verificar miniaturas
php scripts/thumbnails/check_thumbnails.php
```

## 📦 Despliegue con Docker

### Despliegue Local
```bash
# Desde la raíz del proyecto
docker-compose up -d

# O con docker compose (v2)
docker compose up -d
```

### Despliegue en Coolify
Los archivos Docker están en la **raíz del proyecto** para compatibilidad directa con Coolify:
- ✅ `docker-compose.yaml` - Configuración de servicios
- ✅ `Dockerfile` - Imagen de la aplicación  
- ✅ `docker-entrypoint.sh` - Script de inicialización

Coolify detectará automáticamente estos archivos y desplegará sin configuración adicional.

## 💾 Datos Persistentes

Los datos se almacenan en `/var/www/data_private/`:
- `datos_app.json` - Estado de la aplicación
- `entradas_db.json` - Base de datos de entradas
- `merch_vendido.json` - Registro de ventas
- `smtp_config.json` - Configuración SMTP
- `login_attempts.json` - Control de intentos de login

## 🔧 Variables de Entorno

```env
ADMIN_EMAIL=admin@rodetes.com
ADMIN_PASSWORD=your_secure_password
```

## 📱 PWA Features

- ✅ Instalable en dispositivos móviles
- ✅ Funciona offline (Service Worker)
- ✅ Notificaciones push
- ✅ Caché inteligente de recursos

## 🎨 Frontend

- **Tailwind CSS** - Framework CSS
- **VT323** - Fuente retro pixelada
- **Efectos neón** - Animaciones y efectos visuales
- **Responsive** - Adaptado a todos los dispositivos

---

**Desarrollado con 💖 para Rodetes Party**
