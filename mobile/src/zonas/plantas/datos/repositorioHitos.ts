/**
 * @file repositorioHitos.ts
 * @proyecto most.
 * @descripcion Hitos de avance del micro-paso (RF-16) leídos de SQLite: cuántas veces se hizo el
 *   paso en curso, qué hitos ya se celebraron (una sola vez por paso) y la preferencia
 *   de sonido de los logros (RI-03, audio opcional). Todo vive en el teléfono.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.1.0
 * @historial 1.0.0 (2026-11-23): creación.
 *   1.1.0 (2026-11-24): pasa a zonas/plantas/datos; decidir el hito queda en servicioPlantas.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { getDb } from '@/comun/datos/database';
import { avisarCambioLocal } from '@/comun/datos/db-version-store';

// ===== Tipos =====

export type HabitoDelHito = {
  titulo: string;
  nivel_desde: string | null;
  paso_actual: number | null;
};

// ===== Constantes =====

const CLAVE_SONIDO = 'sonido_hitos';
const VALOR_APAGADO = '0';
const VALOR_ENCENDIDO = '1';

// ===== Funciones auxiliares =====

/** Veces hechas del paso en curso: registros no deshechos desde que empezó (`nivel_desde`). */
async function contarHechos(
  db: SQLiteDatabase,
  habitId: string,
  nivelDesde: string | null,
): Promise<number> {
  const fila = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM habit_logs WHERE habit_id = ? AND eliminado_en IS NULL AND fecha >= ?',
    [habitId, nivelDesde ?? ''],
  );
  return fila?.n ?? 0;
}

// ===== Principal =====

/**
 * Título, paso y fecha de inicio del paso de un hábito (para revisar si alcanzó un hito).
 * @param habitId Hábito.
 * @returns Sus datos, o null si no existe.
 */
export async function leerHabitoDelHito(habitId: string): Promise<HabitoDelHito | null> {
  const db = await getDb();
  return db.getFirstAsync<HabitoDelHito>(
    'SELECT titulo, nivel_desde, paso_actual FROM habits WHERE id = ?',
    [habitId],
  );
}

/**
 * Veces hechas del paso en curso: registros no deshechos desde que empezó (`nivel_desde`).
 * @param habitId Hábito.
 * @param nivelDesde Inicio del paso.
 * @returns Cuántas veces.
 */
export async function contarHechosDelPaso(
  habitId: string,
  nivelDesde: string | null,
): Promise<number> {
  return contarHechos(await getDb(), habitId, nivelDesde);
}

/**
 * Veces hechas del paso en curso de varios hábitos (para el indicador «5 de 10»).
 * @param db Base local (dentro de otra lectura).
 * @param habitos Hábitos con su `nivel_desde`.
 * @returns habit_id → veces hechas.
 */
export async function contarHechosDePasos(
  db: SQLiteDatabase,
  habitos: readonly { id: string; nivel_desde?: string | null }[],
): Promise<Record<string, number>> {
  const resultado: Record<string, number> = {};
  for (const h of habitos) {
    resultado[h.id] = await contarHechos(db, h.id, h.nivel_desde ?? null);
  }
  return resultado;
}

/**
 * Anota un hito como celebrado. Si ya lo estaba (desmarcar y volver a marcar), no lo repite.
 * @param userId Usuario con sesión.
 * @param clave Hábito, paso y porcentaje.
 * @returns true si es la primera vez.
 */
export async function celebrarHitoNuevo(userId: string, clave: string): Promise<boolean> {
  const db = await getDb();
  const resultado = await db.runAsync(
    'INSERT OR IGNORE INTO hitos_celebrados (user_id, clave) VALUES (?, ?)',
    [userId, clave],
  );
  return resultado.changes > 0;
}

/**
 * Si los logros suenan (RI-03). Encendido mientras no se apague.
 * @param userId Usuario con sesión.
 * @returns true si suena.
 */
export async function leerSonidoHitos(userId: string): Promise<boolean> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{ valor: string }>(
    'SELECT valor FROM preferencias_locales WHERE user_id = ? AND clave = ?',
    [userId, CLAVE_SONIDO],
  );
  return fila?.valor !== VALOR_APAGADO;
}

/**
 * Enciende o apaga el sonido de los logros.
 * @param userId Usuario con sesión.
 * @param activo true para que suene.
 */
export async function guardarSonidoHitos(userId: string, activo: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO preferencias_locales (user_id, clave, valor) VALUES (?, ?, ?)',
    [userId, CLAVE_SONIDO, activo ? VALOR_ENCENDIDO : VALOR_APAGADO],
  );
  avisarCambioLocal();
}
