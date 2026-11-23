/**
 * @file tiposPostgres.ts
 * @proyecto most.
 * @descripcion Cómo llegan a JavaScript las fechas de PostgreSQL. Por defecto "pg" las convierte
 *   en Date, que pierde los microsegundos (el cursor de sincronización los necesita) y corre las
 *   fechas sin hora según la zona del servidor. Aquí se dejan como texto ISO, igual que Supabase.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import pg from 'pg';

// ===== Constantes =====

/** Identificadores de tipo de PostgreSQL (pg_type.oid). */
const OID_DATE = 1082;
const OID_TIMESTAMP = 1114;
const OID_TIMESTAMPTZ = 1184;

const ZONA_SOLO_HORAS = /([+-]\d{2})$/;

// ===== Funciones auxiliares =====

/**
 * Convierte "2026-11-22 23:48:52.123456+00" en "2026-11-22T23:48:52.123456+00:00".
 * @param texto Marca de tiempo en el formato de texto de PostgreSQL.
 * @returns La misma marca en ISO 8601, sin perder precisión.
 */
export function convertirMarcaTiempo(texto: string): string {
  return texto.replace(' ', 'T').replace(ZONA_SOLO_HORAS, '$1:00');
}

// ===== Principal =====

/** Registra los convertidores. Se llama una vez al crear la conexión. */
export function configurarTiposPostgres(): void {
  pg.types.setTypeParser(OID_TIMESTAMPTZ, convertirMarcaTiempo);
  pg.types.setTypeParser(OID_TIMESTAMP, (texto: string) => texto.replace(' ', 'T'));
  pg.types.setTypeParser(OID_DATE, (texto: string) => texto);
}
