/**
 * @file errorConCodigo.ts
 * @proyecto most.
 * @descripcion Error HTTP con un "code" estable que la app puede revisar para mostrar el mensaje
 *   adecuado (por ejemplo, IA_NO_DISPONIBLE → "intenta de nuevo en un momento").
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { HttpException } from '@nestjs/common';

// ===== Principal =====

/** Responde { statusCode, code, message } con el estado indicado. */
export class ErrorConCodigo extends HttpException {
  /**
   * @param estado Estado HTTP.
   * @param codigo Código estable.
   * @param mensaje Mensaje para mostrar a la persona (tono sin culpa).
   */
  constructor(estado: number, codigo: string, mensaje: string) {
    super({ statusCode: estado, code: codigo, message: mensaje }, estado);
  }
}
