/**
 * @file authModulo.ts
 * @proyecto most.
 * @descripcion Módulo de cuentas y sesiones. Exporta GuardiaSesion y JwtModule para que otros
 *   módulos protejan sus rutas.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { Global, Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';

import { leerConfiguracion } from '../comun/configuracion.js';
import { AuthControlador } from './authControlador.js';
import { AuthServicio } from './authServicio.js';
import { GuardiaSesion } from './guardiaSesion.js';

// ===== Principal =====

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (): JwtModuleOptions => {
        const configuracion = leerConfiguracion();
        return {
          secret: configuracion.JWT_SECRETO,
          signOptions: { expiresIn: configuracion.JWT_EXPIRA as JwtExpira },
        };
      },
    }),
  ],
  controllers: [AuthControlador],
  providers: [AuthServicio, GuardiaSesion],
  exports: [GuardiaSesion, JwtModule],
})
export class AuthModulo {}

// ===== Tipos =====

/** Tipo que acepta jsonwebtoken para la duración ("30d", "12h"…). */
type JwtExpira = NonNullable<NonNullable<JwtModuleOptions['signOptions']>['expiresIn']>;
