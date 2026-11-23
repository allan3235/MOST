/**
 * @file errorSync.ts
 * @proyecto most.
 * @descripcion Error de una operación de sincronización que la app no debe reintentar. Lleva un
 *   "code": la app descarta de su cola las operaciones rechazadas con código (rechazo
 *   definitivo) y reintenta las que fallan sin código (por ejemplo, sin red).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { BadRequestException } from '@nestjs/common';

// ===== Tipos =====

export type CodigoErrorSync =
  | 'TABLA_NO_PERMITIDA'
  | 'COLUMNA_DESCONOCIDA'
  | 'CLAVE_INCOMPLETA'
  | 'FILA_VACIA'
  | 'DATOS_INVALIDOS';

// ===== Principal =====

/** Responde 400 con { statusCode, code, message }. */
export class ErrorSync extends BadRequestException {
  /**
   * @param codigo Código estable que la app puede revisar.
   * @param mensaje Explicación para el registro de errores.
   */
  constructor(codigo: CodigoErrorSync, mensaje: string) {
    super({ statusCode: 400, code: codigo, message: mensaje });
  }
}
