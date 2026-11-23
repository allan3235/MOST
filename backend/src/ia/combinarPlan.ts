/**
 * @file combinarPlan.ts
 * @proyecto most.
 * @descripcion Junta lo que calcula el motor del plan (hora, aviso flexible, nivel, ajustes) con
 *   la secuencia de micro-pasos que propuso la IA o el catálogo. Funciones puras.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import type { FilaCatalogo } from '@most/compartido/motorPlan';
import type { HabitoPlan } from '@most/compartido/plan';

import type { HabitoPropuesto } from './esquemasIa.js';

// ===== Tipos =====

/** Fila de habit_catalog tal como la entrega Prisma. */
export type FilaCatalogoBd = {
  objetivo: string;
  categoria: string;
  nivel: number;
  variante: string;
  titulo: string;
  descripcion: string | null;
  duracion_min: number;
  duracion_reducida_min: number;
  dias_semana: number[];
  momento_fijo: string | null;
  sin_recursos: boolean;
};

// ===== Principal =====

/**
 * Convierte una fila de la base al tipo del motor. Las restricciones CHECK de habit_catalog ya
 * garantizan los valores (nivel 1 a 3, variante, momento), así que solo se ajustan los tipos.
 * @param fila Fila de la base.
 * @returns Fila para el motor del plan.
 */
export function aFilaCatalogo(fila: FilaCatalogoBd): FilaCatalogo {
  return fila as FilaCatalogo;
}

/**
 * Hábito del borrador con su secuencia de micro-pasos.
 * @param habito Hábito que calculó el motor (con hora, aviso y nivel).
 * @param propuesto Micro-pasos ya corregidos con las reglas de MOST.
 * @param usarTextosDelPaso true si los micro-pasos son de la IA: el hábito toma el título, la
 *   duración y los días del paso actual. Con el catálogo se quedan los del motor (son el mismo
 *   nivel del catálogo).
 * @returns Hábito listo para el borrador.
 */
export function combinarConMicroPasos(
  habito: HabitoPlan,
  propuesto: HabitoPropuesto,
  usarTextosDelPaso: boolean,
): HabitoPlan {
  const pasoActual = Math.min(propuesto.paso_inicial, propuesto.micro_pasos.length);
  const paso = propuesto.micro_pasos[pasoActual - 1];
  const combinado: HabitoPlan = {
    ...habito,
    micro_pasos: propuesto.micro_pasos,
    paso_actual: pasoActual,
  };
  if (!usarTextosDelPaso || paso === undefined) {
    return combinado;
  }
  return {
    ...combinado,
    titulo: paso.titulo,
    descripcion: paso.descripcion === '' ? null : paso.descripcion,
    duracion_min: paso.duracion_min,
    dias_semana: paso.dias_semana,
    usa_duracion_reducida: habito.usa_duracion_reducida && paso.duracion_min > 0,
  };
}
