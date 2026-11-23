/**
 * @file baseDatosModulo.ts
 * @proyecto most.
 * @descripcion Módulo global que comparte una sola conexión a la base con todo el backend.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { Global, Module } from '@nestjs/common';

import { BaseDatosServicio } from './baseDatosServicio.js';

// ===== Principal =====

@Global()
@Module({
  providers: [BaseDatosServicio],
  exports: [BaseDatosServicio],
})
export class BaseDatosModulo {}
