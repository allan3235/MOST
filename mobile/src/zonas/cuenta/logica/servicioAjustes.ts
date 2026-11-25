/**
 * @file servicioAjustes.ts
 * @proyecto most.
 * @descripcion Servicio de los ajustes del usuario (Perfil): la puerta de la presentación para
 *   leerlos y cambiarlos, y los cálculos que dependen de los hábitos (minutos de cada día, día más
 *   cargado, límite de duración de un hábito del plan, SDD 6.5).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación (antes mezclado en db/settings-repository.ts).
 */

import { leerHabitos, type HabitoConHorario } from '@/db/habits-repository';
import { limiteDuracionPlan, minutosPorDia } from '@/features/habits/domain/presupuesto';

import {
  guardarAjustes as guardarEnBase,
  leerAjustes as leerDeBase,
  leerAjustesLocales as leerLocales,
  type Ajustes,
  type AjustesLocales,
  type CambiosAjustes,
} from '../datos/repositorioAjustes';

// ===== Tipos =====

export type AjustesPerfil = {
  ajustes: Ajustes | null;
  /** Minutos del día con más hábitos, para avisar si el tiempo diario queda corto. */
  minutosDiaMasCargado: number;
};

export type { Ajustes, AjustesLocales, CambiosAjustes };

// ===== Funciones auxiliares =====

function minutosDe(habitos: readonly HabitoConHorario[]): number[] {
  return minutosPorDia(
    habitos
      .filter((h) => h.habito.activo && h.horario !== undefined)
      .map((h) => ({
        duracion_min: h.habito.duracion_min,
        dias_semana: h.horario?.dias_semana ?? [],
      })),
  );
}

// ===== Principal =====

/**
 * Ajustes del usuario (SQLite).
 * @param userId Usuario con sesión.
 * @returns Los ajustes, o null si todavía no llegan.
 */
export function leerAjustes(userId: string): Promise<Ajustes | null> {
  return leerDeBase(userId);
}

/**
 * Ajustes y saldo para Hoy y el formulario de hábito (funciona sin conexión).
 * @param userId Usuario con sesión.
 * @returns Estilo, horas y saldo.
 */
export function leerAjustesLocales(userId: string): Promise<AjustesLocales> {
  return leerLocales(userId);
}

/**
 * Cambia ajustes desde Perfil: se guardan en el teléfono y se suben con la cola.
 * @param userId Usuario con sesión.
 * @param cambios Lo que cambia.
 */
export function guardarAjustes(userId: string, cambios: CambiosAjustes): Promise<void> {
  return guardarEnBase(userId, cambios);
}

/**
 * Minutos de cada día (lunes … domingo) que suman los hábitos activos con horario.
 * @returns 7 números.
 */
export async function leerMinutosPorDia(): Promise<number[]> {
  return minutosDe(await leerHabitos());
}

/**
 * Lo que muestra Perfil: los ajustes y el día más cargado.
 * @param userId Usuario con sesión.
 * @returns Ajustes y minutos del día más cargado.
 */
export async function leerAjustesPerfil(userId: string): Promise<AjustesPerfil> {
  const [ajustes, habitos] = await Promise.all([leerDeBase(userId), leerHabitos()]);
  return { ajustes, minutosDiaMasCargado: Math.max(0, ...minutosDe(habitos)) };
}

/**
 * Duración máxima de un hábito del plan (tiempo diario entre los hábitos activos del plan), o null
 * si el hábito es propio: esos no tienen límite (SDD 6.5).
 * @param userId Usuario con sesión.
 * @param habitId Hábito.
 * @returns Minutos máximos, o null.
 */
export async function leerLimiteDuracion(userId: string, habitId: string): Promise<number | null> {
  const [ajustes, habitos] = await Promise.all([leerDeBase(userId), leerHabitos()]);
  const habito = habitos.find((h) => h.habito.id === habitId)?.habito;
  if (!ajustes || !habito || habito.plan_id === null) return null;
  // Los hábitos sin duración no gastan tiempo del día: no cuentan en el reparto.
  const delPlan = habitos.filter(
    (h) => h.habito.plan_id !== null && h.habito.activo && h.habito.duracion_min > 0,
  ).length;
  return limiteDuracionPlan(ajustes.presupuestoMin, delPlan, habito.duracion_min);
}
