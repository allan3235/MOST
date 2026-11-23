/**
 * @file main.ts
 * @proyecto most.
 * @descripcion Punto de entrada del backend: carga .env y levanta el servidor HTTP. Escucha en
 *   todas las interfaces (0.0.0.0) para que el teléfono con Expo Go lo alcance por la red Wi-Fi.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.1.0
 * @historial 1.0.0: plantilla de NestJS (Naín Ayón). 1.1.0 (2026-11-22): .env, CORS y puerto.
 */

import { existsSync } from 'node:fs';

import { NestFactory } from '@nestjs/core';

import { AplicacionModulo } from './aplicacionModulo.js';
import { leerConfiguracion } from './comun/configuracion.js';

// ===== Constantes =====

const ARCHIVO_ENTORNO = '.env';
const TODAS_LAS_INTERFACES = '0.0.0.0';

// ===== Principal =====

/** Arranca el servidor. */
async function arrancar(): Promise<void> {
  if (existsSync(ARCHIVO_ENTORNO)) {
    process.loadEnvFile(ARCHIVO_ENTORNO);
  }
  const { PUERTO } = leerConfiguracion();
  const app = await NestFactory.create(AplicacionModulo);
  app.enableCors();
  app.enableShutdownHooks();
  await app.listen(PUERTO, TODAS_LAS_INTERFACES);
  console.log(`[most] API escuchando en http://localhost:${PUERTO}`);
}

await arrancar();
