docker service update \
  --label-add 'traefik.enable=true' \
  --label-add 'traefik.docker.network=dokploy-network' \
  --label-add 'traefik.http.routers.suite-web.rule=Host(`suite.grupo-santacruz.com`)' \
  --label-add 'traefik.http.routers.suite-web.entrypoints=web' \
  --label-add 'traefik.http.routers.suite-web.middlewares=suite-redirect' \
  --label-add 'traefik.http.routers.suite-secure.rule=Host(`suite.grupo-santacruz.com`)' \
  --label-add 'traefik.http.routers.suite-secure.entrypoints=websecure' \
  --label-add 'traefik.http.routers.suite-secure.tls=true' \
  --label-add 'traefik.http.routers.suite-secure.tls.certresolver=letsencrypt' \
  --label-add 'traefik.http.middlewares.suite-redirect.redirectscheme.scheme=https' \
  --label-add 'traefik.http.services.suite.loadbalancer.server.port=80' \
  sctools-sc-tools-deployd-cmqzwa