# Metro (servidor de desarrollo de Expo) para abrir most. en Expo Go desde exps://most-expo.<dominio>.
# Contexto de build = raíz del repo. La URL pública la fija EXPO_PUBLIC_... y EXPO_PACKAGER_PROXY_URL
# (ver despliegue/docker-compose.yml); el HTTPS lo pone Cloudflare Tunnel.
FROM node:24-bookworm-slim

RUN npm install -g pnpm@12.8.1

WORKDIR /app

# Primero solo los manifiestos, para que la capa de dependencias se reutilice entre builds.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY compartido/package.json ./compartido/package.json
COPY mobile/package.json ./mobile/package.json
COPY backend/package.json ./backend/package.json
RUN pnpm install --frozen-lockfile --filter mobile... --ignore-scripts

COPY compartido ./compartido
COPY mobile ./mobile
RUN pnpm --filter @most/compartido build

# CI=1: sin preguntas interactivas ni vigilancia de archivos (el código del contenedor no cambia).
ENV CI=1
ENV EXPO_NO_TELEMETRY=1

# Metro escribe caché en .expo/ y node_modules/.cache.
RUN chown -R node:node /app
USER node

WORKDIR /app/mobile
EXPOSE 8081

# --go: la app tiene expo-dev-client instalado; sin esta opción Metro serviría al cliente de desarrollo.
CMD ["pnpm", "expo", "start", "--go", "--port", "8081"]
