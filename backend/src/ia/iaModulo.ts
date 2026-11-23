/**
 * @file iaModulo.ts
 * @proyecto most.
 * @descripcion Módulo de IA. El proveedor se registra con el token PROVEEDOR_IA: en producción es
 *   Claude; en las pruebas se reemplaza por una IA simulada.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { Module } from '@nestjs/common';

import { IaControlador } from './iaControlador.js';
import { IaServicio } from './iaServicio.js';
import { PROVEEDOR_IA, ProveedorClaude } from './proveedorIa.js';

// ===== Principal =====

@Module({
  controllers: [IaControlador],
  providers: [IaServicio, { provide: PROVEEDOR_IA, useClass: ProveedorClaude }],
})
export class IaModulo {}
