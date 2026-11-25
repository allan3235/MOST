/**
 * @file repositorioReajuste.ts
 * @proyecto most.
 * @descripcion Consultas SQL del motor de reajuste (RF-09, RF-15): las tarjetas de progresión que
 *   dejó la última revisión (subir, bajar, meta intermedia, apoyo) y las subidas de nivel del plan.
 *   Las tarjetas viven solo en el teléfono. Las reglas están en servicioReajuste y progresion.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación (sale de db/progression-repository.ts).
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { TarjetaGuardada } from '../logica/servicioReajuste';

// ===== Principal =====

/**
 * Tarjetas pendientes, en el orden en que se guardaron.
 * @param db Base local.
 * @param userId Usuario con sesión.
 * @returns Las tarjetas (las que no se pueden leer se omiten).
 */
export async function leerTarjetasGuardadas(
  db: SQLiteDatabase,
  userId: string,
): Promise<TarjetaGuardada[]> {
  const filas = await db.getAllAsync<{ json: string }>(
    'SELECT json FROM progresion_tarjetas WHERE user_id = ? ORDER BY orden',
    [userId],
  );
  return filas.flatMap((f) => {
    try {
      return [JSON.parse(f.json) as TarjetaGuardada];
    } catch {
      return [];
    }
  });
}

/**
 * Quita una tarjeta (contestada o cerrada).
 * @param db Base local.
 * @param userId Usuario con sesión.
 * @param id Tarjeta.
 */
export async function borrarTarjeta(db: SQLiteDatabase, userId: string, id: string): Promise<void> {
  await db.runAsync('DELETE FROM progresion_tarjetas WHERE user_id = ? AND id = ?', [userId, id]);
}

/**
 * Reemplaza todas las tarjetas de la persona por las de la revisión nueva.
 * @param db Base local (dentro de la transacción de la revisión).
 * @param userId Usuario con sesión.
 * @param tarjetas Tarjetas en orden.
 */
export async function reemplazarTarjetas(
  db: SQLiteDatabase,
  userId: string,
  tarjetas: readonly TarjetaGuardada[],
): Promise<void> {
  await db.runAsync('DELETE FROM progresion_tarjetas WHERE user_id = ?', [userId]);
  for (const [orden, t] of tarjetas.entries()) {
    await db.runAsync(
      'INSERT INTO progresion_tarjetas (user_id, id, orden, json) VALUES (?, ?, ?, ?)',
      [userId, t.id, orden, JSON.stringify(t)],
    );
  }
}

/**
 * Subidas de nivel del plan, o null si todavía no llegan los ajustes.
 * @param db Base local.
 * @param userId Usuario con sesión.
 * @returns Cuántas.
 */
export async function leerSubidasPlan(db: SQLiteDatabase, userId: string): Promise<number | null> {
  const fila = await db.getFirstAsync<{ subidas_plan: number | null }>(
    'SELECT subidas_plan FROM user_settings WHERE user_id = ?',
    [userId],
  );
  return fila ? (fila.subidas_plan ?? 0) : null;
}
