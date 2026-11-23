/**
 * @file planCatalogo.ts
 * @proyecto most.
 * @descripcion Respaldo cuando la IA no responde: arma el hábito de un objetivo con sus 3 niveles
 *   del catálogo semilla (habit_catalog), que pasan a ser sus micro-pasos. Funciones puras.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import type { HabitoIa } from './esquemasIa.js';

// ===== Tipos =====

export type FilaCatalogo = {
  objetivo: string;
  nivel: number;
  variante: string;
  titulo: string;
  descripcion: string | null;
  duracion_min: number;
  duracion_reducida_min: number;
  dias_semana: number[];
};

// ===== Constantes =====

const VARIANTE_BASE = 'base';
const VARIANTE_SIN_RECURSOS = 'sin_recursos';
export const RESUMEN_CATALOGO =
  'Empezamos con pasos pequeños para que sea fácil sostenerlos. Cuando quieras más, el plan crece contigo.';

// ===== Principal =====

/**
 * Hábito de un objetivo con sus niveles del catálogo como micro-pasos.
 * @param filas Filas del catálogo (de cualquier objetivo).
 * @param objetivo Clave del objetivo.
 * @param sinRecursos true si la persona eligió "recursos" (P6): usa esa variante si existe.
 * @returns El hábito, o null si el catálogo no tiene ese objetivo.
 */
export function armarHabitoDesdeCatalogo(
  filas: readonly FilaCatalogo[],
  objetivo: string,
  sinRecursos: boolean,
): HabitoIa | null {
  const delObjetivo = filas.filter((fila) => fila.objetivo === objetivo);
  const tieneSinRecursos = delObjetivo.some((fila) => fila.variante === VARIANTE_SIN_RECURSOS);
  const variante = sinRecursos && tieneSinRecursos ? VARIANTE_SIN_RECURSOS : VARIANTE_BASE;
  const niveles = delObjetivo
    .filter((fila) => fila.variante === variante)
    .sort((a, b) => a.nivel - b.nivel);
  if (niveles.length === 0) {
    return null;
  }
  return {
    objetivo,
    titulo: niveles[0].titulo,
    descripcion: niveles[0].descripcion ?? '',
    micro_pasos: niveles.map((fila) => ({
      titulo: fila.titulo,
      descripcion: fila.descripcion ?? '',
      duracion_min: fila.duracion_min,
      duracion_reducida_min: fila.duracion_reducida_min,
      dias_semana: fila.dias_semana,
    })),
  };
}
