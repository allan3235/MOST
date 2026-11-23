/**
 * @file hitos-repository.ts
 * @proyecto most.
 * @descripcion Hitos de avance del micro-paso (RF-16) leídos de SQLite: cuántas veces se hizo el
 *   paso en curso, si un check-in cruzó el 50 % o el 80 % (una sola vez por paso) y la preferencia
 *   de sonido de los logros (RI-03, audio opcional). Todo vive en el teléfono.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import {
  avanceDelPaso,
  hitoAlcanzado,
  type AvancePaso,
  type PorcentajeHito,
} from '@/features/progression/domain/hitos';

import { getDb } from './database';
import { avisarCambioLocal } from './db-version-store';

// ===== Tipos =====

export type HitoAlcanzado = {
  porcentaje: PorcentajeHito;
  titulo: string;
  avance: AvancePaso;
};

type HabitoDelHito = { titulo: string; nivel_desde: string | null; paso_actual: number | null };

// ===== Constantes =====

const CLAVE_SONIDO = 'sonido_hitos';
const VALOR_APAGADO = '0';
const VALOR_ENCENDIDO = '1';

// ===== Funciones auxiliares =====

/** Veces hechas del paso en curso: registros no deshechos desde que empezó (`nivel_desde`). */
async function contarHechosDelPaso(
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
 * Después de completar un hábito: si con este registro el paso llegó a 5 o a 8 de 10 y ese hito
 * no se celebró antes en este paso, lo deja celebrado y lo devuelve.
 * @param userId Usuario con sesión.
 * @param habitId Hábito recién completado.
 * @returns El hito, o null.
 */
export async function revisarHito(userId: string, habitId: string): Promise<HitoAlcanzado | null> {
  const db = await getDb();
  const habito = await db.getFirstAsync<HabitoDelHito>(
    'SELECT titulo, nivel_desde, paso_actual FROM habits WHERE id = ?',
    [habitId],
  );
  if (!habito) {
    return null;
  }
  const despues = await contarHechosDelPaso(db, habitId, habito.nivel_desde);
  const porcentaje = hitoAlcanzado(despues - 1, despues);
  if (porcentaje === null) {
    return null;
  }
  // Un hito por paso: desmarcar y volver a marcar no lo repite.
  const clave = `${habitId}|${habito.paso_actual ?? ''}|${habito.nivel_desde ?? ''}|${porcentaje}`;
  const resultado = await db.runAsync(
    'INSERT OR IGNORE INTO hitos_celebrados (user_id, clave) VALUES (?, ?)',
    [userId, clave],
  );
  if (resultado.changes === 0) {
    return null;
  }
  return { porcentaje, titulo: habito.titulo, avance: avanceDelPaso(despues) };
}

/**
 * Avance del paso en curso de varios hábitos, para el indicador «5 de 10».
 * @param db Base local.
 * @param habitos Hábitos con su `nivel_desde`.
 * @returns habit_id → avance.
 */
export async function leerAvancesDePasos(
  db: SQLiteDatabase,
  habitos: readonly { id: string; nivel_desde?: string | null }[],
): Promise<Record<string, AvancePaso>> {
  const resultado: Record<string, AvancePaso> = {};
  for (const h of habitos) {
    resultado[h.id] = avanceDelPaso(await contarHechosDelPaso(db, h.id, h.nivel_desde ?? null));
  }
  return resultado;
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
