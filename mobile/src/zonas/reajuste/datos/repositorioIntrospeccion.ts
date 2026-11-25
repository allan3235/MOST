/**
 * @file repositorioIntrospeccion.ts
 * @proyecto most.
 * @descripcion Consultas SQL de la introspección (RF-04, RR-04): última reflexión, primer uso de
 *   la app y guardar una reflexión en la tabla local `introspecciones`, que no entra a la cola de
 *   sincronización: las respuestas nunca salen del teléfono.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación (sale de db/introspeccion-repository.ts).
 */

import { randomUUID } from 'expo-crypto';

import { getDb } from '@/comun/datos/database';
import { avisarCambioLocal } from '@/comun/datos/db-version-store';

// ===== Principal =====

/**
 * Fecha de la última reflexión (o «Ahora no»), o null si nunca hubo.
 * @param userId Usuario con sesión.
 * @returns Fecha local.
 */
export async function leerUltimaReflexion(userId: string): Promise<string | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{ fecha: string | null }>(
    'SELECT MAX(fecha) AS fecha FROM introspecciones WHERE user_id = ?',
    [userId],
  );
  return fila?.fecha ?? null;
}

/**
 * Cuándo se creó el primer hábito de la persona (ISO), o null si todavía no tiene.
 * @param userId Usuario con sesión.
 * @returns Marca de tiempo.
 */
export async function leerPrimerHabitoCreado(userId: string): Promise<string | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{ creado: string | null }>(
    'SELECT MIN(created_at) AS creado FROM habits WHERE user_id = ?',
    [userId],
  );
  return fila?.creado ?? null;
}

/**
 * Guarda una reflexión en el teléfono.
 * @param fila Usuario, fecha, motivo y respuestas en JSON (null si la pospuso).
 */
export async function insertarReflexion(fila: {
  userId: string;
  fecha: string;
  motivo: string;
  respuestas: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO introspecciones (id, user_id, fecha, motivo, respuestas, creado_en) VALUES (?, ?, ?, ?, ?, ?)',
    [randomUUID(), fila.userId, fila.fecha, fila.motivo, fila.respuestas, new Date().toISOString()],
  );
  avisarCambioLocal();
}
