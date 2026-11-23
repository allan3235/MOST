/**
 * @file introspeccion.ts
 * @proyecto most.
 * @descripcion Introspección por valores (RF-04, UC-11, CP-10). Hasta 3 preguntas autorreflexivas
 *   basadas en lo que a la persona le importa, con escala de 1 a 5 y sin diagnóstico ni etiqueta
 *   clínica. Aparece una vez por semana en Hoy y al pausar un hábito (UC-11 extiende UC-08). Las
 *   respuestas no salen del teléfono (RR-04). Funciones puras.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { diasEntre } from '@/lib/dates';

// ===== Tipos =====

export type PreguntaId = 'cerca_de_lo_importante' | 'amabilidad' | 'persona_que_quiero_ser';

/** Por qué se abrió: la semanal en Hoy o después de pausar un hábito. */
export type MotivoIntrospeccion = 'semanal' | 'pausa';

/** Respuesta 1–5, o null si la persona saltó esa pregunta. */
export type Respuestas = Record<PreguntaId, number | null>;

// ===== Constantes =====

/** Máximo 3 preguntas (RF-04). El texto vive en es.introspeccion. */
export const PREGUNTAS: readonly PreguntaId[] = [
  'cerca_de_lo_importante',
  'amabilidad',
  'persona_que_quiero_ser',
];

export const ESCALA_MINIMA = 1;
export const ESCALA_MAXIMA = 5;
export const ESCALA: readonly number[] = [1, 2, 3, 4, 5];

/** La semanal vuelve a ofrecerse 7 días después de la última (respondida o pospuesta). */
export const DIAS_ENTRE_REFLEXIONES = 7;

// ===== Principal =====

/**
 * Si toca ofrecer la reflexión semanal.
 * @param ultima Fecha de la última reflexión (respondida o con «Ahora no»), o null si nunca.
 * @param primerUso Fecha desde la que la persona usa la app (su primer plan o hábito).
 * @param hoy Fecha local de hoy.
 * @returns true si ya pasó una semana.
 */
export function tocaReflexion(
  ultima: string | null,
  primerUso: string | null,
  hoy: string,
): boolean {
  const desde = ultima ?? primerUso;
  return desde !== null && diasEntre(desde, hoy) >= DIAS_ENTRE_REFLEXIONES;
}

/**
 * Respuestas vacías, para empezar.
 * @returns Todas en null.
 */
export function respuestasVacias(): Respuestas {
  return { cerca_de_lo_importante: null, amabilidad: null, persona_que_quiero_ser: null };
}

/**
 * Si un valor es una respuesta válida de la escala.
 * @param valor Valor elegido.
 * @returns true si es un entero de 1 a 5.
 */
export function esRespuestaValida(valor: number): boolean {
  return Number.isInteger(valor) && valor >= ESCALA_MINIMA && valor <= ESCALA_MAXIMA;
}
