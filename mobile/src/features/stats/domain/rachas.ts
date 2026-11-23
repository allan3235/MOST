/**
 * @file rachas.ts
 * @proyecto most.
 * @descripcion Avance acumulado de un hábito: cuántas veces se ha completado en total. Reemplaza a
 *   las rachas de Habit Green (días seguidos que volvían a 0 al fallar): most. no tiene rachas que
 *   se borren ni indicadores negativos (RNF-07, reglas de tono). El número solo crece.
 *   Se conservan los nombres (Racha, rachaDeHabito…) para no cambiar las pantallas que lo usan.
 * @autor Equipo most. (heredado de Habit Green; adaptado por Allan con Claude Code)
 * @fecha 2026-11-23
 * @version 2.0.0
 * @historial 1.0.0: rachas de ocurrencias seguidas. 2.0.0 (2026-11-23): total acumulado.
 */

// ===== Tipos =====

/** `actual` y `mejor` valen lo mismo: el total de veces completado (nunca baja). */
export type Racha = { actual: number; mejor: number };

export type TextosRacha = {
  rachaActual: string;
};

export type LineaRacha = { texto: keyof TextosRacha; n: number }[];

export type PildoraRacha = { tipo: 'actual'; n: number };

// ===== Principal =====

/**
 * Veces que se completó el hábito. Un día sin hacerlo no resta nada.
 * @param ocurrencias Ocurrencias de un solo hábito.
 * @returns El total acumulado.
 */
export function rachaDeHabito(ocurrencias: readonly { hecho: boolean }[]): Racha {
  const completados = ocurrencias.filter((o) => o.hecho).length;
  return { actual: completados, mejor: completados };
}

/**
 * Qué decir del avance: «Veces completado: n», o nada si todavía no hay ninguna. Es igual para
 * todos (antes, con `desanimo` se ocultaba la racha actual; ya no hace falta porque nunca baja).
 * @param racha Avance del hábito.
 * @param _desanimo Se conserva por compatibilidad; ya no cambia el texto.
 * @returns Partes del texto.
 */
export function lineaDeRacha(racha: Racha, _desanimo: boolean): LineaRacha {
  return racha.actual > 0 ? [{ texto: 'rachaActual', n: racha.actual }] : [];
}

/**
 * La píldora con el brote: el total de veces completado. Sin ninguna todavía, no hay píldora.
 * @param racha Avance del hábito.
 * @param _desanimo Se conserva por compatibilidad; ya no cambia la píldora.
 * @returns Lo que muestra la píldora, o null.
 */
export function pildoraDeRacha(racha: Racha, _desanimo: boolean): PildoraRacha | null {
  return racha.actual > 0 ? { tipo: 'actual', n: racha.actual } : null;
}
