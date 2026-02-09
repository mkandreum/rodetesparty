# Análisis de Funciones - Rodetes Party

**Fecha**: 9 de febrero de 2026  
**Proyecto**: Rodetes Party - PWA  
**Versión**: v14

---

## 📋 Resumen Ejecutivo

Este documento analiza la arquitectura funcional de la aplicación Rodetes Party, incluyendo funciones backend (PHP), frontend (JavaScript), flujos de datos, y recomendaciones de mejora.

### Métricas del Proyecto

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| app.js | 7,044 | Lógica principal frontend |
| index.php | ~3,000 | Vista principal + datos |
| style.css | 947 | Estilos y diseño |
| upload.php | 180 | Gestión de uploads |
| sw.js | 82 | Service Worker PWA |

**Total Backend PHP**: ~15 archivos  
**Total Líneas Estimadas**: ~12,000 líneas

---

## 🏗️ Arquitectura General

### Stack Tecnológico

**Backend**:
- PHP 7.4+ (sin framework)
- Sistema de archivos JSON como "base de datos"
- PHPMailer para emails
- GD Library para procesamiento de imágenes

**Frontend**:
- Vanilla JavaScript (SPA pattern)
- Tailwind CSS (via CDN)
- HTML5 APIs (Service Worker, QR, Canvas)
- Progressive Web App

**Infraestructura**:
- Docker / Apache
- Archivos JSON en `/var/www/data_private/`
- Uploads en `uploads/` con thumbnails WebP

---

## 📊 Módulos Funcionales Principales

### 1. Sistema de Autenticación
**Archivos**: `login.php`, `logout.php`

**Flujo**:
1. Usuario envía email + hash SHA-256 de password
2. Backend compara con credenciales de entorno
3. Se crea sesión PHP con `$_SESSION['is_logged_in']`
4. Frontend actualiza UI mostrando panel admin

**Estado de datos**:
```javascript
// Frontend
let isLoggedIn = false;
let adminEmail = '';
```

**Issues detectados**:
- ⚠️ SHA-256 no es seguro (ver SECURITY_AUDIT.md)
- ⚠️ No hay CSRF protection
- ⚠️ No hay rate limiting

---

### 2. Gestión de Eventos
**Archivos**: `save.php`, `app.js` (eventos section)

**Estructura de datos**:
```json
{
  "events": [
    {
      "id": "unique-id",
      "name": "Nombre del evento",
      "date": "2026-02-15",
      "time": "22:00",
      "location": "Ubicación",
      "price": "10",
      "description": "Descripción",
      "imageUrl": "uploads/...",
      "thumbnailUrl": "uploads/thumbnails/...",
      "maxTickets": 100,
      "soldTickets": 0,
      "isActive": true
    }
  ]
}
```

**Funcionalidades**:
- ✅ Crear eventos
- ✅ Editar eventos existentes
- ✅ Eliminar eventos
- ✅ Subir imágenes con generación automática de thumbnails WebP
- ✅ Control de aforo (maxTickets vs soldTickets)
- ✅ Activar/desactivar eventos

**Flujo de datos**:
```
Frontend (app.js) 
  → POST save.php 
    → datos_app.json 
      → Frontend actualiza UI
```

---

### 3. Sistema de Entradas/Tickets
**Archivos**: `save_tickets.php`, `send_email.php`

**Estructura de datos**:
```json
[
  {
    "ticketId": "unique-id",
    "eventId": "event-id",
    "nombre": "Nombre completo",
    "email": "email@example.com",
    "quantity": 2,
    "ticketType": "general",
    "purchaseDate": "ISO-8601",
    "qrCode": "data:image/png;base64,..."
  }
]
```

**Funcionalidades**:
- ✅ Compra de entradas por usuarios
- ✅ Generación automática de QR codes
- ✅ Envío automático de email con entrada
- ✅ Descarga de entrada como imagen (HTML2Canvas)
- ✅ Escaneo de QR para validación (admin)
- ✅ Gestión de entradas vendidas (admin)
- ✅ Reenvío de emails de entradas
- ✅ Protección: usuarios no-admin no pueden borrar

**Flujo de compra**:
```
1. Usuario completa formulario
2. Frontend genera QR code
3. POST save_tickets.php
4. Backend guarda + envía email
5. Usuario recibe email + puede descargar
```

---

### 4. Sistema de Drag Queens/Artistas
**Archivos**: `save.php` (sección drags)

**Estructura de datos**:
```json
{
  "drags": [
    {
      "id": "unique-id",
      "name": "Nombre artístico",
      "bio": "Biografía",
      "imageUrl": "uploads/...",
      "thumbnailUrl": "uploads/thumbnails/...",
      "instagram": "@username",
      "isActive": true
    }
  ]
}
```

**Funcionalidades**:
- ✅ Gestión completa de perfiles de artistas
- ✅ Subida de fotos
- ✅ Link a Instagram
- ✅ Mostrar/ocultar artistas

---

### 5. Sistema de Merchandise
**Archivos**: `save_merch_sales.php`, `app.js` (merch section)

**Estructura de datos**:
```json
// Productos
{
  "webMerch": [
    {
      "id": "unique-id",
      "name": "Producto",
      "description": "Descripción",
      "price": "15",
      "imageUrl": "uploads/...",
      "dragId": "asociado-drag-id",
      "isActive": true
    }
  ]
}

// Ventas
[
  {
    "saleId": "unique-id",
    "merchItemId": "product-id",
    "dragId": "drag-id",
    "buyerName": "Nombre",
    "buyerEmail": "email",
    "quantity": 1,
    "purchaseDate": "ISO-8601"
  }
]
```

**Funcionalidades**:
- ✅ Catálogo de productos
- ✅ Asociación productos → drag queen
- ✅ Compra de merchandise
- ✅ Tracking de ventas
- ✅ Panel admin de ventas

---

### 6. Sistema de Galería
**Archivos**: `app.js` (gallery section)

**Estructura de datos**:
```json
{
  "gallery": [
    {
      "id": "unique-id",
      "imageUrl": "uploads/...",
      "thumbnailUrl": "uploads/thumbnails/...",
      "caption": "Descripción opcional",
      "uploadDate": "ISO-8601"
    }
  ]
}
```

**Funcionalidades**:
- ✅ Grid de fotos con thumbnails WebP
- ✅ Modal lightbox para ver full-size
- ✅ Navegación entre fotos (prev/next)
- ✅ Lazy loading de thumbnails
- ✅ Admin puede agregar/eliminar

---

### 7. Sistema de Sorteos
**Archivos**: `send_winner_notification.php`

**Funcionalidades**:
- ✅ Selección aleatoria de ganador desde tickets
- ✅ Envío de email de notificación al ganador
- ✅ UI de selección de ganador con animación

**Flujo**:
```
1. Admin abre modal de sorteo
2. Selecciona evento
3. Sistema filtra tickets de ese evento
4. Genera ganador aleatorio
5. Muestra ganador con animación
6. Envía email de notificación
```

---

### 8. Sistema de Uploads
**Archivos**: `upload.php`

**Funcionalidades**:
- ✅ Upload de imágenes (JPEG, PNG, GIF, WebP)
- ✅ Validación de tipo MIME
- ✅ Validación de tamaño (max 5MB)
- ✅ Generación automática de thumbnails WebP 400x400
- ✅ Nombres únicos (uniqid)
- ✅ Solo accesible por admin

**Proceso de thumbnail**:
```
1. Upload imagen original
2. GD Library detecta tipo
3. Crea imagen cuadrada (crop centrado)
4. Redimensiona a 400x400
5. Convierte a WebP (calidad 80)
6. Retorna ambas URLs
```

**Optimizaciones**:
- ✅ WebP para menor tamaño
- ✅ Thumbnails para listas (performance)
- ✅ Aumento de memoria: 512M

---

### 9. Sistema de Email (PHPMailer)
**Archivos**: `send_email.php`, `save_smtp_config.php`, `test_smtp.php`

**Funcionalidades**:
- ✅ Configuración SMTP dinámica (admin panel)
- ✅ Templates HTML para emails
- ✅ Email de confirmación de ticket
- ✅ Email de notificación de ganador
- ✅ Test de configuración SMTP
- ✅ Reenvío de tickets

**Configuración SMTP**:
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "username": "email@gmail.com",
  "password": "***",
  "encryption": "tls",
  "fromEmail": "email@gmail.com",
  "fromName": "Rodetes Party"
}
```

**Issue detectado**:
- ⚠️ Password en texto plano en JSON (aunque en directorio privado)

---

### 10. Sistema de Backup/Restore
**Archivos**: `create_backup.php`, `restore_backup.php`

**Funcionalidades**:
- ✅ Backup completo de datos JSON + uploads
- ✅ Descarga de ZIP
- ✅ Restore desde ZIP
- ✅ Validación de estructura
- ✅ Solo admin

**Contenido del backup**:
- datos_app.json
- entradas_db.json
- merch_vendido.json
- smtp_config.json
- Carpeta uploads/ completa

---

### 11. Service Worker (PWA)
**Archivos**: `sw.js`

**Estrategias de caché**:
```javascript
// Cache-first para assets estáticos
// Network-first para API calls
// Precache de archivos críticos
```

**Funcionalidades**:
- ✅ Offline capability
- ✅ Instalación PWA
- ✅ Update notification
- ✅ Cache de recursos estáticos

---

## 🔄 Flujos de Datos Críticos

### Flujo 1: Carga Inicial
```
1. index.php carga datos desde JSON
2. Inserta datos en variables JavaScript globales:
   - window.PHP_INITIAL_STATE
   - window.PHP_INITIAL_TICKETS
   - window.PHP_INITIAL_MERCH_SALES
   - window.PHP_IS_LOGGED_IN
3. app.js loadInitialDataFromServer() lee variables
4. Renderiza UI según datos y estado de login
```

### Flujo 2: Sincronización de Estado
```
Frontend State → JSON → Backend Filesystem → Frontend Update

Ejemplo: Editar Evento
1. Usuario edita en modal
2. app.js actualiza appState local
3. POST a save.php con appState completo
4. save.php guarda datos_app.json
5. Frontend cierra modal y actualiza vista
```

**Issue detectado**:
- ⚠️ Se envía TODO el estado en cada cambio (ineficiente)
- Mejora: API REST con endpoints específicos

---

## 📈 Análisis de Complejidad

### Complejidad Ciclomática Estimada

| Función/Módulo | Complejidad | Comentario |
|----------------|-------------|------------|
| Gestión de eventos | Alta | Múltiples estados y validaciones |
| Sistema de tickets | Alta | Email, QR, validación |
| Upload + thumbnails | Media | Procesamiento de imágenes |
| Autenticación | Baja | Simple pero insegura |
| Service Worker | Media | Manejo de caché |

### Puntos de Dolor

1. **app.js demasiado grande** (7,044 líneas)
   - Recomendación: Modularizar en archivos separados
   
2. **Backend sin framework**
   - Pro: Simple, sin overhead
   - Con: Reinventando la rueda en validaciones, routing
   
3. **JSON como base de datos**
   - Pro: Simple para proyectos pequeños
   - Con: No escalable, sin transacciones, sin queries complejas

---

## 🧪 Validaciones Implementadas

### Backend PHP

✅ **Validaciones presentes**:
- Session checks en endpoints protegidos
- JSON validity checks
- File type validation (upload)
- File size limits
- Admin vs User permissions
- Empty field checks

❌ **Validaciones faltantes**:
- CSRF tokens
- Rate limiting
- Input sanitization comprehensive
- SQL injection N/A (no usa SQL)
- XSS prevention parcial

### Frontend JavaScript

✅ **Validaciones presentes**:
- Form field required
- Email format validation
- Number validations (price, quantity)
- Date validations
- File type validation

❌ **Validaciones faltantes**:
- Sanitización antes de enviar
- Límites de longitud de texto
- Validación de formato de imágenes real

---

## 🔧 Dependencias Externas

### CDN Dependencies
```html
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- QR Code Generator -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

<!-- HTML2Canvas -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

<!-- QR Scanner -->
<script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>

<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=VT323&display=swap">
```

**Riesgos**:
- ⚠️ Dependencia de CDNs externos
- ⚠️ Sin Subresource Integrity (SRI)
- ⚠️ Posible punto de fallo si CDN cae
- ⚠️ Privacy: Third-party requests

**Recomendación**:
- Considerar self-hosting de librerías críticas
- Implementar SRI hashes
- Fallbacks para CDNs

---

## 💡 Recomendaciones de Mejora

### Prioridad Alta

1. **Modularizar app.js**
```javascript
// Estructura propuesta:
/js
  /modules
    auth.js
    events.js
    tickets.js
    gallery.js
    merch.js
    drags.js
  /utils
    api.js
    validation.js
    qr.js
  app.js (orchestrator)
```

2. **Implementar API REST proper**
```php
// En lugar de save.php genérico:
POST   /api/events
GET    /api/events/:id
PUT    /api/events/:id
DELETE /api/events/:id
```

3. **Migrar a base de datos real**
- SQLite como mínimo (fácil, sin servidor)
- MySQL/PostgreSQL para producción
- Permite queries, transacciones, relaciones

### Prioridad Media

4. **Error Handling robusto**
```javascript
// Envolver todas las async calls
async function apiCall(endpoint, data) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showUserFriendlyError(error);
        throw error;
    }
}
```

5. **Testing**
- Unit tests para funciones críticas
- Integration tests para flujos
- E2E tests para user journeys
- Actualmente: No hay tests

### Prioridad Baja

6. **TypeScript**
- Type safety para app.js
- Prevenir bugs en runtime
- Mejor IDE support

7. **Build Pipeline**
- Minificación
- Bundling
- Tree shaking
- Source maps

---

## 📊 Métricas de Calidad

| Aspecto | Rating | Comentario |
|---------|--------|------------|
| Funcionalidad | 9/10 | Completa y funcional |
| Arquitectura | 6/10 | Monolítica, necesita refactor |
| Seguridad | 5/10 | Ver SECURITY_AUDIT.md |
| Mantenibilidad | 5/10 | app.js muy grande |
| Performance | 7/10 | Buena pero mejorable |
| Testability | 3/10 | No hay tests |
| Escalabilidad | 4/10 | JSON no escala bien |

**Puntuación Global: 5.6/10** - FUNCIONAL pero necesita mejoras arquitecturales

---

## 🎯 Roadmap Sugerido

### Q1 2026
- ✅ Auditoría de seguridad (completada)
- 🔄 Implementar fixes de seguridad críticos
- 🔄 Modularizar JavaScript

### Q2 2026
- 📌 Migrar a base de datos SQL
- 📌 Implementar API REST
- 📌 Agregar tests básicos

### Q3 2026
- 📌 TypeScript migration
- 📌 Build pipeline
- 📌 Performance optimizations

### Q4 2026
- 📌 Advanced PWA features
- 📌 Analytics
- 📌 A/B testing framework

---

## 📚 Stack Técnico Recomendado (Futuro)

**Backend**:
- PHP 8.2+ con atributos y typed properties
- Framework: Laravel/Symfony (o micro: Slim/Lumen)
- Database: PostgreSQL
- ORM: Eloquent/Doctrine
- Testing: PHPUnit

**Frontend**:
- TypeScript
- Framework: Vue 3 / React (optional, puede seguir vanilla)
- Build: Vite
- Testing: Vitest + Playwright

**DevOps**:
- Docker Compose actualizado
- CI/CD: GitHub Actions
- Monitoring: Sentry
- Analytics: Plausible (privacy-friendly)

---

**Analista**: GitHub Copilot Architecture Agent  
**Contacto**: Para preguntas sobre este análisis
