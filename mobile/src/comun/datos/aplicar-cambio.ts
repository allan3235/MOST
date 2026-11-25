import type { SQLiteDatabase } from 'expo-sqlite';

import type { OperacionOutbox } from '@/comun/logica/sync/sync-rules';

import { enTransaccion, getDb } from './database';
import { avisarCambioLocal } from './db-version-store';
import { encolar } from './outbox';

// Quién quiere enterarse de cada escritura local (la sincronización se registra al arrancar). Así
// la capa de datos no depende de la lógica: solo avisa a quien se haya suscrito.
const alEscribir = new Set<() => void>();

/**
 * Suscribe una función que corre después de cada escritura local.
 * @param oyente Qué hacer (por ejemplo, pedir una sincronización).
 * @returns Función para cancelar la suscripción.
 */
export function suscribirseAEscrituras(oyente: () => void): () => void {
  alEscribir.add(oyente);
  return () => {
    alEscribir.delete(oyente);
  };
}

/**
 * Escribe filas locales y sus operaciones de la cola juntas (una transacción), y avisa a la UI y a
 * quien se haya suscrito (la sincronización). `pasos` guarda las filas y devuelve las operaciones.
 */
export async function aplicar(
  pasos: (db: SQLiteDatabase) => Promise<OperacionOutbox[]>,
): Promise<void> {
  const db = await getDb();
  await enTransaccion(db, async () => {
    for (const operacion of await pasos(db)) await encolar(db, operacion);
  });
  avisarCambioLocal();
  for (const oyente of alEscribir) oyente();
}
