/**
 * @file syncControlador.ts
 * @proyecto most.
 * @descripcion Rutas de sincronización (todas requieren sesión):
 *   POST /sync/operacion · POST /sync/lote · GET /sync/cambios · POST /sync/fila
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { z } from 'zod';

import type { UsuarioSesion } from '../auth/esquemasAuth.js';
import { GuardiaSesion, UsuarioActual } from '../auth/guardiaSesion.js';
import type { Fila } from './constructorSql.js';
import { ErrorSync } from './errorSync.js';
import {
  esquemaCambios,
  esquemaLeerFila,
  esquemaLote,
  esquemaOperacion,
  type ResultadoOperacion,
} from './esquemasSync.js';
import { SyncServicio } from './syncServicio.js';

// ===== Funciones auxiliares =====

/**
 * Valida con un código de rechazo definitivo: una operación mal formada no se arregla
 * reintentando, así que la app debe sacarla de su cola.
 */
function validarSync<T extends z.ZodType>(esquema: T, datos: unknown): z.infer<T> {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    const mensaje = resultado.error.issues
      .map((problema) => `${problema.path.join('.')}: ${problema.message}`)
      .join('; ');
    throw new ErrorSync('DATOS_INVALIDOS', mensaje);
  }
  return resultado.data;
}

// ===== Principal =====

@Controller('sync')
@UseGuards(GuardiaSesion)
export class SyncControlador {
  constructor(private readonly sync: SyncServicio) {}

  /**
   * Aplica una operación de la cola: upsert, update, complete, uncomplete o archive.
   * @param usuario Usuario con sesión.
   * @param cuerpo Operación.
   * @returns Filas guardadas o resultado de la recompensa.
   */
  @Post('operacion')
  @HttpCode(HttpStatus.OK)
  aplicarOperacion(
    @UsuarioActual() usuario: UsuarioSesion,
    @Body() cuerpo: unknown,
  ): Promise<ResultadoOperacion> {
    return this.sync.aplicarOperacion(usuario.id, validarSync(esquemaOperacion, cuerpo));
  }

  /**
   * Aplica varias operaciones juntas (todas o ninguna). Sirve para guardar un plan completo.
   * @param usuario Usuario con sesión.
   * @param cuerpo { operaciones: [...] }
   * @returns { resultados: [...] } en el mismo orden.
   */
  @Post('lote')
  @HttpCode(HttpStatus.OK)
  async aplicarLote(
    @UsuarioActual() usuario: UsuarioSesion,
    @Body() cuerpo: unknown,
  ): Promise<{ resultados: ResultadoOperacion[] }> {
    const { operaciones } = validarSync(esquemaLote, cuerpo);
    return { resultados: await this.sync.aplicarLote(usuario.id, operaciones) };
  }

  /**
   * Descarga lo que cambió en una tabla desde el cursor.
   * @param usuario Usuario con sesión.
   * @param consulta ?tabla=&desde=&desdeFecha=&pagina=&tamano=
   * @returns { filas: [...] } (si llegan "tamano" filas, pide la siguiente página).
   */
  @Get('cambios')
  async leerCambios(
    @UsuarioActual() usuario: UsuarioSesion,
    @Query() consulta: unknown,
  ): Promise<{ filas: Fila[] }> {
    return {
      filas: await this.sync.leerCambios(usuario.id, validarSync(esquemaCambios, consulta)),
    };
  }

  /**
   * Lee una fila por su clave (para dejarla igual que en el servidor tras un rechazo).
   * @param usuario Usuario con sesión.
   * @param cuerpo { tabla, clave: { columna: valor } }
   * @returns { fila } o { fila: null }.
   */
  @Post('fila')
  @HttpCode(HttpStatus.OK)
  async leerFila(
    @UsuarioActual() usuario: UsuarioSesion,
    @Body() cuerpo: unknown,
  ): Promise<{ fila: Fila | null }> {
    const { tabla, clave } = validarSync(esquemaLeerFila, cuerpo);
    return { fila: await this.sync.leerFila(usuario.id, tabla, clave) };
  }
}
