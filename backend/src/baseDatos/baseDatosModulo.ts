/**
 * @file baseDatosModulo.ts
 * @proyecto most.
 * @descripcion Módulo global que comparte las conexiones a la base con todo el backend: Prisma
 *   (consultas con tipos) y pg (SQL dinámico de la sincronización, con RLS por usuario).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.1.0
 * @historial 1.0.0 (2026-11-22): creación. 1.1.0 (2026-11-23): PrismaServicio.
 */

import { Global, Module } from '@nestjs/common';

import { BaseDatosServicio } from './baseDatosServicio.js';
import { PrismaServicio } from './prismaServicio.js';

// ===== Principal =====

@Global()
@Module({
  providers: [BaseDatosServicio, PrismaServicio],
  exports: [BaseDatosServicio, PrismaServicio],
})
export class BaseDatosModulo {}
