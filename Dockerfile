# --- Stage 1: Build Assets (Tailwind CSS) ---
FROM node:18-alpine as builder

WORKDIR /app

# Copy necessary files for build
COPY package.json ./
# COPY package-lock.json ./ 
# (No package-lock.json yet, npm install will create it)

RUN npm install

COPY tailwind.config.js ./
COPY style_src.css ./
COPY *.php ./
COPY *.html ./
COPY *.js ./
# (Copying js/php/html so tailwind can scan for classes)

# Build CSS
RUN npm run build:css

# --- Stage 2: Final Image ---
FROM php:8.2-apache

# Install dependencies
RUN apt-get update && apt-get install -y \
    libzip-dev \
    unzip \
    && docker-php-ext-install zip opcache

# Enable Apache modules
RUN a2enmod rewrite headers expires deflate

# Fix "Could not reliably determine the server's fully qualified domain name"
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Opcache configuration
RUN echo "opcache.memory_consumption=128" >> /usr/local/etc/php/conf.d/opcache-recommended.ini \
    && echo "opcache.interned_strings_buffer=8" >> /usr/local/etc/php/conf.d/opcache-recommended.ini \
    && echo "opcache.max_accelerated_files=4000" >> /usr/local/etc/php/conf.d/opcache-recommended.ini \
    && echo "opcache.revalidate_freq=2" >> /usr/local/etc/php/conf.d/opcache-recommended.ini \
    && echo "opcache.fast_shutdown=1" >> /usr/local/etc/php/conf.d/opcache-recommended.ini \
    && echo "opcache.enable_cli=1" >> /usr/local/etc/php/conf.d/opcache-recommended.ini

# Copy source code
COPY . /var/www/html/

# Copy built CSS from builder stage
COPY --from=builder /app/style.css /var/www/html/style.css

# Copy .htaccess
COPY .htaccess /var/www/html/.htaccess

# Copy uploads.ini
COPY uploads.ini /usr/local/etc/php/conf.d/uploads.ini

# Entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create private data and uploads folders
RUN mkdir -p /var/www/data_private && \
    mkdir -p /var/www/html/uploads && \
    chown -R www-data:www-data /var/www/data_private && \
    chown -R www-data:www-data /var/www/html/uploads && \
    chown -R www-data:www-data /var/www/html

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["docker-php-entrypoint", "apache2-foreground"]
