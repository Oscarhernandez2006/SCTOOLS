# syntax=docker/dockerfile:1
# ============================================================
# SC TOOLS — imagen única: API Laravel (/api) + frontend Angular (SPA)
# Servidos juntos por nginx + php-fpm. Pensado para Dokploy + Traefik.
# ============================================================

# ============ Stage 1: build del frontend Angular ============
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ============ Stage 2: dependencias PHP (composer) ============
FROM composer:2 AS vendor
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-scripts --no-autoloader
COPY backend/ ./
RUN composer dump-autoload --optimize --no-dev --no-interaction --no-scripts

# ============ Stage 3: imagen de ejecución ============
FROM php:8.4-fpm-alpine AS runtime

# Dependencias del sistema + extensiones PHP (MySQL y PostgreSQL).
RUN apk add --no-cache nginx supervisor icu-libs libzip libpq oniguruma \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS icu-dev libzip-dev postgresql-dev oniguruma-dev \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql pdo_pgsql bcmath intl zip mbstring pcntl opcache \
    && apk del .build-deps

# OPcache (recomendado para producción).
RUN { \
      echo 'opcache.enable=1'; \
      echo 'opcache.enable_cli=0'; \
      echo 'opcache.memory_consumption=128'; \
      echo 'opcache.max_accelerated_files=20000'; \
      echo 'opcache.validate_timestamps=0'; \
    } > /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /var/www/html

# Backend Laravel (con vendor ya instalado).
COPY --from=vendor /app /var/www/html
# Build de Angular dentro del public de Laravel.
COPY --from=frontend /app/dist/frontend/browser/ /var/www/html/public/

# nginx + supervisor + entrypoint.
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 80

ENTRYPOINT ["entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
