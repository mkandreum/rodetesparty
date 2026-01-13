<?php
// --- PHP: Cargar Datos del Servidor ---

// --- Seguridad: Evitar acceso directo a PHP ---
// Se asume que la autenticación/sesión se maneja en login.php, logout.php, save.php, etc.

$dataFileDir = '/var/www/data_private/'; // Ajusta esta ruta si es necesario

// Definiciones de archivos
$appStateFile = $dataFileDir . 'datos_app.json';
$ticketsFile = $dataFileDir . 'entradas_db.json';
$merchSalesFile = $dataFileDir . 'merch_vendido.json';

$initialStateJson = 'null';
$initialTicketsJson = 'null';
$initialMerchSalesJson = 'null';

// --- Función auxiliar para leer JSON de forma segura ---
function readJsonFile($filePath) {
    clearstatcache(true, $filePath); // Limpiar caché de estado de archivo
    if (file_exists($filePath)) {
        $fileContents = file_get_contents($filePath);
        if ($fileContents !== false && !empty($fileContents)) {
            // Verificar si es JSON válido antes de devolver
            json_decode($fileContents);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $fileContents;
            } else {
                error_log('Error JSON: El archivo ' . basename($filePath) . ' está corrupto.');
                return 'null'; // Devolver 'null' como string si está corrupto
            }
        }
    }
    // Si el archivo no existe o está vacío, devolver 'null' como string
    return 'null';
}

// Cargar los archivos JSON usando la función segura
$initialStateJson = readJsonFile($appStateFile);
$initialTicketsJson = readJsonFile($ticketsFile);
$initialMerchSalesJson = readJsonFile($merchSalesFile);

// --- Cargar estado de sesión ---
// Asegúrate de que session_start() se llame antes de acceder a $_SESSION
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$isLoggedIn = isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'] === true;
$adminEmail = isset($_SESSION['admin_email']) ? $_SESSION['admin_email'] : '';

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rodetes Party - Eventos</title>

    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- QR Code Generator -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

    <!-- HTML to Canvas (para descargar entradas/QR) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

    <!-- QR Code Scanner -->
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js" type="text/javascript"></script>

    <!-- JSZip (para backup/restore) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

    <!-- Hoja de estilos principal -->
    <link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="style.css">

    <style>
/* Variables para el color neón (JS las actualizará) */
        :root {
            --promo-neon-color: #F02D7D; /* Color por defecto */
        }

        /* --- Estilos Banner Promo Neón --- */
        #next-event-promo-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 50; /* Más alto que el header */
            background-color: #000;
            border-bottom: 2px solid var(--promo-neon-color);
            box-shadow: 0 0 10px var(--promo-neon-color), 0 0 20px var(--promo-neon-color);
            overflow: hidden; /* Para el efecto marquee */
            height: 0; /* Altura 0 por defecto */
            opacity: 0; /* Opacidad 0 por defecto */
            transition: height 0.3s ease-in-out, opacity 0.3s ease-in-out; /* Transición suave */
            display: flex; /* Mantenemos flex para alinear el contenido */
            align-items: center;
        }

        #next-event-promo-container.promo-visible {
            height: 40px; /* Altura deseada */
            opacity: 1; /* Hacer visible */
        }

        .promo-banner-content {
            display: inline-block;
            white-space: nowrap;
            padding-left: 100%; /* Empezar fuera de la pantalla */
            animation: marquee 10s linear infinite; /* Animación más rápida */
            font-family: 'VT323', monospace, sans-serif; /* Usar la fuente pixel */
            font-size: 24px;
            color: #fff;
            text-shadow:
                0 0 5px #fff,
                0 0 10px #fff,
                0 0 15px var(--promo-neon-color),
                0 0 20px var(--promo-neon-color),
                0 0 25px var(--promo-neon-color),
                0 0 30px var(--promo-neon-color),
                0 0 35px var(--promo-neon-color);
        }

        @keyframes marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-100%); }
        }

        /* --- Ajustes de Layout (Header, Body, Nav Secundario) --- */
        .header-main {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            transition: top 0.3s ease-in-out;
            width: 100%;
            z-index: 40;
        }

        body.promo-active .header-main {
            top: 40px;
        }

        body {
            padding-top: 80px;
            transition: padding-top 0.3s ease-in-out;
        }

        @media (max-width: 639px) {
            body { padding-top: 128px; }
        }

        body.promo-active {
            padding-top: 120px;
        }

        @media (max-width: 639px) {
            body.promo-active { padding-top: 168px; }
        }

        #secondary-nav-container {
            position: fixed;
            left: 0;
            right: 0;
            transition: top 0.3s ease-in-out;
            top: 80px;
            z-index: 30;
        }

        body.promo-active #secondary-nav-container {
            top: 120px;
        }

        /* --- Estilos Rejilla Galería Admin --- */
        .admin-gallery-grid {
            display: grid; /* Asegura que sea grid */
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); /* Define columnas */
            gap: 1rem; /* Espacio entre ítems */
            padding: 1rem;
            background-color: #1a1a1a;
            border: 1px solid #444;
            min-height: 110px; /* Altura mínima para ver el placeholder */
        }

        .admin-gallery-item {
            position: relative;
            aspect-ratio: 1 / 1; /* Forzar cuadrado */
            border: 1px solid #555;
            background-color: #000;
            overflow: hidden; /* Asegurar que la imagen no se salga */
        }

        .admin-gallery-item img {
            display: block; /* Evitar espacio extra debajo de la imagen */
            width: 100%;
            height: 100%;
            object-fit: cover; /* Cubrir el espacio sin deformar */
        }

		.admin-gallery-item .delete-img-btn {
            position: absolute;
            top: 4px;   /* AJUSTADO: Pequeño valor positivo para estar dentro */
            right: 4px; /* AJUSTADO: Pequeño valor positivo para estar dentro */
            width: 24px;  /* Mantenemos tamaño pequeño */
            height: 24px; /* Mantenemos tamaño pequeño */
            background-color: rgba(0, 0, 0, 0.7); /* FONDO SEMI-TRANSPARENTE */
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.7); /* Borde más sutil */
            border-radius: 50%;
            font-weight: bold;
            font-size: 14px;
            line-height: 1;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }

        .admin-gallery-item .delete-img-btn:hover {
            background-color: #F02D7D; /* Mantenemos hover */
            color: #000;
            border-color: #F02D7D;
            transform: scale(1.1); /* Mantenemos hover scale */
        }
    </style>

</head>
<body class="text-gray-200">

    <div id="next-event-promo-container" class="fixed top-0 left-0 right-0 z-50">
        <div id="next-event-promo" class="promo-banner-content">
            </div>
    </div>
    <header class="bg-black border-b-2 border-white left-0 right-0 z-40 header-main">
        <nav class="container mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">
                <div class="flex items-center flex-grow min-w-0 mr-4">
                    <button id="logo-btn" data-nav="home" class="focus:outline-none transition-opacity hover:opacity-80 flex-shrink-0 mr-4">
                        <div>
                            <img id="header-logo-img" src="https://placehold.co/200x80/000/fff?text=RODETES&font=vt323" alt="Logo Rodetes" class="h-16 w-auto object-contain">
                        </div>
                    </button>
                    </div>
                <div id="main-nav" class="hidden sm:flex flex-shrink-0 justify-center items-center gap-4 sm:gap-8">
                    <a href="#" data-nav="home" class="font-pixel uppercase text-lg text-gray-500 hover:text-white transition-colors text-glow-white">INICIO</a>
                    <a href="#" data-nav="events" class="font-pixel uppercase text-lg text-gray-500 hover:text-white transition-colors">EVENTOS</a>
                    <a href="#" data-nav="gallery" class="font-pixel uppercase text-lg text-gray-500 hover:text-white transition-colors">GALERÍA</a>
                    <a href="#" data-nav="merch" class="font-pixel uppercase text-lg text-gray-500 hover:text-white transition-colors">MERCH</a>
                    <a href="#" data-nav="drags" class="font-pixel uppercase text-lg text-gray-500 hover:text-white transition-colors">DRAGS</a>
                </div>
                <div class="flex-shrink-0 ml-4 sm:ml-0">
                    <button id="mobile-menu-btn" type="button" class="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-gray-300 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" aria-controls="mobile-menu" aria-expanded="false">
                        <span class="sr-only">Abrir menú principal</span>
                        <svg class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        <svg class="hidden h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
        </nav>
        <div id="mobile-menu" class="hidden absolute top-20 right-4 z-50 bg-black border-2 border-white w-64 shadow-lg shadow-white/30 rounded-none">
            <div class="px-2 pt-2 pb-3 space-y-1">
                <a href="#" data-nav="home" class="font-pixel text-lg text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md">INICIO</a>
                <a href="#" data-nav="events" class="font-pixel text-lg text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md">EVENTOS</a>
                <a href="#" data-nav="gallery" class="font-pixel text-lg text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md">GALERÍA</a>
                <a href="#" data-nav="merch" class="font-pixel text-lg text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md">MERCH</a>
                <a href="#" data-nav="drags" class="font-pixel text-lg text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md">DRAGS</a>
                <a href="#" data-nav="admin" class="font-pixel text-lg text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md <?php echo $isLoggedIn ? '' : 'hidden'; ?>">ADMIN</a>
            </div>
        </div>
    </header>

    <!-- ==== NAV SECUNDARIA (MÓVIL) ==== -->
    <div id="secondary-nav-container" class="fixed top-[80px] left-0 right-0 z-30 bg-black border-b border-gray-700 sm:hidden">
        <nav id="secondary-nav" class="container mx-auto px-4 py-2">
            <div class="flex justify-around items-center gap-4">
                <a href="#" data-nav="home" class="font-pixel uppercase text-lg text-gray-500 hover:text-white transition-colors text-glow-white">INICIO</a>
                <a href="#" data-nav="events" class="font-pixel uppercase text-lg text-gray-500 hover:text-white transition-colors">EVENTOS</a>
                <a href="#" data-nav="gallery" class="font-pixel uppercase text-lg text-gray-500 hover:text-white transition-colors">GALERÍA</a>
                <a href="#" data-nav="merch" class="font-pixel uppercase text-lg text-gray-500 hover:text-white transition-colors">MERCH</a>
                <a href="#" data-nav="drags" class="font-pixel uppercase text-lg text-gray-500 hover:text-white transition-colors">DRAGS</a>
            </div>
        </nav>
    </div>

    <!-- ==== CONTENIDO PRINCIPAL ==== -->
    <main class="container mx-auto p-4 sm:p-6 lg:p-8">

        <!-- ==== PÁGINA: INICIO ==== -->
        <div id="page-home" data-page="home" class="hidden">

            <!-- Eventos Próximos/Pasados en Inicio -->
            <h2 class="text-4xl font-pixel text-white mb-6 text-center text-glow-white glitch-hover" data-text="EVENTOS">EVENTOS</h2>
            <div id="home-event-list-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                 <p class="text-gray-400 text-center col-span-full font-pixel">Cargando eventos...</p>
            </div>

            <!-- Botón Ver Todos los Eventos -->
            <div id="view-all-events-container" class="text-center mb-12 hidden">
                <button id="view-all-events-btn" class="neon-btn font-pixel text-2xl py-3 px-8 rounded-none">
                    VER TODOS LOS EVENTOS
                </button>
            </div>

            <!-- Banner Principal (Imagen/Video) -->
            <div class="bg-black border border-white overflow-hidden mb-12 reveal-on-scroll">
                <div id="home-banner-container" class="relative w-full bg-black" style="padding-bottom: 56.25%;">
                    <div class="absolute inset-0 flex items-center justify-center bg-black text-gray-500 font-pixel">Cargando banner...</div>
                </div>
                <div class="p-8 sm:p-12 text-center">
                    <h1 class="text-5xl sm:text-7xl lg:text-8xl font-pixel text-white text-center text-glow-white mb-8 leading-tight glitch-hover" data-text="LA MEJOR FIESTA QUEER DE ALBACETE"> LA MEJOR FIESTA QUEER<br class="sm:hidden"> DE ALBACETE </h1>
                </div>
            </div>


            <!-- Galerías Pasadas en Inicio -->
            <div id="past-galleries-section" class="mt-12 reveal-on-scroll">
                <h2 class="text-4xl font-pixel text-white mb-6 text-center text-glow-white glitch-hover" data-text="GALERÍAS PASADAS">GALERÍAS DE EVENTOS PASADOS</h2>
                <div id="past-galleries-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <p class="text-gray-400 text-center col-span-full font-pixel">Cargando galerías...</p>
                </div>
            </div>
        </div>

        <!-- ==== PÁGINA: EVENTOS ==== -->
        <div id="page-events" data-page="events" class="hidden">
            <h2 class="text-3xl sm:text-4xl md:text-5xl font-pixel text-white mb-8 text-center text-glow-white glitch-hover" data-text="EVENTOS">EVENTOS</h2>
            <div id="event-list-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 <p class="text-gray-400 text-center col-span-full font-pixel">Cargando eventos...</p>
            </div>
        </div>

        <!-- ==== PÁGINA: GALERÍA ==== -->
        <div id="page-gallery" data-page="gallery" class="hidden">
            <h2 class="text-3xl sm:text-4xl md:text-5xl font-pixel text-white mb-8 text-center text-glow-white glitch-hover" data-text="GALERÍAS">GALERÍAS DE EVENTOS</h2>
            <!-- Lista de eventos con galería -->
            <div id="gallery-event-list-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 <p class="text-gray-400 text-center col-span-full font-pixel">Cargando galerías...</p>
            </div>
            <!-- Vista de imágenes de una galería -->
            <div id="gallery-image-view-container" class="hidden">
                <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <button id="gallery-back-btn" class="w-full sm:w-auto neon-btn text-white font-pixel text-lg py-2 px-6 rounded-none"> &lt; VOLVER A GALERÍAS </button>
                    <h3 id="gallery-image-view-title" class="text-3xl sm:text-4xl font-pixel text-white text-glow-white text-center sm:text-right order-first sm:order-last"></h3>
                </div>
                <div id="gallery-image-view-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                     <p class="text-gray-400 text-center col-span-full font-pixel">Cargando imágenes...</p>
                </div>
            </div>
        </div>

        <!-- ==== PÁGINA: DRAGS ==== -->
        <div id="page-drags" data-page="drags" class="hidden">
            <h2 class="text-3xl sm:text-4xl md:text-5xl font-pixel text-white mb-8 text-center text-glow-white glitch-hover" data-text="DRAGS">DRAGS</h2>
            <!-- Lista de Drags -->
            <div id="drag-list-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 <p class="text-gray-400 text-center col-span-full font-pixel">Cargando drags...</p>
            </div>
            <!-- Vista de galería de una Drag -->
            <div id="drag-gallery-view-container" class="hidden">
                <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <button id="drag-gallery-back-btn" class="w-full sm:w-auto neon-btn text-white font-pixel text-lg py-2 px-6 rounded-none"> &lt; VOLVER A DRAGS </button>
                    <h3 id="drag-gallery-view-title" class="text-3xl sm:text-4xl font-pixel text-white text-glow-white text-center sm:text-right order-first sm:order-last"></h3>
                </div>
                <div id="drag-gallery-view-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                     <p class="text-gray-400 text-center col-span-full font-pixel">Cargando imágenes...</p>
                </div>
            </div>
        </div>

        <!-- ==== PÁGINA: MERCH (NUEVA) ==== -->
        <div id="page-merch" data-page="merch" class="hidden">
            <h2 class="text-3xl sm:text-4xl md:text-5xl font-pixel text-white mb-8 text-center text-glow-white glitch-hover" data-text="MERCHANDISING">MERCHANDISING</h2>
            
            <!-- Sección: Web Merch -->
            <div id="web-merch-section" class="mb-12">
                <h3 class="text-3xl font-pixel text-white mb-6 border-b border-gray-700 pb-2">RODETES OFICIAL</h3>
                <div id="web-merch-list-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     <p class="text-gray-400 text-center col-span-full font-pixel">Cargando merch oficial...</p>
                </div>
            </div>

            <!-- Sección: Drags Merch -->
            <div id="drags-merch-section">
                <h3 class="text-3xl font-pixel text-white mb-6 border-b border-gray-700 pb-2">MERCH DRAGS</h3>
                <div id="drags-merch-list-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     <p class="text-gray-400 text-center col-span-full font-pixel">Cargando merch de drags...</p>
                </div>
            </div>
        </div>

        <!-- ==== PÁGINA: ADMIN ==== -->
        <div id="page-admin" data-page="admin" class="hidden">
            <h2 class="text-3xl sm:text-4xl md:text-5xl font-pixel text-white mb-8 text-center text-glow-white glitch-hover" data-text="ADMIN">PANEL DE ADMINISTRACIÓN</h2>
            <!-- Formulario de Login -->
            <form id="login-form" class="max-w-md mx-auto bg-gray-900 p-8 border border-white <?php echo $isLoggedIn ? 'hidden' : ''; ?>">
                <h3 class="text-3xl font-pixel text-center mb-6 text-white text-glow-white">INICIAR SESIÓN</h3>
                <div class="mb-4"><label for="email" class="block text-sm font-pixel text-lg text-gray-300 mb-1">EMAIL</label><input type="email" id="email" name="email" required class="w-full" placeholder="usuario@dominio.es"></div>
                <div class="mb-6"><label for="password" class="block text-sm font-pixel text-lg text-gray-300 mb-1">CONTRASEÑA</label><input type="password" id="password" name="password" required class="w-full" placeholder="••••••••"></div>
                <button type="submit" class="w-full neon-btn font-pixel text-2xl py-2 px-4 rounded-none"> ENTRAR </button>
            </form>

            <!-- Panel Principal de Admin -->
            <div id="admin-panel" class="<?php echo $isLoggedIn ? '' : 'hidden'; ?> max-w-4xl mx-auto">
                <!-- Cabecera de Admin (Email, Logout, Scan) -->
                <div class="flex flex-wrap justify-between items-center mb-6 bg-gray-900 p-4 border border-white gap-4">
                    <p class="text-gray-300 min-w-0 break-words">Conectado como: <span id="admin-email" class="font-semibold text-white"><?php echo htmlspecialchars($adminEmail); ?></span></p>
                    <div class="flex space-x-2 flex-shrink-0">
                        <button id="scan-qr-btn" class="bg-white text-black font-pixel text-lg px-4 py-2 rounded-none border border-gray-400 hover:bg-gray-300"> ESCANEAR QR </button>
                        <button id="logout-btn" class="bg-gray-700 text-white font-pixel text-lg px-4 py-2 rounded-none hover:bg-gray-600"> CERRAR SESIÓN </button>
                    </div>
                </div>
                <!-- Navegación de Admin (Pestañas) -->
                <div class="mb-6 flex flex-wrap gap-2 border-b-2 border-gray-700 pb-2">
                    <button data-admin-nav="events" class="admin-nav-btn font-pixel text-lg px-4 py-2 rounded-none transition-colors duration-200">EVENTOS</button>
                    <button data-admin-nav="settings" class="admin-nav-btn font-pixel text-lg px-4 py-2 rounded-none transition-colors duration-200">AJUSTES</button> <!-- CAMBIADO -->
                    <button data-admin-nav="gallery" class="admin-nav-btn font-pixel text-lg px-4 py-2 rounded-none transition-colors duration-200">GALERÍAS</button>
                    <button data-admin-nav="drags" class="admin-nav-btn font-pixel text-lg px-4 py-2 rounded-none transition-colors duration-200">DRAGS</button>
                    <button data-admin-nav="merch" class="admin-nav-btn font-pixel text-lg px-4 py-2 rounded-none transition-colors duration-200">MERCH</button>
                    <button data-admin-nav="giveaway" class="admin-nav-btn font-pixel text-lg px-4 py-2 rounded-none transition-colors duration-200">SORTEO</button>
                </div>

                <!-- Contenedor de Vistas de Admin -->
                <div id="admin-main-view">

                    <!-- Admin: Eventos -->
                    <div id="admin-page-events" data-admin-page="events" class="hidden space-y-10">
                        <!-- Formulario Añadir/Editar Evento -->
                        <form id="add-event-form" class="bg-gray-900 p-6 sm:p-8 border border-white">
                            <h3 class="text-3xl font-pixel text-white mb-6 text-glow-white">AÑADIR/EDITAR EVENTO</h3>
                            <input type="hidden" id="edit-event-id" name="edit-event-id">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div class="md:col-span-2"><label for="event-name" class="block text-sm font-pixel text-lg text-gray-300 mb-1">NOMBRE*</label><input type="text" id="event-name" name="event-name" required class="w-full" placeholder="P.EJ. FIESTA Y2K"></div>
                                <div><label for="event-date" class="block text-sm font-pixel text-lg text-gray-300 mb-1">FECHA Y HORA*</label><input type="datetime-local" id="event-date" name="event-date" required class="w-full"></div>
                                <div><label for="event-price" class="block text-sm font-pixel text-lg text-gray-300 mb-1">PRECIO (€)*</label><input type="number" id="event-price" name="event-price" required min="0" step="0.01" placeholder="p.ej. 0.00" class="w-full"></div>
                                <div class="md:col-span-2"><label for="event-capacity" class="block text-sm font-pixel text-lg text-gray-300 mb-1">CAPACIDAD*</label><input type="number" id="event-capacity" name="event-capacity" required min="0" step="1" placeholder="p.ej. 200 (0 para ilimitado)" class="w-full"></div>
                                <div class="md:col-span-2"><label for="event-description" class="block text-sm font-pixel text-lg text-gray-300 mb-1">DESCRIPCIÓN*</label><textarea id="event-description" name="event-description" rows="3" required class="w-full"></textarea></div>
                                <div class="md:col-span-2 space-y-2">
                                    <label for="event-poster-url" class="block text-sm font-pixel text-lg text-gray-300 mb-1">CARTEL (URL o Subir)</label>
                                    <input type="text" id="event-poster-url" name="event-poster-url" class="w-full mb-2" placeholder="Pega URL o sube archivo (uploads/...)">
                                    <input type="file" id="event-poster-upload" accept="image/*" class="w-full text-sm">
                                    <p class="text-xs text-gray-400 mt-1">Sube una imagen (JPG, PNG, GIF, max 5MB). La subida rellena la URL por ti.</p>
                                </div>
                            </div>
                            <button id="add-event-form-button" type="submit" class="w-full mt-6 bg-white text-black font-pixel text-2xl py-2 px-4 rounded-none border border-gray-400 hover:bg-gray-300 transition-colors duration-300"> GUARDAR EVENTO </button>
                            <button id="clear-event-form-button" type="button" class="w-full mt-2 bg-gray-700 text-white font-pixel text-lg py-2 px-4 rounded-none hover:bg-gray-600 transition-colors duration-300"> LIMPIAR FORMULARIO </button>
                        </form>
                        <!-- Lista de Eventos Actuales (Admin) -->
                        <div>
                            <h3 class="text-3xl font-pixel text-white mb-4 text-glow-white">EVENTOS ACTUALES</h3>
                            <!-- NUEVO: Botones de Filtro -->
                            <div class="mb-4 flex flex-wrap gap-2">
                                <button data-filter="all" class="event-filter-btn bg-white text-black font-pixel text-sm px-3 py-1 rounded-none border border-gray-400">TODOS</button>
                                <button data-filter="upcoming" class="event-filter-btn bg-gray-700 text-white font-pixel text-sm px-3 py-1 rounded-none hover:bg-gray-600">PRÓXIMOS</button>
                                <button data-filter="past" class="event-filter-btn bg-gray-700 text-white font-pixel text-sm px-3 py-1 rounded-none hover:bg-gray-600">PASADOS</button>
                                <button data-filter="archived" class="event-filter-btn bg-gray-700 text-white font-pixel text-sm px-3 py-1 rounded-none hover:bg-gray-600">ARCHIVADOS</button>
                            </div>
                            <ul id="admin-events-list-ul" class="space-y-4"> <li class="text-gray-400 text-center font-pixel">Cargando eventos...</li> </ul>
                        </div>
                    </div>

                    <!-- Admin: Ajustes (antes Contenido) -->
                    <div id="admin-page-settings" data-admin-page="settings" class="hidden"> <form id="content-manage-form" class="bg-gray-900 p-6 sm:p-8 border border-white space-y-8">
                            <h3 class="text-3xl font-pixel text-white mb-6 text-glow-white">AJUSTES GENERALES</h3> <div>
                                <h4 class="text-2xl font-pixel text-white mb-4 text-glow-white border-b border-gray-700 pb-2">LOGOTIPOS</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div class="space-y-2">
                                        <label for="app-logo-url" class="block text-sm font-pixel text-lg text-gray-300 mb-1">LOGO PRINCIPAL (CABECERA)</label>
                                        <input type="text" id="app-logo-url" name="app-logo-url" class="w-full mb-2" placeholder="Pega URL o sube imagen (uploads/...)">
                                        <input type="file" id="app-logo-upload" accept="image/*" class="w-full text-sm">
                                        <p class="text-xs text-gray-400 mt-1">Sube una imagen (max 5MB). Recomendado fondo transparente (PNG).</p>
                                    </div>
                                    <div class="space-y-2">
                                        <label for="ticket-logo-url" class="block text-sm font-pixel text-lg text-gray-300 mb-1">LOGO DE ENTRADA (TICKET)</label>
                                        <input type="text" id="ticket-logo-url" name="ticket-logo-url" class="w-full mb-2" placeholder="Pega URL o sube imagen (uploads/...)">
                                        <input type="file" id="ticket-logo-upload" accept="image/*" class="w-full text-sm">
                                        <p class="text-xs text-gray-400 mt-1">Sube una imagen (max 5MB). Aparecerá en el ticket descargable.</p>
                                    </div>
                                </div>
                            </div>

                            <div class="pt-4">
                                <h4 class="text-2xl font-pixel text-white mb-4 text-glow-white border-b border-gray-700 pb-2">BANNER INICIO</h4>
                                <div class="pt-4 mb-6 space-y-2">
                                    <label for="banner-url" class="block text-sm font-pixel text-lg text-gray-300 mb-1">BANNER (URL o Subir)</label>
                                    <input type="text" id="banner-url" name="banner-url" class="w-full mb-2" placeholder="Pega URL o sube archivo (imagen o vídeo)">
                                    <input type="file" id="banner-upload" accept="image/*,video/mp4,video/webm" class="w-full text-sm">
                                    <p class="text-xs text-gray-400 mt-1">Sube imagen(5MB)/vídeo(10MB) o pega URL. La subida rellena la URL.</p>
                                </div>
                            </div>

                            <div class="pt-4">
                                <h4 class="text-2xl font-pixel text-white mb-4 text-glow-white border-b border-gray-700 pb-2">PROMO PRÓXIMO EVENTO (HEADER)</h4>
                                <div class="pt-4 mb-4 flex items-center">
                                    <input type="checkbox" id="promo-enable" name="promo-enable" class="mr-3">
                                    <label for="promo-enable" class="text-sm font-pixel text-lg text-gray-300">ACTIVAR BANNER PROMO</label>
                                </div>
                                <div class="mb-6">
                                    <label for="promo-text" class="block text-sm font-pixel text-lg text-gray-300 mb-1">TEXTO BANNER PROMO</label>
                                    <input type="text" id="promo-text" name="promo-text" class="w-full" placeholder="¡PRÓXIMO: {eventName}! 🔥 {eventShortDate}">
                                    <p class="text-xs text-gray-400 mt-1">Placeholders: {eventName}, {eventDate}, {eventShortDate}, {eventPrice}. Incluye emojis aquí.</p>
                                </div>
                                <div class="mb-4">
                                    <label for="promo-neon-color" class="block text-sm font-pixel text-lg text-gray-300 mb-1">COLOR NEÓN</label>
                                    <input type="text" id="promo-neon-color" name="promo-neon-color" class="w-full" placeholder="#F02D7D">
                                    <p class="text-xs text-gray-400 mt-1">Color (hex) para el efecto neón del texto. P.ej: #F02D7D o #00FFFF.</p>
                                </div>
                                </div>

                            <div class="pt-4">
                                <h4 class="text-2xl font-pixel text-white mb-4 text-glow-white border-b border-gray-700 pb-2">DOMINIOS DE EMAIL PERMITIDOS</h4>
                                <div class="pt-4 mb-6">
                                    <label for="allowed-domains-input" class="block text-sm font-pixel text-lg text-gray-300 mb-1">LISTA DE DOMINIOS (uno por línea)</label>
                                    <textarea id="allowed-domains-input" name="allowed-domains-input" rows="5" class="w-full" placeholder="@gmail.com&#10;@hotmail.com&#10;@outlook.es"></textarea>
                                    <p class="text-xs text-gray-400 mt-1">Dominios que se aceptarán en la compra de entradas/merch. Deben empezar con @. Si está vacío, se aceptan todos.</p>
                                </div>
                            </div>

                            <div class="pt-4 space-y-4">
                                <h4 class="text-2xl font-pixel text-white mb-4 text-glow-white border-b border-gray-700 pb-2">RESPALDO / RESTAURACIÓN</h4>
                                <div class="pt-4 flex flex-col sm:flex-row gap-4">
                                    <button type="button" id="backup-btn" class="flex-1 bg-green-700 hover:bg-green-600 text-white font-pixel text-lg py-2 px-4 rounded-none transition-colors duration-300">RESPALDAR DATOS (ZIP)</button>
                                    <div>
                                        <input type="file" id="restore-input" accept=".json,.zip" class="hidden">
                                        <label for="restore-input" class="restore-label flex-1 text-center">RESTAURAR DATOS (ZIP/JSON)</label>
                                    </div>
                                </div>
                                <p class="text-xs text-gray-400 mt-1">Guarda (ZIP) o carga (ZIP o JSON antiguo) la configuración. El ZIP incluye eventos, drags, merch y entradas.</p>
                            </div>

                            <button id="content-save-btn" type="submit" class="w-full mt-8 bg-white text-black font-pixel text-2xl py-2 px-4 rounded-none border border-gray-400 hover:bg-gray-300 transition-colors duration-300"> GUARDAR AJUSTES </button>
                        </form>
                    </div>

                    <!-- Admin: Galerías -->
                    <div id="admin-page-gallery" data-admin-page="gallery" class="hidden">
                        <form id="gallery-manage-form" class="bg-gray-900 p-6 sm:p-8 border border-white">
                            <h3 class="text-3xl font-pixel text-white mb-6 text-glow-white">GESTIONAR GALERÍAS DE EVENTOS</h3>
                            <div class="mb-6"> <label for="gallery-event-select" class="block text-sm font-pixel text-lg text-gray-300 mb-1">EVENTO</label>
                                <select id="gallery-event-select" name="gallery-event-select" required class="w-full">
                                    <option value="">-- CARGANDO --</option>
                                </select>
                            </div>

                            <div class="mb-4 space-y-2">
                                <label class="block text-sm font-pixel text-lg text-gray-300 mb-1">IMÁGENES ACTUALES</label>
                                <div id="admin-gallery-preview-grid" class="admin-gallery-grid">
                                    <p class="text-gray-500 font-pixel text-center col-span-full self-center">Selecciona un evento para ver/añadir imágenes.</p>
                                </div>
                                <input type="hidden" id="gallery-urls-input" name="gallery-urls-input">
                            </div>
                            <div class="mb-6 space-y-2">
                                <label for="gallery-upload" class="block text-sm font-pixel text-lg text-gray-300 mb-1">SUBIR NUEVAS IMÁGENES</label>
                                <input type="file" id="gallery-upload" accept="image/*" multiple class="w-full text-sm">
                                <p class="text-xs text-gray-400 mt-1">Sube una o varias imágenes (max 5MB c/u). Aparecerán en la rejilla. Después pulsa "Guardar Galería".</p>
                            </div>

                            <button type="submit" class="w-full bg-white text-black font-pixel text-2xl py-2 px-4 rounded-none border border-gray-400 hover:bg-gray-300 transition-colors duration-300"> GUARDAR GALERÍA </button>
                        </form>
                    </div>

                    <!-- Admin: Drags -->
					<div id="admin-page-drags" data-admin-page="drags" class="hidden space-y-10">
                        <form id="add-drag-form" class="bg-gray-900 p-6 sm:p-8 border border-white">
                            <h3 class="text-3xl font-pixel text-white mb-6 text-glow-white">AÑADIR/EDITAR DRAG</h3>
                            <input type="hidden" id="edit-drag-id" name="edit-drag-id">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div class="md:col-span-2"><label for="drag-name" class="block text-sm font-pixel text-lg text-gray-300 mb-1">NOMBRE*</label><input type="text" id="drag-name" name="drag-name" required class="w-full" placeholder="P.EJ. PAKA LA PIRAÑA"></div>
                                <div><label for="drag-instagram" class="block text-sm font-pixel text-lg text-gray-300 mb-1">INSTAGRAM (sin @)</label><input type="text" id="drag-instagram" name="drag-instagram" class="w-full" placeholder="paka.lapiraña"></div>
                                <div><label for="drag-card-color" class="block text-sm font-pixel text-lg text-gray-300 mb-1">COLOR (Hex)</label><input type="text" id="drag-card-color" name="drag-card-color" class="w-full" placeholder="#F02D7D"></div>
                                <div class="md:col-span-2"><label for="drag-description" class="block text-sm font-pixel text-lg text-gray-300 mb-1">DESCRIPCIÓN*</label><textarea id="drag-description" name="drag-description" rows="3" required class="w-full"></textarea></div>
                                <div class="md:col-span-2 space-y-2">
                                    <label for="drag-cover-url" class="block text-sm font-pixel text-lg text-gray-300 mb-1">IMAGEN DE PORTADA (URL o Subir)</label>
                                    <input type="text" id="drag-cover-url" name="drag-cover-url" class="w-full mb-2" placeholder="Pega URL o sube archivo (uploads/...)">
                                    <input type="file" id="drag-cover-upload" accept="image/*" class="w-full text-sm">
                                    <p class="text-xs text-gray-400 mt-1">Sube una imagen (max 5MB). La subida rellena la URL por ti.</p>
                                </div>

                                <div class="md:col-span-2 space-y-2 border-t border-gray-700 pt-6">
                                    <label class="block text-sm font-pixel text-lg text-gray-300 mb-1">GALERÍA DE IMÁGENES</label>
                                    <div id="admin-drag-gallery-preview-grid" class="admin-gallery-grid">
                                        <p class="text-gray-500 font-pixel text-center col-span-full self-center">Edita una drag existente o guarda una nueva para añadir imágenes.</p>
                                    </div>
                                    <input type="hidden" id="drag-gallery-urls" name="drag-gallery-urls">
                                </div>
                                <div class="md:col-span-2 space-y-2">
                                    <label for="drag-gallery-upload" class="block text-sm font-pixel text-lg text-gray-300 mb-1">SUBIR IMÁGENES (Galería)</label>
                                    <input type="file" id="drag-gallery-upload" accept="image/*" multiple class="w-full text-sm">
                                    <p class="text-xs text-gray-400 mt-1">Sube una o varias imágenes (max 5MB c/u). Aparecerán en la rejilla. Después pulsa "Guardar Drag".</p>
                                </div>
                                </div>
                            <button id="add-drag-form-button" type="submit" class="w-full mt-6 bg-white text-black font-pixel text-2xl py-2 px-4 rounded-none border border-gray-400 hover:bg-gray-300 transition-colors duration-300"> GUARDAR DRAG </button>
                            <button id="clear-drag-form-button" type="button" class="w-full mt-2 bg-gray-700 text-white font-pixel text-lg py-2 px-4 rounded-none hover:bg-gray-600 transition-colors duration-300"> LIMPIAR FORMULARIO </button>
                        </form>
                        <div>
                            <h3 class="text-3xl font-pixel text-white mb-4 text-glow-white">DRAGS ACTUALES</h3>
                            <ul id="admin-drags-list-ul" class="space-y-4"> <li class="text-gray-400 text-center font-pixel">Cargando drags...</li> </ul>
                        </div>
                    </div>

                    <!-- Admin Merch -->
                    <!-- Admin Merch -->
                    <div id="admin-page-merch" data-admin-page="merch" class="hidden space-y-10">
                        
                        <!-- ========== SECCIÓN 1: MERCH DE LA WEB ========== -->
                        <div class="bg-gray-900 p-6 sm:p-8 border border-white space-y-6">
                            <div class="flex justify-between items-center">
                                <h3 class="text-3xl font-pixel text-white text-glow-white">MERCH DE LA WEB</h3>
                                <button id="add-web-merch-btn" type="button" class="bg-pink-600 hover:bg-pink-500 text-white font-pixel text-lg py-2 px-6 rounded-none transition-colors duration-300">
                                    + AÑADIR MERCH WEB
                                </button>
                            </div>

                            <!-- Formulario Añadir/Editar Web Merch (oculto por defecto) -->
                            <form id="web-merch-form" class="bg-gray-800 p-6 border border-gray-600 hidden">
                                <h4 class="text-2xl font-pixel text-white mb-4 text-glow-white">AÑADIR/EDITAR MERCH WEB</h4>
                                <input type="hidden" id="edit-web-merch-id" name="edit-web-merch-id">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div class="md:col-span-2"><label for="web-merch-name" class="block text-sm font-pixel text-lg text-gray-300 mb-1">NOMBRE*</label><input type="text" id="web-merch-name" name="web-merch-name" required class="w-full" placeholder="P.EJ. CAMISETA LOGO"></div>
                                    <div><label for="web-merch-price" class="block text-sm font-pixel text-lg text-gray-300 mb-1">PRECIO (€)*</label><input type="number" id="web-merch-price" name="web-merch-price" required min="0" step="0.01" placeholder="p.ej. 25.00" class="w-full"></div>
                                    <div class="md:col-span-2 space-y-2">
                                        <label for="web-merch-image-url" class="block text-sm font-pixel text-lg text-gray-300 mb-1">IMAGEN (URL o Subir)</label>
                                        <input type="text" id="web-merch-image-url" name="web-merch-image-url" class="w-full mb-2" placeholder="Pega URL o sube archivo (uploads/...)">
                                        <input type="file" id="web-merch-image-upload" accept="image/*" class="w-full text-sm">
                                        <p class="text-xs text-gray-400 mt-1">Sube una imagen (max 5MB).</p>
                                    </div>
                                </div>
                                <div class="flex gap-4 mt-6">
                                    <button id="save-web-merch-btn" type="submit" class="flex-1 bg-white text-black font-pixel text-xl py-2 px-4 rounded-none border border-gray-400 hover:bg-gray-300 transition-colors duration-300">GUARDAR</button>
                                    <button id="cancel-web-merch-btn" type="button" class="flex-1 bg-gray-700 text-white font-pixel text-lg py-2 px-4 rounded-none hover:bg-gray-600 transition-colors duration-300">CANCELAR</button>
                                </div>
                            </form>

                            <!-- Lista de Web Merch -->
                            <div>
                                <h4 class="text-2xl font-pixel text-white mb-4 text-glow-white">LISTA DE MERCH WEB</h4>
                                <ul id="web-merch-list-container" class="space-y-4">
                                    <li class="text-gray-400 text-center font-pixel">Cargando merch web...</li>
                                </ul>
                            </div>

                            <!-- Resumen de Ventas de Web Merch -->
                            <div id="web-merch-sales-summary" class="bg-gray-800 p-6 border border-gray-600 space-y-4">
                                <h4 class="text-2xl font-pixel text-white text-glow-white">RESUMEN DE VENTAS (WEB)</h4>
                                <div class="flex flex-col sm:flex-row justify-between gap-4">
                                    <div class="text-center">
                                        <p class="text-lg font-pixel text-gray-400">Total Ventas (Items Entregados)</p>
                                        <p id="web-merch-total-items" class="text-4xl font-pixel text-white">0</p>
                                    </div>
                                    <div class="text-center">
                                        <p class="text-lg font-pixel text-gray-400">Total Ingresos (€ Entregados)</p>
                                        <p id="web-merch-total-revenue" class="text-4xl font-pixel text-green-400">0.00 €</p>
                                    </div>
                                </div>
                                <button id="web-merch-view-sales-btn" class="w-full mt-2 bg-green-700 hover:bg-green-600 text-white font-pixel text-lg py-2 px-4 rounded-none transition-colors duration-300">
                                    VER LISTA DE VENTAS WEB
                                </button>
                            </div>
                        </div>

                        <!-- ========== SECCIÓN 2: MERCH DE DRAGS ========== -->
                        <div class="bg-gray-900 p-6 sm:p-8 border border-white space-y-6">
                            <h3 class="text-3xl font-pixel text-white mb-6 text-glow-white">MERCH DE DRAGS</h3>
                            
                            <!-- Select Drag -->
                            <div class="mb-6">
                                <label for="drag-merch-select-drag" class="block text-sm font-pixel text-lg text-gray-300 mb-1">SELECCIONA DRAG</label>
                                <select id="drag-merch-select-drag" name="drag-merch-select-drag" class="w-full">
                                    <option value="">-- SELECCIONA UNA DRAG --</option>
                                </select>
                            </div>

                            <!-- Formulario Añadir/Editar Drag Merch (oculto hasta seleccionar) -->
                            <form id="drag-merch-form" class="bg-gray-800 p-6 border border-gray-600 hidden">
                                <h4 class="text-2xl font-pixel text-white mb-4 text-glow-white">AÑADIR/EDITAR ARTÍCULO DRAG</h4>
                                <input type="hidden" id="edit-drag-merch-id" name="edit-drag-merch-id">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div class="md:col-span-2"><label for="drag-merch-name" class="block text-sm font-pixel text-lg text-gray-300 mb-1">NOMBRE*</label><input type="text" id="drag-merch-name" name="drag-merch-name" required class="w-full" placeholder="P.EJ. CAMISETA LOGO"></div>
                                    <div><label for="drag-merch-price" class="block text-sm font-pixel text-lg text-gray-300 mb-1">PRECIO (€)*</label><input type="number" id="drag-merch-price" name="drag-merch-price" required min="0" step="0.01" placeholder="p.ej. 25.00" class="w-full"></div>
                                    <div class="md:col-span-2 space-y-2">
                                        <label for="drag-merch-image-url" class="block text-sm font-pixel text-lg text-gray-300 mb-1">IMAGEN (URL o Subir)</label>
                                        <input type="text" id="drag-merch-image-url" name="drag-merch-image-url" class="w-full mb-2" placeholder="Pega URL o sube archivo (uploads/...)">
                                        <input type="file" id="drag-merch-image-upload" accept="image/*" class="w-full text-sm">
                                        <p class="text-xs text-gray-400 mt-1">Sube una imagen (max 5MB).</p>
                                    </div>
                                </div>
                                <div class="flex gap-4 mt-6">
                                    <button id="save-drag-merch-btn" type="submit" class="flex-1 bg-white text-black font-pixel text-xl py-2 px-4 rounded-none border border-gray-400 hover:bg-gray-300 transition-colors duration-300">GUARDAR</button>
                                    <button id="cancel-drag-merch-btn" type="button" class="flex-1 bg-gray-700 text-white font-pixel text-lg py-2 px-4 rounded-none hover:bg-gray-600 transition-colors duration-300">CANCELAR</button>
                                </div>
                            </form>

                            <!-- Lista de Drag Merch -->
                            <div>
                                <h4 class="text-2xl font-pixel text-white mb-4 text-glow-white">ARTÍCULOS DE LA DRAG</h4>
                                <ul id="drag-merch-list-container" class="space-y-4">
                                    <li class="text-gray-400 text-center font-pixel">Selecciona una drag para ver/añadir merch.</li>
                                </ul>
                            </div>

                            <!-- Resumen de Ventas de Drag Merch -->
                            <div id="drag-merch-sales-summary" class="bg-gray-800 p-6 border border-gray-600 space-y-4 hidden">
                                <h4 class="text-2xl font-pixel text-white text-glow-white">RESUMEN DE VENTAS (DRAG)</h4>
                                <div class="flex flex-col sm:flex-row justify-between gap-4">
                                    <div class="text-center">
                                        <p class="text-lg font-pixel text-gray-400">Total Ventas (Items Entregados)</p>
                                        <p id="drag-merch-total-items" class="text-4xl font-pixel text-white">0</p>
                                    </div>
                                    <div class="text-center">
                                        <p class="text-lg font-pixel text-gray-400">Total Ingresos (€ Entregados)</p>
                                        <p id="drag-merch-total-revenue" class="text-4xl font-pixel text-green-400">0.00 €</p>
                                    </div>
                                </div>
                                <button id="drag-merch-view-sales-btn" class="w-full mt-2 bg-green-700 hover:bg-green-600 text-white font-pixel text-lg py-2 px-4 rounded-none transition-colors duration-300">
                                    VER LISTA DE VENTAS DRAG
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Admin: Sorteo -->
                    <div id="admin-page-giveaway" data-admin-page="giveaway" class="hidden space-y-8">
                        <div>
                            <h3 class="text-3xl font-pixel text-white mb-4 text-glow-white">SORTEO</h3>
                             <!-- NUEVO: Campo para número de ganadores -->
                             <div class="mb-4">
                                <label for="giveaway-num-winners" class="block text-sm font-pixel text-lg text-gray-300 mb-1">NÚMERO DE GANADORES</label>
                                <input type="number" id="giveaway-num-winners" name="giveaway-num-winners" value="1" min="1" class="w-full max-w-[100px] text-center">
                            </div>
                            <div id="giveaway-winner-result" class="mb-6 p-6 border border-dashed border-green-500 bg-gray-800 text-center min-h-[150px] flex items-center justify-center rounded-none"><p class="text-gray-500 font-pixel">SELECCIONA EVENTO Y PULSA "INDICAR GANADOR"</p></div>
                        </div>
                        <div>
                            <h4 class="text-2xl font-pixel text-white mb-4 text-glow-white">Eventos con Entradas</h4>
                            <ul id="giveaway-events-list-ul" class="space-y-3"><li class="text-gray-400 text-center font-pixel">Cargando eventos...</li></ul>
                        </div>
                    </div>
                </div>

                <!-- Vista de Escáner QR -->
                <div id="admin-scanner-view" class="hidden bg-gray-900 p-6 border border-white">
                    <h3 class="text-3xl font-pixel text-white mb-4 text-center text-glow-white">ESCANEAR CÓDIGO</h3>
                    <div id="scanner-video-view">
                        <div id="scanner-video-region" class="relative w-full max-w-md mx-auto bg-black rounded-none overflow-hidden border border-white aspect-square">
                            </div>
                        <p id="scanner-message" class="text-center text-gray-400 mt-4 h-12 flex items-center justify-center font-pixel text-lg"></p>
                        <button id="scan-back-btn" class="w-full mt-4 bg-gray-700 text-white font-pixel text-xl py-2 px-4 rounded-none hover:bg-gray-600 transition-colors duration-300"> VOLVER AL PANEL </button>
                    </div>
                    <div id="scanner-input-view" class="hidden">
                        <p id="scanner-input-message" class="text-center text-green-400 mt-4 h-auto flex flex-col items-center justify-center font-pixel text-lg leading-tight">
                            </p>
                        <div class="my-6">
                            <label for="scanner-quantity-input" class="block text-center font-pixel text-2xl text-white mb-3">¿CUÁNTOS ENTRAN AHORA?</label>
                            <input type="number" id="scanner-quantity-input" min="1" value="1" class="w-full text-center text-3xl p-3">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <button id="scanner-cancel-btn" class="w-full bg-gray-700 text-white font-pixel text-xl py-3 px-4 rounded-none hover:bg-gray-600">CANCELAR</button>
                            <button id="scanner-confirm-btn" class="w-full bg-white text-black font-pixel text-xl py-3 px-4 rounded-none border border-gray-400 hover:bg-gray-300">CONFIRMAR</button>
                        </div>
                        
                        <button id="scanner-close-btn" class="w-full mt-4 bg-gray-800 text-gray-400 font-pixel text-lg py-2 px-4 rounded-none hover:bg-gray-700 hover:text-white transition-colors duration-300">
                            VOLVER AL PANEL
                        </button>
                        </div>
                </div>
                </div>
            </div>
        </div>
    </main>

    <!-- ==== MODALES GLOBALES ==== -->

    <!-- Modal: Pedir Email (Entradas) -->
    <div id="email-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 modal-backdrop-fade-in">
        <form id="email-form" class="bg-black border-2 border-white max-w-sm w-full p-6 modal-content-scale-in rounded-none">
            <h3 class="text-2xl font-pixel text-white text-glow-white mb-4">CONSEGUIR ENTRADA</h3>
            <p class="text-gray-300 mb-4 text-sm">Introduce tus datos y la cantidad. Una compra por email.</p>
            <!-- NUEVO: Campos Nombre y Apellidos -->
            <div class="mb-4"><label for="ticket-nombre" class="block text-sm font-pixel text-lg text-gray-300 mb-1">NOMBRE*</label><input type="text" id="ticket-nombre" name="ticket-nombre" required class="w-full" placeholder="Tu nombre"></div>
            <div class="mb-4"><label for="ticket-apellidos" class="block text-sm font-pixel text-lg text-gray-300 mb-1">APELLIDOS*</label><input type="text" id="ticket-apellidos" name="ticket-apellidos" required class="w-full" placeholder="Tus apellidos"></div>
            <div class="mb-4"><label for="ticket-email" class="block text-sm font-pixel text-lg text-gray-300 mb-1">EMAIL*</label><input type="email" id="ticket-email" name="ticket-email" required class="w-full" placeholder="tu@email.com"></div>
            <div class="mb-6"><label for="ticket-quantity" class="block text-sm font-pixel text-lg text-gray-300 mb-1">CANTIDAD*</label><input type="number" id="ticket-quantity" name="ticket-quantity" required value="1" min="1" class="w-full"></div>
            <div class="flex flex-col sm:flex-row justify-end gap-3">
                <button type="button" data-close-modal="email-modal" class="bg-gray-700 text-white font-pixel text-lg py-2 px-4 rounded-none hover:bg-gray-600 transition-colors order-last sm:order-first"> CANCELAR </button>
                <button type="submit" class="bg-white text-black font-pixel text-lg py-2 px-4 rounded-none border border-gray-400 hover:bg-gray-300 transition-colors"> CONFIRMAR </button>
            </div>
        </form>
    </div>

  <!-- Modal: Mostrar Ticket (Entradas) -->
    <div id="ticket-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 modal-backdrop-fade-in">
        <div class="bg-black border-2 border-white max-w-sm w-full relative modal-content-scale-in rounded-none overflow-hidden">
            <button data-close-modal="ticket-modal" class="absolute top-2 right-2 bg-white text-black rounded-full h-8 w-8 flex items-center justify-center border-2 border-black text-2xl font-bold leading-none hover:bg-gray-300 z-10">&times;</button>
            <div id="ticket-to-download" class="p-6 sm:p-8 bg-black relative">
                <!-- NOU: Contenidor del cartell (a dalt a la dreta) -->
                <div id="ticket-event-poster-container" class="absolute top-0 right-0 p-3 z-0 w-24 h-24 overflow-hidden opacity-70">
                    <img id="ticket-event-poster-img" src="" alt="Cartel Evento" class="w-full h-full object-cover rounded-sm border border-black" onerror="this.style.display='none';" />
                </div>
                <!-- FI NOU -->

                <div class="border-b-2 border-dashed border-gray-500 pb-4 sm:pb-6 text-center z-10 relative">
                    <img id="ticket-logo-img" src="https://placehold.co/200x80/000/fff?text=LOGO&font=vt323" alt="Logo" class="h-16 w-auto object-contain mx-auto mb-4 hidden">
                    <!-- NUEVO: Mostrar Nombre -->
                    <p id="ticket-holder-name" class="text-lg text-white font-bold font-pixel mb-1">Nombre Apellido</p>
                    <p class="text-sm text-gray-400 font-pixel">ENTRADA VÁLIDA</p>
                </div>
                <div class="py-6 text-center z-10 relative">
                    <h3 id="ticket-event-name" class="text-3xl font-pixel text-white text-glow-white mb-2 break-words">EVENTO</h3>
                    <p id="ticket-event-date" class="text-base text-gray-300 font-pixel mb-3">Fecha</p>
                    <p id="ticket-quantity-details" class="text-lg text-white font-bold mb-6">Cantidad: 1</p>
                    <div id="ticket-qr-code" class="flex justify-center items-center w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] mx-auto mb-6 bg-white p-2 rounded-none border border-white">
                        <div class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">QR</div>
                    </div>
                    <p class="text-yellow-400 font-bold text-sm font-pixel px-4 py-2 bg-yellow-900 border border-yellow-700 rounded-none">¡IMPORTANTE! HAZ CAPTURA O DESCARGA.</p>
                </div>
            </div>
            <div class="p-4 sm:p-6 bg-gray-900 border-t border-white">
                <button id="download-ticket-btn" class="w-full bg-white text-black font-pixel text-xl sm:text-2xl py-3 px-4 rounded-none border border-gray-400 hover:bg-gray-300 transition-colors duration-300"> DESCARGAR ENTRADA (PNG) </button>
            </div>
        </div>
    </div>


    <!-- Modal: Lista de Entradas (Admin) -->
    <div id="ticket-list-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 modal-backdrop-fade-in">
        <div class="bg-black border-2 border-white max-w-md w-full p-6 modal-content-scale-in rounded-none flex flex-col max-h-[80vh]">
            <h3 id="ticket-list-title" class="flex-shrink-0 text-2xl font-pixel text-white text-glow-white mb-4">Lista de Entradas</h3>
            <!-- NUEVO: Barra de Búsqueda -->
            <div class="mb-4 flex-shrink-0">
            </div>
            <div id="ticket-list-content" class="text-gray-300 mb-6 overflow-y-auto pr-2">
                 <p class="text-gray-400 text-center font-pixel">Cargando lista...</p>
            </div>
            <button data-close-modal="ticket-list-modal" class="mt-auto flex-shrink-0 bg-white text-black font-pixel text-lg py-2 px-6 rounded-none border border-gray-400 hover:bg-gray-300 transition-colors duration-300"> CERRAR </button>
        </div>
    </div>

    <!-- Modal: Lista de Ventas de Merch (Admin) -->
    <div id="merch-sales-list-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 modal-backdrop-fade-in">
        <div class="bg-black border-2 border-white max-w-lg w-full p-6 modal-content-scale-in rounded-none flex flex-col max-h-[80vh]">
            <h3 id="merch-sales-list-title" class="flex-shrink-0 text-2xl font-pixel text-white text-glow-white mb-4">Lista de Ventas de Merch</h3>
             <!-- NUEVO: Barra de Búsqueda -->
             <div class="mb-4 flex-shrink-0">
                <input type="search" id="merch-sales-list-search" placeholder="Buscar por nombre, email o artículo..." class="w-full">
            </div>
            <div id="merch-sales-list-content" class="text-gray-300 mb-6 overflow-y-auto pr-2">
                 <p class="text-gray-400 text-center font-pixel">Cargando lista de ventas...</p>
            </div>
            <button data-close-modal="merch-sales-list-modal" class="mt-auto flex-shrink-0 bg-white text-black font-pixel text-lg py-2 px-6 rounded-none border border-gray-400 hover:bg-gray-300 transition-colors duration-300"> CERRAR </button>
        </div>
    </div>

    <!-- Modal: Vista Ampliada de Imagen (Galería) -->
    <div id="image-modal" class="hidden fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4 modal-backdrop-fade-in" data-close-modal="image-modal">
        <div class="relative max-w-3xl max-h-[90vh] w-full h-full flex items-center justify-center modal-content-scale-in">
            <button data-close-modal="image-modal" class="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full h-8 w-8 flex items-center justify-center border-2 border-white text-2xl font-bold leading-none hover:bg-opacity-75 z-30 transition-opacity">&times;</button>
            <img id="image-modal-content" src="" alt="Vista ampliada" class="max-w-full max-h-full object-contain">
            <button id="image-modal-prev" class="hidden absolute top-1/2 left-2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity text-3xl z-20">&lt;</button>
            <button id="image-modal-next" class="hidden absolute top-1/2 right-2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity text-3xl z-20">&gt;</button>
        </div>
    </div>

    <!-- ==== MODALES DE MERCHANDISING ==== -->

    <!-- Modal: Galería de Merch (Público) -->
    <div id="merch-gallery-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 modal-backdrop-fade-in">
        <div class="bg-black border-2 border-white max-w-3xl w-full p-6 modal-content-scale-in rounded-none flex flex-col max-h-[90vh]">
            <div class="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 id="merch-gallery-title" class="text-2xl font-pixel text-white text-glow-white">Merchandising</h3>
                <button data-close-modal="merch-gallery-modal" class="bg-white text-black rounded-full h-8 w-8 flex items-center justify-center border-2 border-black text-2xl font-bold leading-none hover:bg-gray-300 z-10">&times;</button>
            </div>
            <div id="merch-gallery-content" class="text-gray-300 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <p class="text-gray-400 text-center font-pixel col-span-full">Cargando merchandising...</p>
            </div>
        </div>
    </div>

    <!-- Modal: Pedir Email (Merch) -->
    <div id="merch-purchase-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[55] p-4 modal-backdrop-fade-in">
        <form id="merch-purchase-form" class="bg-black border-2 border-white max-w-sm w-full p-6 modal-content-scale-in rounded-none">
            <h3 class="text-2xl font-pixel text-white text-glow-white mb-2">COMPRAR MERCH</h3>
            <p id="merch-purchase-item-name" class="text-lg text-gray-300 font-pixel mb-4">Nombre del Artículo</p>
             <!-- NUEVO: Campos Nombre y Apellidos -->
             <div class="mb-4"><label for="merch-nombre" class="block text-sm font-pixel text-lg text-gray-300 mb-1">NOMBRE*</label><input type="text" id="merch-nombre" name="merch-nombre" required class="w-full" placeholder="Tu nombre"></div>
             <div class="mb-4"><label for="merch-apellidos" class="block text-sm font-pixel text-lg text-gray-300 mb-1">APELLIDOS*</label><input type="text" id="merch-apellidos" name="merch-apellidos" required class="w-full" placeholder="Tus apellidos"></div>
            <div class="mb-4"><label for="merch-email" class="block text-sm font-pixel text-lg text-gray-300 mb-1">EMAIL*</label><input type="email" id="merch-email" name="merch-email" required class="w-full" placeholder="tu@email.com"></div>
            <div class="mb-6"><label for="merch-quantity" class="block text-sm font-pixel text-lg text-gray-300 mb-1">CANTIDAD*</label><input type="number" id="merch-quantity" name="merch-quantity" required value="1" min="1" class="w-full"></div>
            <div class="flex flex-col sm:flex-row justify-end gap-3">
                <button type="button" data-close-modal="merch-purchase-modal" class="bg-gray-700 text-white font-pixel text-lg py-2 px-4 rounded-none hover:bg-gray-600 transition-colors order-last sm:order-first"> CANCELAR </button>
                <button type="submit" class="bg-white text-black font-pixel text-lg py-2 px-4 rounded-none border border-gray-400 hover:bg-gray-300 transition-colors"> CONFIRMAR </button>
            </div>
            <input type="hidden" id="merch-item-id" name="merch-item-id">
            <input type="hidden" id="merch-drag-id" name="merch-drag-id">
        </form>
    </div>

    <!-- Modal: Mostrar QR (Merch) -->
    <div id="merch-qr-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[55] p-4 modal-backdrop-fade-in">
        <div class="bg-black border-2 border-white max-w-sm w-full relative modal-content-scale-in rounded-none overflow-hidden">
            <button data-close-modal="merch-qr-modal" class="absolute top-2 right-2 bg-white text-black rounded-full h-8 w-8 flex items-center justify-center border-2 border-black text-2xl font-bold leading-none hover:bg-gray-300 z-10">&times;</button>
            <div id="merch-qr-to-download" class="p-6 sm:p-8 bg-black">
                <div class="border-b-2 border-dashed border-gray-500 pb-4 sm:pb-6 text-center">
                    <img id="merch-qr-logo-img" src="https://placehold.co/200x80/000/fff?text=LOGO&font=vt323" alt="Logo" class="h-16 w-auto object-contain mx-auto mb-4 hidden"> <!-- Usa ticketLogoUrl -->
                     <!-- NUEVO: Mostrar Nombre -->
                     <p id="merch-holder-name" class="text-lg text-white font-bold font-pixel mb-1">Nombre Apellido</p>
                    <p id="merch-qr-drag-name" class="text-base text-gray-300 font-pixel mt-1">Merch de DRAG</p>
                </div>
                <div class="py-6 text-center">
                    <h3 id="merch-qr-item-name" class="text-3xl font-pixel text-white text-glow-white mb-2 break-words">ARTÍCULO</h3>
                    <p id="merch-qr-quantity" class="text-lg text-white font-bold mb-6">Cantidad: 1</p>
                    <div id="merch-qr-code" class="flex justify-center items-center w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] mx-auto mb-6 bg-white p-2 rounded-none border border-white">
                        <div class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">QR</div>
                    </div>
                    <p class="text-yellow-400 font-bold text-sm font-pixel px-4 py-3 bg-yellow-900 border border-yellow-700 rounded-none leading-tight">
                        ¡IMPORTANTE! Descarga esta imagen y pásasela por Instagram a la DRAG correspondiente para gestionar el pago y la entrega.
                    </p>
                </div>
            </div>
            <div class="p-4 sm:p-6 bg-gray-900 border-t border-white">
                <button id="download-merch-qr-btn" class="w-full bg-white text-black font-pixel text-xl sm:text-2xl py-3 px-4 rounded-none border border-gray-400 hover:bg-gray-300 transition-colors duration-300"> DESCARGAR PEDIDO (PNG) </button>
            </div>
        </div>
    </div>

    <!-- ==== FIN MODALES ==== -->

    <!-- Modal: Loading -->
    <div id="loading-modal" class="hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] modal-backdrop-fade-in"><div class="spinner w-16 h-16 border-4 border-gray-700 border-t-white rounded-full"></div></div>
    <!-- Modal: Info (Alertas) -->
    <div id="info-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-4 modal-backdrop-fade-in"><div class="bg-black border-2 border-white max-w-sm w-full p-6 text-center modal-content-scale-in rounded-none"><div id="info-modal-text" class="text-lg text-gray-300 mb-6 font-pixel leading-normal text-center">Info.</div><button data-close-modal="info-modal" class="bg-white text-black font-pixel text-lg py-2 px-6 rounded-none border border-gray-400 hover:bg-gray-300 transition-colors duration-300"> CERRAR </button></div></div>

    <!-- ==== FOOTER ==== -->
    <footer class="container mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-8 border-t-2 border-gray-700 pt-8">
        <p class="text-center text-gray-600 font-pixel text-sm">RODETES PARTY &copy; <?php echo date("Y"); ?></p>
    </footer>

    <!-- ==== SCRIPTS ==== -->

    <!-- Inyección de datos desde PHP -->
    <script>
        window.PHP_INITIAL_STATE = <?php echo $initialStateJson; ?>;
        window.PHP_INITIAL_TICKETS = <?php echo $initialTicketsJson; ?>;
        window.PHP_INITIAL_MERCH_SALES = <?php echo $initialMerchSalesJson; ?>;
        // Inyectar estado de login para que JS lo sepa al cargar
        window.PHP_IS_LOGGED_IN = <?php echo json_encode($isLoggedIn); ?>;
        window.PHP_ADMIN_EMAIL = <?php echo json_encode($adminEmail); ?>;
    </script>

    <!--  App Principal (Carga diferida) -->
    <script src="app.js?v=<?php echo time(); ?>" defer></script>

</body>
</html>
