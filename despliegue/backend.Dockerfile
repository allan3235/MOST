# Imagen del backend de most. para Dokploy (contexto de build = raíz del repo).
# Al arrancar aplica las migraciones pendientes de Prisma y levanta la API.
FROM node:24-bookworm-slim

# OpenSSL lo usa el motor de Prisma; pnpm es el gestor del monorepo.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@12.8.1

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY compartido ./compartido
COPY backend ./backend
COPY mobile/package.json ./mobile/package.json

# Solo el backend y lo que necesita (@most/compartido).
RUN pnpm install --frozen-lockfile --filter backend...

RUN pnpm --filter @most/compartido build && pnpm --filter backend build

WORKDIR /app/backend
ENV NODE_ENV=production
ENV PUERTO=3001
EXPOSE 3001

CMD ["sh", "-c", "pnpm db:migrar && node dist/main.js"]
