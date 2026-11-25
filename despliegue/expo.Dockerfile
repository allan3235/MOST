# Servidor de desarrollo de Expo para abrir most. en Expo Go desde cualquier red (Dokploy).
# Usa el túnel de Expo (ngrok): la URL exp://... aparece en los logs del contenedor.
# Variables: EXPO_TOKEN (cuenta de Expo, sin login interactivo), EXPO_PUBLIC_API_URL (backend
# público) y opcionalmente EXPO_TUNNEL_SUBDOMAIN para fijar el subdominio del túnel.
FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@12.8.1

# @expo/ngrok va aparte (la doc de Expo pide instalarlo para --tunnel) y se enlaza en mobile.
WORKDIR /opt/ngrok
RUN echo '{"name":"ngrok-expo","private":true}' > package.json \
  && pnpm add @expo/ngrok@4.1.3 --config.node-linker=hoisted

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY compartido ./compartido
COPY mobile ./mobile
COPY backend/package.json ./backend/package.json

RUN pnpm install --frozen-lockfile --filter mobile... --ignore-scripts \
  && pnpm --filter @most/compartido build \
  && mkdir -p /app/node_modules/@expo \
  && ln -sfn /opt/ngrok/node_modules/@expo/ngrok /app/node_modules/@expo/ngrok

WORKDIR /app/mobile
ENV CI=1
ENV EXPO_NO_TELEMETRY=1
EXPOSE 8081

CMD ["pnpm", "expo", "start", "--go", "--tunnel", "--port", "8081"]
