/**
 * @file servicioPlanes.ts
 * @proyecto most.
 * @descripcion Servicio de los planes (UC-02, UC-15): pide el borrador al backend, lo guarda al
 *   confirmar (hábitos, horarios, micro-pasos, ajustes y respuestas de la encuesta), lista los
 *   planes, saca un hábito del plan o lo termina. Funciona sin conexión salvo generar el borrador.
 * @autor Equipo most. (código heredado de Habit Green; reorganizado por Allan con Claude Code)
 * @fecha 2026-11-24
 * @version 2.0.0
 * @historial 2.0.0 (2026-11-24): pasa a zonas/planes/logica (antes db/plan-repository.ts); el SQL
 *   de las tarjetas queda en repositorioReajuste.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { Habito } from '@/zonas/habitos/logica/habitos-del-dia';

import { filasDelPlan, fechaLocal, type IdsPlan } from './plan-rows';
import { ErrorSinRed, pedirApi } from '@/comun/datos/clienteApi';
import {
  AREAS,
  globalesSchema,
  type Area,
  type Globales,
  type Respuestas,
} from '@/comun/modelo/esquemas/onboarding';
import { borradorPlanSchema, type BorradorPlan } from '@/comun/modelo/esquemas/plan';
import type { OperacionOutbox } from '@/comun/logica/sync/sync-rules';

import { aplicar } from '@/comun/datos/aplicar-cambio';
import { quitarTarjetasDePlan } from '@/zonas/reajuste/datos/repositorioReajuste';
import { actualizarFila, getDb, leerFilas } from '@/comun/datos/database';

// Repositorio del plan. Habla directo con el backend: crear el plan exige conexión (definición 6),
// así que no pasa por la cola de salida. Al llegar a las pestañas, la sincronización lo descarga
// a SQLite.

export type ResultadoBorrador =
  { ok: true; borrador: BorradorPlan } | { ok: false; motivo: 'sin_conexion' | 'error' };

/**
 * Pide el borrador a POST /ia/plan: la IA (Claude) propone los micro-pasos de cada hábito y el
 * motor del plan calcula hora, aviso y ajustes. No guarda nada (SDD 5.8). Con
 * `minutosOcupados` (planes creados desde la app), el plan se acomoda en el tiempo libre del día.
 */
export async function generarBorrador(
  respuestas: Respuestas,
  minutosOcupados = 0,
): Promise<ResultadoBorrador> {
  let datos: unknown;
  try {
    datos = await pedirApi('/ia/plan', {
      metodo: 'POST',
      cuerpo: { respuestas, minutos_ocupados: minutosOcupados },
    });
  } catch (error) {
    // ErrorSinRed = la petición no salió del teléfono (sin red o servidor inalcanzable).
    return { ok: false, motivo: error instanceof ErrorSinRed ? 'sin_conexion' : 'error' };
  }
  const borrador = borradorPlanSchema.safeParse(datos);
  return borrador.success ? { ok: true, borrador: borrador.data } : { ok: false, motivo: 'error' };
}

async function categoriasDelSistema(): Promise<Record<Area, string>> {
  const { filas } = await pedirApi<{
    filas: { id: string; clave: string; user_id: string | null }[];
  }>('/sync/cambios', { consulta: { tabla: 'categories' } });
  const delSistema = filas.filter((c) => c.user_id === null);
  const porClave = new Map(delSistema.map((c) => [c.clave, c.id]));
  const categorias = {} as Record<Area, string>;
  for (const area of AREAS) {
    const id = porClave.get(area);
    if (id === undefined) throw new Error(`Falta la categoría ${area}`);
    categorias[area] = id;
  }
  return categorias;
}

export type OpcionesGuardado = {
  /**
   * El primer plan guarda los ajustes y las respuestas globales (P4 a P7). Un plan siguiente no:
   * esas respuestas ya existen y no se pisan.
   */
  guardarAjustes?: boolean;
  /** Tiempo diario nuevo si el plan no cabía en el actual (sube solo a lo necesario). */
  presupuestoMin?: number;
};

/**
 * Guarda el plan confirmado: plan, hábitos, horarios, ajustes y respuestas. Usa upsert con los
 * UUID del cliente, así que reintentar después de un fallo no duplica nada. El perfil (modo y
 * onboarding completo) lo actualiza después quien llama, cuando todo esto ya quedó guardado.
 */
export async function guardarPlan(
  userId: string,
  borrador: BorradorPlan,
  respuestas: Respuestas,
  ids: IdsPlan,
  /** false si la persona no dio el permiso de avisos: los hábitos quedan sin recordatorio. */
  conRecordatorios = true,
  opciones: OpcionesGuardado = {},
): Promise<void> {
  const guardarAjustes = opciones.guardarAjustes ?? true;
  const filas = filasDelPlan({
    userId,
    borrador,
    respuestas,
    ids,
    categorias: await categoriasDelSistema(),
    hoy: fechaLocal(),
    conRecordatorios,
  });

  // Todo va en un solo lote: o se guarda el plan completo o nada. El orden importa: las políticas
  // RLS revisan que el plan y el hábito ya existan.
  const operaciones = [
    { operacion: 'upsert', tabla: 'plans', filas: filas.plans },
    { operacion: 'upsert', tabla: 'habits', filas: filas.habits },
    { operacion: 'upsert', tabla: 'habit_schedules', filas: filas.schedules },
    ...(filas.microPasos.length > 0
      ? [
          {
            operacion: 'upsert',
            tabla: 'micro_pasos',
            filas: filas.microPasos,
            enConflicto: ['habit_id', 'orden'],
          },
        ]
      : []),
    ...(guardarAjustes
      ? [
          {
            operacion: 'upsert',
            tabla: 'user_settings',
            filas: [filas.settings],
            enConflicto: ['user_id'],
          },
          {
            operacion: 'upsert',
            tabla: 'onboarding_answers',
            filas: [filas.answers],
            enConflicto: ['user_id'],
          },
        ]
      : []),
    ...(opciones.presupuestoMin !== undefined
      ? [
          {
            operacion: 'update',
            tabla: 'user_settings',
            clave: { user_id: userId },
            cambios: { presupuesto_min: opciones.presupuestoMin },
          },
        ]
      : []),
  ];
  await pedirApi('/sync/lote', { metodo: 'POST', cuerpo: { operaciones } });
}

// --- Mis planes (Perfil) ---------------------------------------------------------------------

export type MiPlan = {
  id: string;
  area: Area;
  /** Hábitos del plan que no se han eliminado (también los pausados). */
  habitos: { id: string; titulo: string; activo: boolean }[];
};

/** Planes activos del usuario, del más antiguo al más nuevo, con sus hábitos. Lee SQLite. */
export async function leerMisPlanes(userId: string): Promise<MiPlan[]> {
  const db = await getDb();
  const planes = await leerFilas<{ id: string; area: string | null }>(
    db,
    'plans',
    'user_id = ? AND activo = 1 ORDER BY creado_en',
    [userId],
  );
  const habitos = await leerFilas<Habito>(
    db,
    'habits',
    'plan_id IS NOT NULL AND archivado_en IS NULL ORDER BY created_at',
  );
  return planes.flatMap((p) =>
    (AREAS as readonly (string | null)[]).includes(p.area)
      ? [
          {
            id: p.id,
            area: p.area as Area,
            habitos: habitos
              .filter((h) => h.plan_id === p.id)
              .map((h) => ({ id: h.id, titulo: h.titulo, activo: h.activo })),
          },
        ]
      : [],
  );
}

/**
 * Respuestas globales del formulario (P4 a P7) para un plan siguiente, o null si nunca hizo el
 * formulario (empezó creando sus hábitos): entonces su primer plan pregunta los 7 pasos. Las de la
 * versión 3 (un momento y un obstáculo) se convierten al leerlas.
 */
export async function leerGlobalesFormulario(userId: string): Promise<Globales | null> {
  const db = await getDb();
  const [fila] = await leerFilas<{ respuestas: unknown }>(db, 'onboarding_answers', 'user_id = ?', [
    userId,
  ]);
  const globales = globalesSchema.safeParse(fila?.respuestas);
  return globales.success ? globales.data : null;
}

/** Un hábito del plan pasa a ser propio. Objetivo y nivel van juntos: la base los pide a los dos. */
const COMO_PROPIO = {
  plan_id: null,
  objetivo: null,
  nivel: null,
  nivel_desde: null,
  usa_duracion_reducida: false,
};

async function volverPropio(
  db: SQLiteDatabase,
  habitId: string,
  ahora: string,
): Promise<OperacionOutbox> {
  await actualizarFila(db, 'habits', { id: habitId }, { ...COMO_PROPIO, updated_at: ahora });
  return { operacion: 'update', tabla: 'habits', clave: habitId, payload: COMO_PROPIO };
}

/**
 * «Sacar del plan» (decisión del usuario): el hábito pasa a ser propio, con su historial, y ya no
 * sube ni baja de nivel. Si era el último hábito del plan, el plan se termina. Funciona sin conexión.
 */
export async function sacarDelPlan(userId: string, habitId: string): Promise<void> {
  await aplicar(async (db) => {
    const ahora = new Date().toISOString();
    const [habito] = await leerFilas<Habito>(db, 'habits', 'id = ?', [habitId]);
    const planId = habito?.plan_id;
    if (!planId) return [];
    const operaciones: OperacionOutbox[] = [await volverPropio(db, habitId, ahora)];
    await quitarTarjetasDePlan(db, userId, planId, habitId);
    const quedan = await leerFilas<Habito>(db, 'habits', 'plan_id = ? AND archivado_en IS NULL', [
      planId,
    ]);
    if (quedan.length === 0) {
      await actualizarFila(db, 'plans', { id: planId }, { activo: false, updated_at: ahora });
      operaciones.push({
        operacion: 'update',
        tabla: 'plans',
        clave: planId,
        payload: { activo: false },
      });
      await quitarTarjetasDePlan(db, userId, planId);
    }
    return operaciones;
  });
}

/**
 * «Terminar plan» (decisión del usuario): el plan queda inactivo y sus hábitos pasan a ser propios,
 * con su historial, racha y planta. Ya no suben ni bajan de nivel. Funciona sin conexión: se
 * guarda en SQLite y se sube con la cola. Sus tarjetas de progresión pendientes se quitan.
 */
export async function terminarPlan(userId: string, planId: string): Promise<void> {
  await aplicar(async (db) => {
    const ahora = new Date().toISOString();
    const habitos = await leerFilas<Habito>(db, 'habits', 'plan_id = ?', [planId]);
    const operaciones: OperacionOutbox[] = [];
    for (const h of habitos) operaciones.push(await volverPropio(db, h.id, ahora));
    await actualizarFila(db, 'plans', { id: planId }, { activo: false, updated_at: ahora });
    operaciones.push({
      operacion: 'update',
      tabla: 'plans',
      clave: planId,
      payload: { activo: false },
    });
    await quitarTarjetasDePlan(db, userId, planId);
    return operaciones;
  });
}
