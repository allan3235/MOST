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
const LIMITE_DIARIO_IA_POR_DEFECTO = 10;

const esquemaConfiguracion = z.object({
  DATABASE_URL: z.string().min(1, 'Falta DATABASE_URL'),
  JWT_SECRETO: z
    .string()
    .min(LARGO_MINIMO_SECRETO, `JWT_SECRETO debe tener ${LARGO_MINIMO_SECRETO} caracteres o más`),
  /** Igual que el límite de 60 días sin conexión de la app (sesion-caducada.ts). */
  JWT_EXPIRA: z.string().default('60d'),
  PUERTO: z.coerce.number().int().positive().default(PUERTO_POR_DEFECTO),
  /** Modelo para crear planes y descomponer metas (trabajo creativo). */
  IA_MODELO_GRANDE: z.string().default('claude-opus-5-5'),
  /** Modelo para ajustes cortos de un plan que ya existe (más barato). */
  IA_MODELO_PEQUENO: z.string().default('claude-haiku-5-5'),
  /** Llamadas a la IA por usuario al día; al pasarlo se usa el catálogo. */
  IA_LIMITE_DIARIO: z.coerce.number().int().min(0).default(LIMITE_DIARIO_IA_POR_DEFECTO),
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
