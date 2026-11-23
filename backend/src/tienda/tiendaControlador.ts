/**
 * @file tiendaControlador.ts
 * @proyecto most.
 * @descripcion POST /tienda/comprar: compra un accesorio con monedas. La función SQL
 *   comprar_accesorio revisa el saldo y que no lo tenga ya.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import type { UsuarioSesion } from '../auth/esquemasAuth.js';
import { GuardiaSesion, UsuarioActual } from '../auth/guardiaSesion.js';
import { BaseDatosServicio } from '../baseDatos/baseDatosServicio.js';
import { validar } from '../comun/validar.js';

// ===== Constantes =====

const esquemaCompra = z.object({ accessory_id: z.uuid('Accesorio inválido') });

// ===== Principal =====

@Controller('tienda')
@UseGuards(GuardiaSesion)
export class TiendaControlador {
  constructor(private readonly baseDatos: BaseDatosServicio) {}

  /**
   * Compra un accesorio.
   * @param usuario Usuario con sesión.
   * @param cuerpo { accessory_id }
   * @returns { resultado } con el saldo nuevo (lo que devuelve comprar_accesorio).
   */
  @Post('comprar')
  @HttpCode(HttpStatus.OK)
  async comprar(
    @UsuarioActual() usuario: UsuarioSesion,
    @Body() cuerpo: unknown,
  ): Promise<{ resultado: unknown }> {
    const { accessory_id } = validar(esquemaCompra, cuerpo);
    const resultado = await this.baseDatos.comoUsuario(usuario.id, (cliente) =>
      cliente.query<{ resultado: unknown }>('select public.comprar_accesorio($1) as resultado', [
        accessory_id,
      ]),
    );
    return { resultado: resultado.rows[0]?.resultado ?? null };
  }
}
