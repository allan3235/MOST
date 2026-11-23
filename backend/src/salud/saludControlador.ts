/**
 * @file saludControlador.ts
 * @proyecto most.
 * @descripcion GET /salud: comprueba que el servidor y la base respondan. Sirve para probar
 *   desde el navegador del teléfono que llega a la computadora.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.1.0
 * @historial 1.0.0 (2026-11-22): creación. 1.1.0 (2026-11-23): con Prisma.
 */

import { Controller, Get } from '@nestjs/common';

import { PrismaServicio } from '../baseDatos/prismaServicio.js';

// ===== Tipos =====

type EstadoSalud = { estado: 'ok'; baseDatos: boolean };

// ===== Principal =====

@Controller('salud')
export class SaludControlador {
  constructor(private readonly prisma: PrismaServicio) {}

  /**
   * Responde el estado del servidor.
   * @returns { estado: 'ok', baseDatos } (baseDatos es false si la base no responde).
   */
  @Get()
  async revisar(): Promise<EstadoSalud> {
    try {
      await this.prisma.$queryRaw`select 1`;
      return { estado: 'ok', baseDatos: true };
    } catch {
      return { estado: 'ok', baseDatos: false };
    }
  }
}
