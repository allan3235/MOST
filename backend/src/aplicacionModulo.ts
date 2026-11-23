/**
 * @file aplicacionModulo.ts
 * @proyecto most.
 * @descripcion Módulo raíz del backend: junta la base de datos, las cuentas y las demás rutas.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación (reemplaza app.module.ts de la plantilla de NestJS).
 */

import { Module } from '@nestjs/common';

import { AuthModulo } from './auth/authModulo.js';
import { BaseDatosModulo } from './baseDatos/baseDatosModulo.js';
import { SaludControlador } from './salud/saludControlador.js';

// ===== Principal =====

@Module({
  imports: [BaseDatosModulo, AuthModulo],
  controllers: [SaludControlador],
})
export class AplicacionModulo {}
