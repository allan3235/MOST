/**
 * @file prisma.config.ts
 * @proyecto most.
 * @descripcion Configuración de Prisma: dónde están el esquema y las migraciones, y a qué base se
 *   conecta (DATABASE_URL de backend/.env).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { existsSync } from 'node:fs';

import { defineConfig } from 'prisma/config';

// ===== Constantes =====

const ARCHIVO_ENTORNO = '.env';

// ===== Principal =====

// Prisma 7 no lee .env por su cuenta.
if (existsSync(ARCHIVO_ENTORNO)) {
  process.loadEnvFile(ARCHIVO_ENTORNO);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Sin "env()": así `prisma generate` funciona aunque todavía no exista .env.
    url: process.env.DATABASE_URL ?? '',
  },
});
