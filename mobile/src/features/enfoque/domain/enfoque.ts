/**
 * @file enfoque.ts
 * @proyecto most.
 * @descripcion Modo enfoque (RF-14 redefinido en la Retro 10, CP-15/16). Durante la sesión most.
 *   no emite sus propias notificaciones y guía a la persona para activar el modo del teléfono a
 *   mano (No Molestar en Android, Concentración en iOS, donde no se intenta activarlo desde la
 *   app). Al terminar o cancelar, los avisos vuelven solos. Funciones puras.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

// ===== Constantes =====

/** Duraciones que se pueden elegir, en minutos. */
export const DURACIONES_ENFOQUE: readonly number[] = [15, 25, 45];

const MS_POR_SEGUNDO = 1000;
const SEGUNDOS_POR_MINUTO = 60;
const MS_POR_MINUTO = MS_POR_SEGUNDO * SEGUNDOS_POR_MINUTO;
const DIGITOS = 2;

// ===== Principal =====

/**
 * Hasta cuándo dura una sesión que empieza ahora.
 * @param ahora Momento de inicio.
 * @param minutos Duración elegida.
 * @returns Fin de la sesión.
 */
export function finDeEnfoque(ahora: Date, minutos: number): Date {
  return new Date(ahora.getTime() + minutos * MS_POR_MINUTO);
}

/**
 * Si hay una sesión en curso.
 * @param hasta Fin guardado, o null si no hay sesión.
 * @param ahora Momento actual.
 * @returns true si todavía no termina.
 */
export function estaEnEnfoque(hasta: Date | null, ahora: Date): boolean {
  return hasta !== null && hasta.getTime() > ahora.getTime();
}

/**
 * Quita los avisos que caerían durante la sesión: la app no emite los suyos (RF-14).
 * @param avisos Avisos planeados.
 * @param hasta Fin de la sesión, o null si no hay.
 * @returns Los que quedan después de la sesión.
 */
export function quitarAvisosDuranteEnfoque<T extends { fecha: Date }>(
  avisos: readonly T[],
  hasta: Date | null,
): T[] {
  return hasta === null ? [...avisos] : avisos.filter((a) => a.fecha.getTime() >= hasta.getTime());
}

/**
 * Tiempo que falta como «mm:ss» para el contador.
 * @param hasta Fin de la sesión.
 * @param ahora Momento actual.
 * @returns «00:00» si ya terminó.
 */
export function textoRestante(hasta: Date, ahora: Date): string {
  const segundos = Math.max(0, Math.ceil((hasta.getTime() - ahora.getTime()) / MS_POR_SEGUNDO));
  const mm = String(Math.floor(segundos / SEGUNDOS_POR_MINUTO)).padStart(DIGITOS, '0');
  const ss = String(segundos % SEGUNDOS_POR_MINUTO).padStart(DIGITOS, '0');
  return `${mm}:${ss}`;
}
