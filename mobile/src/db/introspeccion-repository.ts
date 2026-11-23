/**
 * @file introspeccion-repository.ts
 * @proyecto most.
 * @descripcion Introspección por valores (RF-04) en SQLite. Las respuestas viven solo en la tabla
 *   local `introspecciones`: no entran a la cola de sincronización ni salen del teléfono (RR-04).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { randomUUID } from 'expo-crypto';

import {
  tocaReflexion,
  type MotivoIntrospeccion,
  type Respuestas,
} from '@/features/introspeccion/domain/introspeccion';
import { fechaLocal } from '@/lib/dates';

import { getDb } from './database';
import { avisarCambioLocal } from './db-version-store';

// ===== Principal =====

/**
 * Si hoy toca ofrecer la reflexión semanal: pasó una semana desde la última o desde que empezó a
 * usar la app (su primer hábito).
 * @param userId Usuario con sesión.
 * @returns true si toca.
 */
export async function leerTocaReflexion(userId: string): Promise<boolean> {
  const db = await getDb();
  const ultima = await db.getFirstAsync<{ fecha: string | null }>(
    'SELECT MAX(fecha) AS fecha FROM introspecciones WHERE user_id = ?',
    [userId],
  );
  const primero = await db.getFirstAsync<{ creado: string | null }>(
    'SELECT MIN(created_at) AS creado FROM habits WHERE user_id = ?',
    [userId],
  );
  const primerUso = primero?.creado ? fechaLocal(new Date(primero.creado)) : null;
  return tocaReflexion(ultima?.fecha ?? null, primerUso, fechaLocal());
}

/**
 * Guarda una reflexión. Con respuestas null es «Ahora no»: cuenta como la de esta semana para no
 * volver a preguntar hasta dentro de 7 días.
 * @param userId Usuario con sesión.
 * @param motivo Semanal o después de pausar.
 * @param respuestas Respuestas 1–5 (o saltadas), o null si la pospuso.
 */
export async function guardarIntrospeccion(
  userId: string,
  motivo: MotivoIntrospeccion,
  respuestas: Respuestas | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO introspecciones (id, user_id, fecha, motivo, respuestas, creado_en) VALUES (?, ?, ?, ?, ?, ?)',
    [
      randomUUID(),
      userId,
      fechaLocal(),
      motivo,
      respuestas ? JSON.stringify(respuestas) : null,
      new Date().toISOString(),
    ],
  );
  avisarCambioLocal();
}
