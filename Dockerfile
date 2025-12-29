FROM php:8.2-apache

# Instalar dependencias necesarias (ej. zip para backups)
RUN apt-get update && apt-get install -y \
    libzip-dev \
    unzip \
    && docker-php-ext-install zip

# Habilitar mod_rewrite
RUN a2enmod rewrite

# Copiar el código fuente
COPY . /var/www/html/

# Crear carpeta de datos privados y uploads si no existen (aunque compose los montará)
# y asignar permisos correctos al usuario www-data
RUN mkdir -p /var/www/data_private && \
    mkdir -p /var/www/html/uploads && \
    chown -R www-data:www-data /var/www/data_private && \
    chown -R www-data:www-data /var/www/html/uploads && \
    chown -R www-data:www-data /var/www/html

EXPOSE 80
