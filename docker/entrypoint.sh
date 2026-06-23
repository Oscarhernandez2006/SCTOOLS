#!/bin/sh
set -e

cd /var/www/html

# Permisos de directorios escribibles por Laravel.
mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# Algunos comandos de artisan esperan un archivo .env presente; las variables
# reales se inyectan por entorno desde Dokploy (tienen prioridad).
[ -f .env ] || touch .env

# Generar APP_KEY efímero si no se definió (definelo en Dokploy para produccion).
if [ -z "${APP_KEY}" ]; then
  echo "[entrypoint] WARN: APP_KEY no definido. Generando uno EFIMERO (configuralo en Dokploy)."
  php artisan key:generate --force || true
fi

# Descubrir paquetes (se omitio en build) y cachear configuracion/vistas.
php artisan package:discover --ansi || true
php artisan config:cache || true
php artisan view:cache || true

# Migraciones (desactivar con RUN_MIGRATIONS=false).
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Ejecutando migraciones..."
  php artisan migrate --force || echo "[entrypoint] WARN: las migraciones fallaron (revisa la conexion a BD)."
fi

exec "$@"
