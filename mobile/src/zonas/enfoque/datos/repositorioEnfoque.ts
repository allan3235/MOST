/**
 * @file repositorioEnfoque.ts
 * @proyecto most.
 * @descripcion Sesión de modo enfoque (RF-14) en SQLite: solo se guarda hasta cuándo dura, en
 *   `preferencias_locales`, para que siga aunque se cierre la app. Vive en el teléfono.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import type { GuardadoFiltro } from '@/zonas/enfoque/logica/no-molestar';

import { getDb } from '@/comun/datos/database';
import { avisarCambioLocal } from '@/comun/datos/db-version-store';

// ===== Constantes =====

const CLAVE_ENFOQUE = 'enfoque_hasta';
/** Filtro de No Molestar que tenía el teléfono antes de la sesión (CP-15). */
const CLAVE_FILTRO_PREVIO = 'enfoque_filtro_previo';

// ===== Principal =====

/**
 * Fin de la sesión guardada, aunque ya haya pasado; null si no hay.
 * @param userId Usuario con sesión.
 * @returns La fecha de fin, o null.
 */
export async function leerEnfoqueHasta(userId: string): Promise<Date | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{ valor: string }>(
    'SELECT valor FROM preferencias_locales WHERE user_id = ? AND clave = ?',
    [userId, CLAVE_ENFOQUE],
  );
  if (!fila) {
    return null;
  }
  const hasta = new Date(fila.valor);
  return Number.isNaN(hasta.getTime()) ? null : hasta;
}

/**
 * Guarda el fin de una sesión nueva.
 * @param userId Usuario con sesión.
 * @param hasta Fin de la sesión.
 */
export async function guardarEnfoqueHasta(userId: string, hasta: Date): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO preferencias_locales (user_id, clave, valor) VALUES (?, ?, ?)',
    [userId, CLAVE_ENFOQUE, hasta.toISOString()],
  );
  avisarCambioLocal();
}

/**
 * Termina la sesión (al acabar el tiempo o al cancelarla).
 * @param userId Usuario con sesión.
 */
export async function borrarEnfoque(userId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM preferencias_locales WHERE user_id = ? AND clave = ?', [
    userId,
    CLAVE_ENFOQUE,
  ]);
  avisarCambioLocal();
}

/**
 * Guardado del filtro de No Molestar previo a la sesión, en las preferencias locales.
 * @param userId Usuario con sesión.
 * @returns Leer, guardar y borrar el filtro.
 */
export function guardadoFiltroPrevio(userId: string): GuardadoFiltro {
  return {
    leer: async () => {
      const db = await getDb();
      const fila = await db.getFirstAsync<{ valor: string }>(
        'SELECT valor FROM preferencias_locales WHERE user_id = ? AND clave = ?',
        [userId, CLAVE_FILTRO_PREVIO],
      );
      const filtro = fila ? Number(fila.valor) : Number.NaN;
      return Number.isInteger(filtro) ? filtro : null;
    },
    guardar: async (filtro) => {
      const db = await getDb();
      await db.runAsync(
        'INSERT OR REPLACE INTO preferencias_locales (user_id, clave, valor) VALUES (?, ?, ?)',
        [userId, CLAVE_FILTRO_PREVIO, String(filtro)],
      );
    },
    borrar: async () => {
      const db = await getDb();
      await db.runAsync('DELETE FROM preferencias_locales WHERE user_id = ? AND clave = ?', [
        userId,
        CLAVE_FILTRO_PREVIO,
      ]);
    },
  };
}
