/**
 * @file validar.ts
 * @proyecto most.
 * @descripcion Valida el cuerpo de una petición con un esquema Zod. Si no cumple, responde 400
 *   con un mensaje legible.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { BadRequestException } from '@nestjs/common';
import type { z } from 'zod';

// ===== Principal =====

/**
 * Revisa datos de entrada contra un esquema.
 * @param esquema Esquema Zod esperado.
 * @param datos Datos recibidos (por ejemplo, el cuerpo de la petición).
 * @returns Los datos ya validados y con su tipo.
 */
export function validar<T extends z.ZodType>(esquema: T, datos: unknown): z.infer<T> {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    const mensaje = resultado.error.issues.map((problema) => problema.message).join('; ');
    throw new BadRequestException(mensaje);
  }
  return resultado.data;
}
