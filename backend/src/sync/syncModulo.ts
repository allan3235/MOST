/**
 * @file syncModulo.ts
 * @proyecto most.
 * @descripcion Módulo de sincronización entre la app y la base.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { Module } from '@nestjs/common';

import { SyncControlador } from './syncControlador.js';
import { SyncServicio } from './syncServicio.js';

// ===== Principal =====

@Module({
  controllers: [SyncControlador],
  providers: [SyncServicio],
})
export class SyncModulo {}
