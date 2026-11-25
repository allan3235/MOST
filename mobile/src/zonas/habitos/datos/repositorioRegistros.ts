/**
 * @file repositorioRegistros.ts
 * @proyecto most.
 * @descripcion Consultas SQL de los registros de hábitos (check-in, SDD 6.1): planta y saldo de la
 *   persona, registros deshechos que aún cuentan para el tope de monedas, el último día marcado y
 *   el registro de un hábito en una fecha. Las reglas de recompensas viven en servicioRegistros.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación (sale de db/logs-repository.ts).
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { Planta } from '@/zonas/plantas/logica/recompensas';

// ===== Principal =====

/**
 * Planta del área (XP, nivel y fase), o null si todavía no tiene.
 * @param db Base local.
 * @param userId Usuario con sesión.
 * @param categoryId Área.
 * @returns La planta.
 */
export function leerPlanta(
  db: SQLiteDatabase,
  userId: string,
  categoryId: string,
): Promise<Planta | null> {
  return db.getFirstAsync<Planta>(
    'SELECT xp, nivel, fase FROM plant_progress WHERE user_id = ? AND category_id = ?',
    [userId, categoryId],
  );
}

/**
 * Saldo del monedero (0 si todavía no tiene).
 * @param db Base local.
 * @param userId Usuario con sesión.
 * @returns Monedas.
 */
export async function leerSaldo(db: SQLiteDatabase, userId: string): Promise<number> {
  const fila = await db.getFirstAsync<{ saldo: number }>(
    'SELECT saldo FROM wallets WHERE user_id = ?',
    [userId],
  );
  return fila?.saldo ?? 0;
}

/**
 * Hábitos desmarcados ese día cuyo pago no se devolvió (siguen contando para el tope).
 * @param db Base local.
 * @param userId Usuario con sesión.
 * @param fecha Fecha local.
 * @returns habit_id de cada uno.
 */
export async function leerDeshechosSinDevolver(
  db: SQLiteDatabase,
  userId: string,
  fecha: string,
): Promise<string[]> {
  const filas = await db.getAllAsync<{ habit_id: string }>(
    'SELECT habit_id FROM habit_logs WHERE user_id = ? AND fecha = ? AND eliminado_en IS NOT NULL AND monedas_sin_devolver = 1',
    [userId, fecha],
  );
  return filas.map((f) => f.habit_id);
}

/**
 * Último día con algún registro (para no marcar días pasados atrasando el reloj).
 * @param db Base local.
 * @param userId Usuario con sesión.
 * @returns Fecha local, o null.
 */
export async function leerUltimaFechaRegistro(
  db: SQLiteDatabase,
  userId: string,
): Promise<string | null> {
  const fila = await db.getFirstAsync<{ fecha: string | null }>(
    'SELECT MAX(fecha) AS fecha FROM habit_logs WHERE user_id = ?',
    [userId],
  );
  return fila?.fecha ?? null;
}

/**
 * Registro de un hábito en una fecha (aunque esté deshecho), para reutilizar su id y su marca.
 * @param db Base local.
 * @param habitId Hábito.
 * @param fecha Fecha local.
 * @returns id y si su pago no se devolvió, o null.
 */
export function leerRegistroDelDia(
  db: SQLiteDatabase,
  habitId: string,
  fecha: string,
): Promise<{ id: string; monedas_sin_devolver: number } | null> {
  return db.getFirstAsync<{ id: string; monedas_sin_devolver: number }>(
    'SELECT id, monedas_sin_devolver FROM habit_logs WHERE habit_id = ? AND fecha = ?',
    [habitId, fecha],
  );
}

/**
 * Hábito sin archivar de la persona, para marcarlo desde una notificación.
 * @param db Base local.
 * @param habitId Hábito.
 * @param userId Usuario con sesión.
 * @returns id y área, o null si no existe o se archivó.
 */
export function leerHabitoParaMarcar(
  db: SQLiteDatabase,
  habitId: string,
  userId: string,
): Promise<{ id: string; category_id: string } | null> {
  return db.getFirstAsync<{ id: string; category_id: string }>(
    'SELECT id, category_id FROM habits WHERE id = ? AND user_id = ? AND archivado_en IS NULL',
    [habitId, userId],
  );
}
