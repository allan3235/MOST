/**
 * @file repositorioAvisos.ts
 * @proyecto most.
 * @descripcion Capa de datos de los recordatorios (SDD 7.1): lee de SQLite lo que necesitan los
 *   avisos (ajustes, respuestas de la encuesta, planes activos, hábitos, horarios, días movidos y
 *   registros) y el registro del aviso motivacional (máximo uno al día, RF-13). Solo lee y guarda:
 *   qué se avisa y cuándo lo decide la capa de lógica. Funciona sin conexión.
 * @autor Equipo most. (código heredado de Habit Green; reorganizado por Allan con Claude Code)
 * @fecha 2026-11-24
 * @version 1.1.0
 * @historial 1.1.0 (2026-11-24): pasa a zonas/recordatorios/datos (antes db/reminders-repository.ts);
 *   las reglas (contexto, semana de apoyo, días seguidos) pasan a la lógica.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { getDb, leerFilas } from '@/comun/datos/database';
import { sumarDias } from '@/comun/util/dates';
import type {
  Habito,
  Horario,
  Ocurrencia,
  Registro,
} from '@/features/habits/domain/habitos-del-dia';
import {
  leerAjustesEn,
  leerConfigAvisos,
  type Ajustes,
} from '@/zonas/cuenta/datos/repositorioAjustes';
import type { ConfigAvisos } from '@/comun/modelo/configuracion';

// ===== Tipos =====

/** Respuestas globales (sin validar) y planes activos: de aquí sale el contexto de los avisos. */
export type FuentesContexto = {
  respuestasGlobales: Record<string, unknown> | null;
  planes: { creado_en: string | null; respuestas: unknown }[];
};

export type FuentesAvisos = FuentesContexto & {
  ajustes: Ajustes;
  config: ConfigAvisos;
  habitos: Habito[];
  horarios: Horario[];
  ocurrencias: Ocurrencia[];
  registros: Registro[];
};

// ===== Funciones auxiliares =====

async function leerContexto(db: SQLiteDatabase, userId: string): Promise<FuentesContexto> {
  const [respuestas] = await leerFilas<{ respuestas: Record<string, unknown> | null }>(
    db,
    'onboarding_answers',
    'user_id = ?',
    [userId],
  );
  const planes = await leerFilas<{ creado_en: string | null; respuestas: unknown }>(
    db,
    'plans',
    'user_id = ? AND activo = 1 ORDER BY creado_en',
    [userId],
  );
  return { respuestasGlobales: respuestas?.respuestas ?? null, planes };
}

// ===== Principal =====

/**
 * Lo que necesita la planificación de avisos, o null si todavía no llegan los ajustes.
 * @param userId Usuario con sesión.
 * @param hoy Fecha local "YYYY-MM-DD".
 * @returns Las filas tal como están en SQLite.
 */
export async function leerFuentesAvisos(
  userId: string,
  hoy: string,
): Promise<FuentesAvisos | null> {
  const db = await getDb();
  const ajustes = await leerAjustesEn(db, userId);
  if (!ajustes) return null;
  const [config, contexto, habitos, horarios, ocurrencias, registros] = await Promise.all([
    leerConfigAvisos(db),
    leerContexto(db, userId),
    leerFilas<Habito>(db, 'habits', 'archivado_en IS NULL'),
    leerFilas<Horario>(db, 'habit_schedules'),
    leerFilas<Ocurrencia>(db, 'habit_occurrences', 'fecha_original >= ? OR fecha_nueva >= ?', [
      hoy,
      hoy,
    ]),
    // Solo pueden estar hechos los de hoy (y mañana, si el reloj se adelantó).
    leerFilas<Registro>(db, 'habit_logs', 'fecha IN (?, ?)', [hoy, sumarDias(hoy, 1)]),
  ]);
  return { ajustes, config, ...contexto, habitos, horarios, ocurrencias, registros };
}

/**
 * Respuestas globales y planes activos (para la semana de apoyo).
 * @param userId Usuario con sesión.
 * @returns Las filas sin validar.
 */
export async function leerFuentesContexto(userId: string): Promise<FuentesContexto> {
  return leerContexto(await getDb(), userId);
}

/**
 * Estilo de avisos de la persona, o null si todavía no llegan sus ajustes.
 * @param userId Usuario con sesión.
 * @returns El estilo.
 */
export async function leerEstiloAvisos(userId: string): Promise<Ajustes['estilo'] | null> {
  return (await leerAjustesEn(await getDb(), userId))?.estilo ?? null;
}

/**
 * Fechas (sin repetir) con algún registro hecho desde una fecha.
 * @param userId Usuario con sesión.
 * @param desde Fecha local "YYYY-MM-DD".
 * @returns Las fechas.
 */
export async function leerFechasConRegistro(userId: string, desde: string): Promise<Set<string>> {
  const db = await getDb();
  const filas = await db.getAllAsync<{ fecha: string }>(
    'SELECT DISTINCT fecha FROM habit_logs WHERE user_id = ? AND eliminado_en IS NULL AND fecha >= ?',
    [userId, desde],
  );
  return new Set(filas.map((f) => f.fecha));
}

/**
 * Último día en que se mandó el aviso motivacional, o null.
 * @param userId Usuario con sesión.
 * @returns Fecha local.
 */
export async function leerUltimoAvisoMotivacional(userId: string): Promise<string | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{ ultima_fecha: string }>(
    'SELECT ultima_fecha FROM avisos_motivacionales WHERE user_id = ?',
    [userId],
  );
  return fila?.ultima_fecha ?? null;
}

/**
 * Anota que hoy ya se mandó el aviso motivacional (máximo uno al día).
 * @param userId Usuario con sesión.
 * @param hoy Fecha local.
 */
export async function guardarAvisoMotivacional(userId: string, hoy: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO avisos_motivacionales (user_id, ultima_fecha) VALUES (?, ?)',
    [userId, hoy],
  );
}
