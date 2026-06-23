#!/usr/bin/env bash
# ============================================================
# Restaura los labels de Traefik para el servicio SC TOOLS en
# Docker Swarm (Traefik v2.11, provider docker swarmMode).
#
# Por qué existe: Dokploy recrea el servicio en cada deploy y
# borra los labels que se ponen a mano. Vuelve a ejecutar este
# script DESPUÉS de cada deploy si el sitio deja de responder.
#
# Solución permanente: configurar el dominio en la pestaña
# "Domains" de la aplicación en la UI de Dokploy (host, puerto
# 80, HTTPS + certresolver letsencrypt). Eso persiste solo.
#
# Uso:  sudo bash deploy/restore-traefik-sctools.sh
# ============================================================
set -euo pipefail

DOMAIN="sctools.grupo-santacruz.com"   # <-- cambia el dominio si aplica
PORT="80"                              # nginx del contenedor SC TOOLS
NETWORK="dokploy-network"
CERTRESOLVER="letsencrypt"
ROUTER="sctools"

# Detecta automáticamente el servicio de SC TOOLS (el sufijo cambia por app)
SERVICE="$(docker service ls --format '{{.Name}}' | grep -i '^sctools' | head -n1 || true)"
if [ -z "${SERVICE}" ]; then
  echo "ERROR: no se encontró ningún servicio que empiece por 'sctools'."
  echo "Servicios disponibles:"
  docker service ls --format '  - {{.Name}}'
  exit 1
fi

echo ">> Servicio detectado: ${SERVICE}"
echo ">> Aplicando labels de Traefik (dominio ${DOMAIN}, puerto ${PORT})..."

docker service update \
  --label-add 'traefik.enable=true' \
  --label-add "traefik.docker.network=${NETWORK}" \
  --label-add "traefik.http.routers.${ROUTER}-web.rule=Host(\`${DOMAIN}\`)" \
  --label-add "traefik.http.routers.${ROUTER}-web.entrypoints=web" \
  --label-add "traefik.http.routers.${ROUTER}-web.middlewares=${ROUTER}-redirect" \
  --label-add "traefik.http.routers.${ROUTER}-secure.rule=Host(\`${DOMAIN}\`)" \
  --label-add "traefik.http.routers.${ROUTER}-secure.entrypoints=websecure" \
  --label-add "traefik.http.routers.${ROUTER}-secure.tls=true" \
  --label-add "traefik.http.routers.${ROUTER}-secure.tls.certresolver=${CERTRESOLVER}" \
  --label-add "traefik.http.middlewares.${ROUTER}-redirect.redirectscheme.scheme=https" \
  --label-add "traefik.http.services.${ROUTER}.loadbalancer.server.port=${PORT}" \
  "${SERVICE}"

echo ">> Listo. Traefik debería enrutar https://${DOMAIN} en unos segundos."
echo ">> Verifica con:  curl -I https://${DOMAIN}"
