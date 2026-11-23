/**
 * @file aplicacionModulo.ts
 * @proyecto most.
 * @descripcion Módulo raíz del backend: junta la base de datos, las cuentas, la sincronización
 *   y las demás rutas. Registra el filtro que traduce los errores de PostgreSQL.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.2.0
 * @historial 1.0.0 (2026-11-22): creación (reemplaza app.module.ts de la plantilla de NestJS).
 *   1.1.0 (2026-11-22): sincronización, tienda y filtro de errores.
 *   1.2.0 (2026-11-23): módulo de IA.
 */

import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AuthModulo } from './auth/authModulo.js';
import { BaseDatosModulo } from './baseDatos/baseDatosModulo.js';
import { FiltroErrores } from './comun/filtroErrores.js';
import { IaModulo } from './ia/iaModulo.js';
import { SaludControlador } from './salud/saludControlador.js';
import { SyncModulo } from './sync/syncModulo.js';
import { TiendaControlador } from './tienda/tiendaControlador.js';

// ===== Principal =====

@Module({
  imports: [BaseDatosModulo, AuthModulo, SyncModulo, IaModulo],
  controllers: [SaludControlador, TiendaControlador],
  providers: [{ provide: APP_FILTER, useClass: FiltroErrores }],
})
export class AplicacionModulo {}
