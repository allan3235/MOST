/**
 * @file hitos.ts
 * @proyecto most.
 * @descripcion Hitos de avance (RF-16, CP-09). Cada micro-paso tiene una meta de 10 veces hechas
 *   para sentirse listo para el siguiente; al llegar a 5 de 10 (50 %) y 8 de 10 (80 %) hay un
 *   refuerzo visual, con vibración y sonido opcional (RI-03). Decisión del equipo: el porcentaje
 *   se mide sobre la meta del micro-paso en curso, contando desde que empezó ese paso
 *   (`nivel_desde`). Solo suma: no cambia la regla de subir de la progresión. Funciones puras.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

// ===== Tipos =====

/** Porcentaje de un hito (RF-16 igualado con RI-03: 50 y 80). */
export type PorcentajeHito = 50 | 80;

export type AvancePaso = { hechos: number; meta: number };

// ===== Constantes =====

/** Veces hechas que pide cada micro-paso (CP-09: «5/10 y 8/10»). */
export const META_REPETICIONES_PASO = 10;

export const PORCENTAJES_HITO: readonly PorcentajeHito[] = [50, 80];

const CIEN = 100;

// ===== Principal =====

/**
 * Avance del paso en curso, sin pasar de la meta.
 * @param hechos Veces hechas desde que empezó el paso.
 * @returns Hechos (máximo la meta) y la meta.
 */
export function avanceDelPaso(hechos: number): AvancePaso {
  return {
    hechos: Math.min(Math.max(hechos, 0), META_REPETICIONES_PASO),
    meta: META_REPETICIONES_PASO,
  };
}

/**
 * Hito que se cruzó al pasar de `antes` a `despues` veces hechas, o null. Si se cruzan dos de
 * golpe (no pasa con un toque, pero sí al sincronizar), se celebra el más alto.
 * @param antes Veces hechas antes del check-in.
 * @param despues Veces hechas después del check-in.
 * @returns 50, 80 o null.
 */
export function hitoAlcanzado(antes: number, despues: number): PorcentajeHito | null {
  let alcanzado: PorcentajeHito | null = null;
  for (const porcentaje of PORCENTAJES_HITO) {
    const umbral = (porcentaje * META_REPETICIONES_PASO) / CIEN;
    if (antes < umbral && despues >= umbral) {
      alcanzado = porcentaje;
    }
  }
  return alcanzado;
}
