FROM php:8.2-apache

# Instalar dependencias necesarias (ej. zip para backups)
RUN apt-get update && apt-get install -y \
    libzip-dev \
    unzip \
    && docker-php-ext-install zip

# Habilitar mod_rewrite y mod_headers
RUN a2enmod rewrite headers
# Fix "Could not reliably determine the server's fully qualified domain name"
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Copiar el código fuente
COPY . /var/www/html/

# Copiar configuración personalizada de PHP (Uploads limit)
COPY uploads.ini /usr/local/etc/php/conf.d/uploads.ini

# Copiar script de entrypoint y hacerlo ejecutable
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Crear carpeta de datos privados y uploads (seguridad extra en build)
RUN mkdir -p /var/www/data_private && \
    mkdir -p /var/www/html/uploads && \
    chown -R www-data:www-data /var/www/data_private && \
    chown -R www-data:www-data /var/www/html/uploads && \
    chown -R www-data:www-data /var/www/html/icons && \
    chown -R www-data:www-data /var/www/html

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["docker-php-entrypoint", "apache2-foreground"]
