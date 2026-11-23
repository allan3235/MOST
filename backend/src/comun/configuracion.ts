/**
 * @file configuracion.ts
 * @proyecto most.
 * @descripcion Lee y valida las variables de entorno del backend. Si falta alguna, el servidor
 *   no arranca y dice cuál.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { z } from 'zod';

// ===== Tipos =====

export type Configuracion = z.infer<typeof esquemaConfiguracion>;

// ===== Constantes =====

const LARGO_MINIMO_SECRETO = 32;
const PUERTO_POR_DEFECTO = 3001;

const esquemaConfiguracion = z.object({
  DATABASE_URL: z.string().min(1, 'Falta DATABASE_URL'),
  JWT_SECRETO: z
    .string()
    .min(LARGO_MINIMO_SECRETO, `JWT_SECRETO debe tener ${LARGO_MINIMO_SECRETO} caracteres o más`),
  JWT_EXPIRA: z.string().default('30d'),
  PUERTO: z.coerce.number().int().positive().default(PUERTO_POR_DEFECTO),
});

// ===== Principal =====

let configuracion: Configuracion | null = null;

/**
 * Devuelve la configuración validada (se lee una sola vez).
 * @returns Variables de entorno con sus tipos.
 */
export function leerConfiguracion(): Configuracion {
  if (configuracion) {
    return configuracion;
  }
  const resultado = esquemaConfiguracion.safeParse(process.env);
  if (!resultado.success) {
    const faltantes = resultado.error.issues.map((problema) => problema.message).join('; ');
    throw new Error(
      `Configuración inválida: ${faltantes}. Revisa backend/.env (ver .env.example).`,
    );
  }
  configuracion = resultado.data;
  return configuracion;
}
