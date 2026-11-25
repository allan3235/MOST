import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Habito,
  Horario,
  Ocurrencia,
  Registro,
} from '@/features/habits/domain/habitos-del-dia';
import {
  diasSeguidos,
  tocaAvisoMotivacional,
} from '@/features/reminders/domain/aviso-motivacional';
import type { DatosAvisos } from '@/features/reminders/domain/planificar-avisos';
import { historialDelPlan } from '@/features/reminders/domain/historial-plan';
import {
  semanaDeApoyoEnPlanes,
  type PlanApoyo,
  type SemanaApoyo,
} from '@/features/reminders/domain/semana-apoyo';
import { fechaLocal, sumarDias } from '@/comun/logica/dates';
import { globalesSchema, momentoPrincipal, type Momento } from '@/comun/modelo/esquemas/onboarding';

import { getDb, leerFilas } from '@/comun/datos/database';
import { leerAjustesEn, leerConfigAvisos } from '@/zonas/cuenta/datos/repositorioAjustes';

// Lo que necesitan los avisos (SDD 7.1), leído de SQLite: funciona sin conexión.

type Contexto = { momento: Momento | null; planes: PlanApoyo[] };

/**
 * P5 (global) y, de cada plan activo, su historial (P3) y su inicio. Sin formulario ni planes:
 * momento null y sin planes.
 */
async function leerContexto(db: SQLiteDatabase, userId: string): Promise<Contexto> {
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
  // P5 por día (versión 4) o un solo momento (versión 3): se resume en un momento o «varía».
  const globales = globalesSchema.safeParse(respuestas?.respuestas);
  const historialGlobal = respuestas?.respuestas?.historial;
  return {
    momento: globales.success ? momentoPrincipal(globales.data.disponibilidad) : null,
    planes: planes.flatMap((p) =>
      p.creado_en
        ? [
            {
              historial: historialDelPlan(p.respuestas, historialGlobal),
              inicioPlan: fechaLocal(new Date(p.creado_en)),
            },
          ]
        : [],
    ),
  };
}

/** Todo lo que necesita `planificarAvisos`, o null si todavía no llegan los ajustes. */
export async function leerDatosAvisos(userId: string): Promise<DatosAvisos | null> {
  const db = await getDb();
  const ajustes = await leerAjustesEn(db, userId);
  if (!ajustes) return null;
  const hoy = fechaLocal();
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
  return {
    estilo: ajustes.estilo,
    estrategias: ajustes.estrategias,
    segundoAviso: ajustes.segundoAviso,
    resumenNocturno: ajustes.resumenNocturno,
    horas: ajustes.horas,
    config,
    ...contexto,
    habitos,
    horarios,
    ocurrencias,
    registros,
  };
}

/** Semana de apoyo que toca hoy (3 o 4), para el mensaje en Hoy. */
export async function leerSemanaApoyo(userId: string): Promise<SemanaApoyo | null> {
  const db = await getDb();
  const { planes } = await leerContexto(db, userId);
  return semanaDeApoyoEnPlanes(planes, fechaLocal());
}

/** Días hacia atrás que se revisan para contar los días seguidos. */
const DIAS_REVISADOS_MOTIVACION = 400;

/**
 * Aviso motivacional (RF-13): si con lo de hoy se llega a 3, 6, 9… días seguidos con algún paso
 * hecho y hoy no se avisó, deja hoy como día avisado (máximo uno al día) y devuelve los días. Con
 * el estilo «Lo mínimo» no se avisa.
 * @param userId Usuario con sesión.
 * @returns Los días seguidos si toca avisar, o null.
 */
export async function revisarAvisoMotivacional(userId: string): Promise<number | null> {
  const db = await getDb();
  const ajustes = await leerAjustesEn(db, userId);
  if (!ajustes || ajustes.estilo === 'minimo') {
    return null;
  }
  const hoy = fechaLocal();
  const filas = await db.getAllAsync<{ fecha: string }>(
    'SELECT DISTINCT fecha FROM habit_logs WHERE user_id = ? AND eliminado_en IS NULL AND fecha >= ?',
    [userId, sumarDias(hoy, -DIAS_REVISADOS_MOTIVACION)],
  );
  const dias = diasSeguidos(new Set(filas.map((f) => f.fecha)), hoy);
  const ultimo = await db.getFirstAsync<{ ultima_fecha: string }>(
    'SELECT ultima_fecha FROM avisos_motivacionales WHERE user_id = ?',
    [userId],
  );
  if (!tocaAvisoMotivacional(dias, ultimo?.ultima_fecha ?? null, hoy)) {
    return null;
  }
  await db.runAsync(
    'INSERT OR REPLACE INTO avisos_motivacionales (user_id, ultima_fecha) VALUES (?, ?)',
    [userId, hoy],
  );
  return dias;
}
