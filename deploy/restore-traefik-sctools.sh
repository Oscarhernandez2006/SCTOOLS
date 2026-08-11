docker service update \
  --label-add 'traefik.enable=true' \
  --label-add 'traefik.docker.network=dokploy-network' \
  --label-add 'traefik.http.routers.sctools-web.rule=Host(`sctools.grupo-santacruz.com`)' \
  --label-add 'traefik.http.routers.sctools-web.entrypoints=web' \
  --label-add 'traefik.http.routers.sctools-web.middlewares=sctools-redirect' \
  --label-add 'traefik.http.routers.sctools-secure.rule=Host(`sctools.grupo-santacruz.com`)' \
  --label-add 'traefik.http.routers.sctools-secure.entrypoints=websecure' \
  --label-add 'traefik.http.routers.sctools-secure.tls=true' \
  --label-add 'traefik.http.routers.sctools-secure.tls.certresolver=letsencrypt' \
  --label-add 'traefik.http.middlewares.sctools-redirect.redirectscheme.scheme=https' \
  --label-add 'traefik.http.services.sctools.loadbalancer.server.port=80' \
  sctools