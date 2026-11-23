/**
 * @file aviso-motivacional.ts
 * @proyecto most.
 * @descripcion Aviso motivacional (RF-13, CP-08). Al completar un paso, si con ese suma 3 días
 *   seguidos con al menos un paso hecho (y luego 6, 9…), llega una notificación con refuerzo y
 *   acceso directo a Progreso. Máximo un aviso al día. Solo suma: si un día no sale, no se borra
 *   nada ni se avisa nada; simplemente se vuelve a contar. Funciones puras.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { sumarDias } from '@/lib/dates';

// ===== Constantes =====

/** Cada cuántos días seguidos llega el aviso (RF-13: 3). */
export const DIAS_PARA_AVISO = 3;

// ===== Principal =====

/**
 * Días seguidos con al menos un paso hecho, contando hacia atrás desde hoy (hoy incluido).
 * @param fechasHechas Fechas "YYYY-MM-DD" con algún registro hecho.
 * @param hoy Fecha local de hoy.
 * @returns 0 si hoy todavía no hay nada hecho.
 */
export function diasSeguidos(fechasHechas: ReadonlySet<string>, hoy: string): number {
  let dias = 0;
  for (let fecha = hoy; fechasHechas.has(fecha); fecha = sumarDias(fecha, -1)) {
    dias++;
  }
  return dias;
}

/**
 * Si toca mandar el aviso: el conteo llegó a 3, 6, 9… y hoy todavía no se mandó uno.
 * @param dias Días seguidos (de diasSeguidos).
 * @param ultimoAviso Fecha del último aviso motivacional, o null si nunca.
 * @param hoy Fecha local de hoy.
 * @returns true si hay que avisar.
 */
export function tocaAvisoMotivacional(
  dias: number,
  ultimoAviso: string | null,
  hoy: string,
): boolean {
  return dias >= DIAS_PARA_AVISO && dias % DIAS_PARA_AVISO === 0 && ultimoAviso !== hoy;
}
