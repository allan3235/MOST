/**
 * @file barreras.ts
 * @proyecto most.
 * @descripcion Lista de barreras (RF-17 + RF-19, UC-10). Cuando un día de un hábito no salió, la
 *   tarjeta pregunta qué se atravesó (una sola elección: tiempo, recursos o acceso) y ofrece una
 *   alternativa en un toque. Con causa, ese día no cuenta en el cumplimiento: no queda como fallo.
 *   Funciones puras: deciden qué alternativas mostrar y en qué orden.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

// ===== Tipos =====

export type Barrera = 'tiempo' | 'recursos' | 'acceso';

/** Versión más ligera del hábito (el paso anterior de su secuencia o su versión corta). */
export type PasoLigero = { titulo: string; duracion_min: number };

export type Alternativa =
  { tipo: 'ligero'; paso: PasoLigero } | { tipo: 'mover'; fecha: string } | { tipo: 'elegir' };

// ===== Constantes =====

/** Máximo 3 opciones (RF-17): una pregunta de elección única, sin escribir nada (RI-02). */
export const BARRERAS: readonly Barrera[] = ['tiempo', 'recursos', 'acceso'];

// ===== Principal =====

/**
 * Alternativas para una barrera, la recomendada primero. Con falta de tiempo ayuda más una versión
 * más corta (ej. 2 min); si faltó algo o no se pudo llegar, ayuda más otro día.
 * @param barrera Lo que se atravesó.
 * @param diaPropuesto Primer día libre, o null si la semana está completa.
 * @param hayOtrosDias Hay más de un día libre para «Elegir otro día».
 * @param ligero Versión más ligera, o null si ya va en la más ligera.
 * @returns Las alternativas en orden; puede quedar vacía (solo «Dejarlo así»).
 */
export function alternativasPara(
  barrera: Barrera,
  diaPropuesto: string | null,
  hayOtrosDias: boolean,
  ligero: PasoLigero | null,
): Alternativa[] {
  const opcionLigera: Alternativa[] = ligero ? [{ tipo: 'ligero', paso: ligero }] : [];
  const opcionMover: Alternativa[] = diaPropuesto ? [{ tipo: 'mover', fecha: diaPropuesto }] : [];
  const opcionElegir: Alternativa[] = hayOtrosDias ? [{ tipo: 'elegir' }] : [];
  return barrera === 'tiempo'
    ? [...opcionLigera, ...opcionMover, ...opcionElegir]
    : [...opcionMover, ...opcionLigera, ...opcionElegir];
}
