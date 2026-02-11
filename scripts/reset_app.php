<?php
// reset_app.php - Herramienta nuclear para limpiar cache del cliente
header("Clear-Site-Data: \"cache\", \"cookies\", \"storage\", \"executionContexts\"");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reseteando Aplicación...</title>
    <style>
        body {
            font-family: monospace;
            background: #000;
            color: #0f0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
        }

        .loader {
            border: 4px solid #333;
            border-top: 4px solid #0f0;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }

        @keyframes spin {
            0% {
                transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
            }
        }
    </style>
</head>

<body>
    <div class="loader"></div>
    <h1>LIMPIANDO CACHÉ Y DATOS</h1>
    <p>Por favor espera, redirigiendo...</p>

    <script>
        console.log('Iniciando limpieza profunda...');

        async function nuclearReset() {
            // 1. Desregistrar Service Workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                    console.log('Service Worker desregistrado');
                }
            }

            // 2. Limpiar Caches Storage API
            if ('caches' in window) {
                const keys = await caches.keys();
                for (let key of keys) {
                    await caches.delete(key);
                    console.log('Cache borrada:', key);
                }
            }

            // 3. Limpiar LocalStorage y SessionStorage
            localStorage.clear();
            sessionStorage.clear();

            // 4. Redirigir a inicio con parámetro aleatorio para evitar cache de redirección
            setTimeout(() => {
                window.location.href = '/?reset=' + Date.now();
            }, 1500);
        }

        nuclearReset().catch(e => {
            console.error(e);
            window.location.href = '/?reset=error';
        });
    </script>
</body>

</html>