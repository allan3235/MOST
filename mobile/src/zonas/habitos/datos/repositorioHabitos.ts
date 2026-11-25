/**
 * @file repositorioHabitos.ts
 * @proyecto most.
 * @descripcion Consultas SQL de la zona Hábitos: categorías, dueño de un hábito, conteo de
 *   hábitos activos y los ajustes que limitan cuántos se pueden tener o cuánto tiempo usan. Las
 *   tablas comunes se leen y escriben con comun/datos/database; aquí solo queda el SQL propio.
 *   Las reglas viven en servicioHabitos.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación (sale de db/habits-repository.ts).
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { AREAS, type Area } from '@/comun/modelo/esquemas/onboarding';

// ===== Principal =====

/**
 * Categorías del área (las 5 globales) por su id.
 * @param db Base local.
 * @returns category_id → área.
 */
export async function categoriasPorId(db: SQLiteDatabase): Promise<Map<string, Area>> {
  const filas = await db.getAllAsync<{ id: string; clave: string }>(
    'SELECT id, clave FROM categories',
  );
  const areas = new Set<string>(AREAS);
  return new Map(
    filas.filter((f) => areas.has(f.clave)).map((f) => [f.id, f.clave as Area] as const),
  );
}

/**
 * id de la categoría global de un área.
 * @param db Base local.
 * @param area Área.
 * @returns category_id.
 */
export async function idCategoria(db: SQLiteDatabase, area: Area): Promise<string> {
  const fila = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM categories WHERE clave = ? AND user_id IS NULL',
    [area],
  );
  if (!fila) throw new Error(`Falta la categoría ${area} en la base local`);
  return fila.id;
}

/**
 * Tiempo diario de la persona (minutos), o null si todavía no llegan sus ajustes.
 * @param db Base local.
 * @param userId Usuario con sesión.
 * @returns Minutos.
 */
export async function leerPresupuesto(db: SQLiteDatabase, userId: string): Promise<number | null> {
  const fila = await db.getFirstAsync<{ presupuesto_min: number }>(
    'SELECT presupuesto_min FROM user_settings WHERE user_id = ?',
    [userId],
  );
  return fila?.presupuesto_min ?? null;
}

/**
 * Dueño de un hábito, o null si no existe.
 * @param db Base local.
 * @param habitId Hábito.
 * @returns user_id.
 */
export async function leerDuenoHabito(db: SQLiteDatabase, habitId: string): Promise<string | null> {
  const fila = await db.getFirstAsync<{ user_id: string }>(
    'SELECT user_id FROM habits WHERE id = ?',
    [habitId],
  );
  return fila?.user_id ?? null;
}

/**
 * Hábitos activos (del plan y propios), sin pausados ni archivados: los que cuenta el límite.
 * @param db Base local.
 * @returns Cuántos.
 */
export async function contarHabitosActivos(db: SQLiteDatabase): Promise<number> {
  const fila = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM habits WHERE archivado_en IS NULL AND activo = 1',
  );
  return fila?.n ?? 0;
}

/**
 * Subidas de nivel del plan y si el límite de hábitos ya se desbloqueó.
 * @param db Base local.
 * @param userId Usuario con sesión.
 * @returns Los dos valores (0 y false si todavía no llegan los ajustes).
 */
export async function leerLimitesPlan(
  db: SQLiteDatabase,
  userId: string,
): Promise<{ subidas: number; desbloqueado: boolean }> {
  const fila = await db.getFirstAsync<{
    subidas_plan: number | null;
    limite_plan_desbloqueado: number | null;
  }>('SELECT subidas_plan, limite_plan_desbloqueado FROM user_settings WHERE user_id = ?', [
    userId,
  ]);
  return {
    subidas: fila?.subidas_plan ?? 0,
    desbloqueado: fila?.limite_plan_desbloqueado === 1,
  };
}
