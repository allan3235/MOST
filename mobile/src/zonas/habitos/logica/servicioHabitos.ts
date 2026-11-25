/**
 * @file servicioHabitos.ts
 * @proyecto most.
 * @descripcion Servicio de la zona Hábitos (SDD 3.4, 6.5): leer los hábitos y los de hoy, crear,
 *   editar (versionando el horario), pausar, archivar y cambiar la hora del recordatorio, con las
 *   reglas de presupuesto, límite de hábitos y recompensas. Cada cambio guarda la fila y su
 *   operación de la cola en una transacción (funciona sin conexión). El SQL propio vive en
 *   repositorioHabitos; las tablas comunes, en comun/datos.
 * @autor Equipo most. (código heredado de Habit Green; reorganizado por Allan con Claude Code)
 * @fecha 2026-11-24
 * @version 2.0.0
 * @historial 2.0.0 (2026-11-24): pasa a zonas/habitos/logica (antes db/habits-repository.ts) y
 *   saca el SQL a la capa de datos.
 */

import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  estaVisible,
  habitosDelDia,
  horarioDeReferencia,
  horarioVigente,
  type Habito,
  type HabitoDelDia,
  type Horario,
  type Ocurrencia,
  type Registro,
} from './habitos-del-dia';
import { nuevaVersionHorario, type VersionHorario } from './horario';
import { alcanzoLimiteHabitos, limiteHabitos } from './limite-habitos';
import { ajustePresupuesto, minutosPorDia } from './presupuesto';
import { aplicarArchivar } from '@/zonas/plantas/logica/recompensas';
import { fechaLocal, sumarDias } from '@/comun/util/dates';
import { type Area } from '@/comun/modelo/esquemas/onboarding';
import type { HabitoFormValues } from './esquema-habito';
import type { OperacionOutbox } from '@/comun/logica/sync/sync-rules';

import { aplicar } from '@/comun/datos/aplicar-cambio';
import {
  categoriasPorId,
  contarHabitosActivos,
  idCategoria,
  leerDuenoHabito,
  leerLimitesPlan,
  leerPresupuesto,
} from '../datos/repositorioHabitos';
import { actualizarFila, getDb, guardarFilas, leerFilas } from '@/comun/datos/database';
import { leerConfig, leerEstado } from './servicioRegistros';
import { contarHechosDelPaso } from '@/zonas/plantas/datos/repositorioHitos';
import { avanceDelPaso, type AvancePaso } from '@/zonas/plantas/logica/hitos';
import type { MicroPasoLocal } from '@/zonas/reajuste/logica/progresion';
import { descartarMovidasDelPatron } from '@/zonas/reajuste/logica/servicioReprogramacion';

// Repositorio de hábitos (SDD 3.4). Todo se lee y se escribe en SQLite, así que funciona sin
// conexión. Cada cambio guarda la fila local y su operación en la cola de salida dentro de la
// misma transacción; después se avisa a la UI y se pide sincronizar.

export type HabitoConHorario = {
  habito: Habito;
  /** Horario de hoy, o el próximo si el hábito todavía no empieza (o el último si ya terminó). */
  horario: Horario | undefined;
  categoria: Area;
  /** Fecha de inicio del hábito: el primer día de su primer horario. */
  inicio: string | null;
  /** Toca hoy (para la casilla de la pantalla Hábitos) y si ya está hecho. */
  programadoHoy: boolean;
  hecho: boolean;
};

export type HoyLocal = {
  fecha: string;
  items: (HabitoDelDia & { categoria: Area })[];
  /** Hay al menos un hábito visible (para distinguir «sin hábitos» de «nada hoy»). */
  tieneHabitos: boolean;
};

function primerDia(horarios: readonly Horario[]): string | null {
  return horarios.reduce<string | null>(
    (min, h) => (min === null || h.vigente_desde < min ? h.vigente_desde : min),
    null,
  );
}

/** Hábitos sin archivar, con su horario, su categoría y si tocan hoy. */
export async function leerHabitos(): Promise<HabitoConHorario[]> {
  const db = await getDb();
  const hoy = fechaLocal();
  const [habitos, horarios, ocurrencias, registros, categorias] = await Promise.all([
    leerFilas<Habito>(db, 'habits', 'archivado_en IS NULL ORDER BY created_at'),
    leerFilas<Horario>(db, 'habit_schedules'),
    leerFilas<Ocurrencia>(db, 'habit_occurrences', 'fecha_original = ? OR fecha_nueva = ?', [
      hoy,
      hoy,
    ]),
    leerFilas<Registro>(db, 'habit_logs', 'fecha = ?', [hoy]),
    categoriasPorId(db),
  ]);
  const deHoy = new Map(
    habitosDelDia(hoy, habitos, horarios, ocurrencias, registros).map((i) => [i.habito.id, i]),
  );
  return habitos.flatMap((habito) => {
    const categoria = categorias.get(habito.category_id);
    if (categoria === undefined) return [];
    const propios = horarios.filter((h) => h.habit_id === habito.id);
    const item = deHoy.get(habito.id);
    return [
      {
        habito,
        categoria,
        horario: horarioDeReferencia(propios, hoy),
        inicio: primerDia(propios),
        programadoHoy: item !== undefined,
        hecho: item?.hecho ?? false,
      },
    ];
  });
}

export async function leerHabito(id: string): Promise<HabitoConHorario | null> {
  return (await leerHabitos()).find((h) => h.habito.id === id) ?? null;
}

export type VistaHabito = HabitoConHorario & {
  /** Micro-pasos en orden (vacío si el hábito no tiene secuencia). */
  pasos: MicroPasoLocal[];
  /** Veces hechas del paso en curso (RF-16), o null sin secuencia. */
  avance: AvancePaso | null;
};

/**
 * Vista previa de un hábito (al tocarlo en Hábitos): sus datos, sus micro-pasos y en cuál va.
 * Solo lee; editar sigue en el menú ⋮.
 * @param id Hábito.
 * @returns La vista, o null si el hábito ya no existe.
 */
export async function leerVistaHabito(id: string): Promise<VistaHabito | null> {
  const item = await leerHabito(id);
  if (!item) return null;
  const db = await getDb();
  const pasos = await leerFilas<MicroPasoLocal>(db, 'micro_pasos', 'habit_id = ? ORDER BY orden', [
    id,
  ]);
  const avance =
    pasos.length > 0
      ? avanceDelPaso(await contarHechosDelPaso(id, item.habito.nivel_desde ?? null))
      : null;
  return { ...item, pasos, avance };
}

/** Hábitos de hoy para la pantalla Hoy. */
export async function leerHoy(): Promise<HoyLocal> {
  const db = await getDb();
  const fecha = fechaLocal();
  const [habitos, horarios, ocurrencias, registros, categorias] = await Promise.all([
    leerFilas<Habito>(db, 'habits', 'archivado_en IS NULL'),
    leerFilas<Horario>(db, 'habit_schedules'),
    leerFilas<Ocurrencia>(db, 'habit_occurrences', 'fecha_original = ? OR fecha_nueva = ?', [
      fecha,
      fecha,
    ]),
    leerFilas<Registro>(db, 'habit_logs', 'fecha = ?', [fecha]),
    categoriasPorId(db),
  ]);
  const items = habitosDelDia(fecha, habitos, horarios, ocurrencias, registros).flatMap((item) => {
    const categoria = categorias.get(item.habito.category_id);
    return categoria === undefined ? [] : [{ ...item, categoria }];
  });
  return { fecha, items, tieneHabitos: habitos.some(estaVisible) };
}

/**
 * Si los hábitos visibles (con el cambio aplicado) superan el presupuesto en algún día, lo sube
 * a esa suma (SDD 6.5). Devuelve el presupuesto nuevo, o null si no cambió o no se conoce.
 */
async function subirPresupuestoSiHaceFalta(
  db: SQLiteDatabase,
  userId: string,
  cargas: { habitId: string; duracion_min: number; dias_semana: number[] },
): Promise<{ presupuesto: number; operacion: OperacionOutbox } | null> {
  const presupuestoActual = await leerPresupuesto(db, userId);
  if (presupuestoActual === null) return null;
  const ajustes = { presupuesto_min: presupuestoActual };

  const otros = (await leerHabitosEn(db)).filter(
    (h) => h.habito.id !== cargas.habitId && estaVisible(h.habito) && h.horario !== undefined,
  );
  const minutos = minutosPorDia([
    ...otros.map((h) => ({
      duracion_min: h.habito.duracion_min,
      dias_semana: h.horario?.dias_semana ?? [],
    })),
    { duracion_min: cargas.duracion_min, dias_semana: cargas.dias_semana },
  ]);
  const { excede, nuevoPresupuesto } = ajustePresupuesto(ajustes.presupuesto_min, minutos);
  if (!excede) return null;

  const cambios = { presupuesto_min: nuevoPresupuesto, updated_at: new Date().toISOString() };
  await actualizarFila(db, 'user_settings', { user_id: userId }, cambios);
  return {
    presupuesto: nuevoPresupuesto,
    operacion: {
      operacion: 'update',
      tabla: 'user_settings',
      clave: userId,
      payload: { presupuesto_min: nuevoPresupuesto },
    },
  };
}

// leerHabitos dentro de una transacción ya abierta (misma conexión).
async function leerHabitosEn(db: SQLiteDatabase): Promise<{ habito: Habito; horario?: Horario }[]> {
  const hoy = fechaLocal();
  const habitos = await leerFilas<Habito>(db, 'habits', 'archivado_en IS NULL');
  const horarios = await leerFilas<Horario>(db, 'habit_schedules');
  return habitos.map((habito) => ({
    habito,
    horario: horarioVigente(
      horarios.filter((h) => h.habit_id === habito.id),
      hoy,
    ),
  }));
}

/**
 * Guarda una versión nueva del horario (`nuevaVersionHorario`): cierra la anterior si hace falta y
 * guarda la vigente. Devuelve sus operaciones de la cola; nada si el horario no cambió.
 */
export async function guardarVersionHorario(
  db: SQLiteDatabase,
  userId: string,
  version: VersionHorario | null,
): Promise<OperacionOutbox[]> {
  if (!version) return [];
  const operaciones: OperacionOutbox[] = [];
  if (version.cerrar) {
    const { id: cerrarId, vigente_hasta } = version.cerrar;
    await actualizarFila(db, 'habit_schedules', { id: cerrarId }, { vigente_hasta });
    operaciones.push({
      operacion: 'update',
      tabla: 'habit_schedules',
      clave: cerrarId,
      payload: { vigente_hasta },
    });
  }
  const horario = { ...version.guardar, user_id: userId };
  await guardarFilas(db, 'habit_schedules', [{ ...horario, updated_at: new Date().toISOString() }]);
  operaciones.push({
    operacion: 'upsert',
    tabla: 'habit_schedules',
    clave: horario.id,
    payload: horario,
  });
  return operaciones;
}

export type ResultadoGuardar = { presupuestoNuevo: number | null };

/** Crea un hábito manual (sin plan ni progresión, SDD 6.5) con su primer horario. */
/** Un micro-paso para crear junto con el hábito («Crear meta», RF-03). */
export type MicroPasoNuevo = {
  orden: number;
  titulo: string;
  descripcion: string;
  duracion_min: number;
  duracion_reducida_min: number;
  dias_semana: number[];
};

/**
 * Crea un hábito propio con su horario. Con `microPasos` (de «Crear meta») guarda también su
 * secuencia y empieza en el paso 1.
 */
export async function crearHabito(
  userId: string,
  valores: HabitoFormValues,
  microPasos: readonly MicroPasoNuevo[] = [],
): Promise<ResultadoGuardar> {
  let presupuestoNuevo: number | null = null;
  await aplicar(async (db) => {
    const ahora = new Date().toISOString();
    const habito = {
      id: randomUUID(),
      user_id: userId,
      category_id: await idCategoria(db, valores.categoria),
      plan_id: null,
      objetivo: null,
      nivel: null,
      usa_duracion_reducida: false,
      titulo: valores.nombre,
      descripcion: valores.descripcion,
      duracion_min: valores.duracion,
      paso_actual: microPasos.length > 0 ? 1 : null,
      activo: true,
      archivado_en: null,
    };
    const horario = {
      id: randomUUID(),
      habit_id: habito.id,
      user_id: userId,
      dias_semana: valores.dias_semana,
      hora: valores.hora,
      flexible: false,
      notificar: valores.notificar,
      vigente_desde: valores.fecha_inicio,
      vigente_hasta: valores.fecha_fin,
    };
    await guardarFilas(db, 'habits', [{ ...habito, created_at: ahora, updated_at: ahora }]);
    await guardarFilas(db, 'habit_schedules', [{ ...horario, updated_at: ahora }]);
    const pasos = microPasos.map((paso) => ({
      id: randomUUID(),
      habit_id: habito.id,
      user_id: userId,
      ...paso,
    }));
    if (pasos.length > 0) {
      await guardarFilas(
        db,
        'micro_pasos',
        pasos.map((paso) => ({ ...paso, updated_at: ahora })),
      );
    }

    const presupuesto = await subirPresupuestoSiHaceFalta(db, userId, {
      habitId: habito.id,
      duracion_min: habito.duracion_min,
      dias_semana: horario.dias_semana,
    });
    presupuestoNuevo = presupuesto?.presupuesto ?? null;

    // El hábito va primero: la política de RLS del horario revisa que el hábito exista.
    return [
      { operacion: 'upsert', tabla: 'habits', clave: habito.id, payload: habito },
      { operacion: 'upsert', tabla: 'habit_schedules', clave: horario.id, payload: horario },
      ...pasos.map((paso): OperacionOutbox => ({
        operacion: 'upsert',
        tabla: 'micro_pasos',
        clave: paso.id,
        payload: paso,
      })),
      ...(presupuesto ? [presupuesto.operacion] : []),
    ];
  });
  return { presupuestoNuevo };
}

/** Edita nombre, descripción, duración y horario. La categoría no cambia (definición 6). */
export async function editarHabito(
  userId: string,
  id: string,
  valores: HabitoFormValues,
): Promise<ResultadoGuardar> {
  let presupuestoNuevo: number | null = null;
  await aplicar(async (db) => {
    const ahora = new Date().toISOString();
    const operaciones: OperacionOutbox[] = [];

    const cambiosHabito = {
      titulo: valores.nombre,
      descripcion: valores.descripcion,
      duracion_min: valores.duracion,
    };
    await actualizarFila(db, 'habits', { id }, { ...cambiosHabito, updated_at: ahora });
    operaciones.push({ operacion: 'update', tabla: 'habits', clave: id, payload: cambiosHabito });

    const horarios = await leerFilas<Horario>(db, 'habit_schedules', 'habit_id = ?', [id]);
    const hoyLocal = fechaLocal();
    const actual = horarioDeReferencia(horarios, hoyLocal);
    if (actual) {
      const version = nuevaVersionHorario(
        actual,
        {
          dias_semana: valores.dias_semana,
          hora: valores.hora,
          notificar: valores.notificar,
          // La fecha de inicio solo cambia si el hábito todavía no empieza (un solo horario).
          vigente_desde:
            (primerDia(horarios) ?? hoyLocal) >= hoyLocal ? valores.fecha_inicio : undefined,
          vigente_hasta: valores.fecha_fin,
        },
        fechaLocal(),
        randomUUID(),
      );
      operaciones.push(...(await guardarVersionHorario(db, userId, version)));
    }

    // Las movidas que ahora caen en un día de su patrón ya no hacen falta (SDD 6.2).
    operaciones.push(...(await descartarMovidasDelPatron(db, id, valores.dias_semana)));

    const presupuesto = await subirPresupuestoSiHaceFalta(db, userId, {
      habitId: id,
      duracion_min: valores.duracion,
      dias_semana: valores.dias_semana,
    });
    presupuestoNuevo = presupuesto?.presupuesto ?? null;
    if (presupuesto) operaciones.push(presupuesto.operacion);
    return operaciones;
  });
  return { presupuestoNuevo };
}

/**
 * Mueve solo la hora del recordatorio de un hábito, desde hoy (D-04: sacarlo de un bloque
 * ocupado). Los días, el aviso, las fechas y el historial se quedan igual.
 * @param userId Dueño del hábito.
 * @param habitId Hábito a mover.
 * @param hora Hora nueva "HH:MM".
 */
export async function cambiarHoraRecordatorio(
  userId: string,
  habitId: string,
  hora: string,
): Promise<void> {
  await aplicar(async (db) => {
    const horarios = await leerFilas<Horario>(db, 'habit_schedules', 'habit_id = ?', [habitId]);
    const hoy = fechaLocal();
    const actual = horarioDeReferencia(horarios, hoy);
    if (!actual) return [];
    const version = nuevaVersionHorario(
      actual,
      {
        dias_semana: actual.dias_semana,
        hora,
        notificar: actual.notificar,
        vigente_hasta: actual.vigente_hasta,
      },
      hoy,
      randomUUID(),
    );
    return guardarVersionHorario(db, userId, version);
  });
}

/**
 * Pausar (activo = falso) o reanudar. Un hábito pausado no aparece en Hoy. Cada pausa queda como
 * un periodo en habit_pausas (desde hoy; al reanudar, hasta ayer), así sus días no cuentan como
 * fallo ni después de reanudar (RF-09).
 */
export async function cambiarActivo(id: string, activo: boolean): Promise<void> {
  await aplicar(async (db) => {
    const ahora = new Date().toISOString();
    const hoy = fechaLocal();
    await actualizarFila(db, 'habits', { id }, { activo, updated_at: ahora });
    const operaciones: OperacionOutbox[] = [
      { operacion: 'update', tabla: 'habits', clave: id, payload: { activo } },
    ];

    if (!activo) {
      const duenoId = await leerDuenoHabito(db, id);
      if (duenoId === null) return operaciones;
      const habito = { user_id: duenoId };
      const pausa = {
        id: randomUUID(),
        habit_id: id,
        user_id: habito.user_id,
        desde: hoy,
        hasta: null,
      };
      await guardarFilas(db, 'habit_pausas', [{ ...pausa, updated_at: ahora }]);
      operaciones.push({
        operacion: 'upsert',
        tabla: 'habit_pausas',
        clave: pausa.id,
        payload: pausa,
      });
      return operaciones;
    }

    // Al reanudar se cierra la pausa abierta: hasta ayer (hoy ya cuenta). Si se pausó hoy mismo,
    // queda vacía (hasta = desde - 1).
    const abiertas = await leerFilas<{ id: string }>(
      db,
      'habit_pausas',
      'habit_id = ? AND hasta IS NULL',
      [id],
    );
    const hasta = sumarDias(hoy, -1);
    for (const abierta of abiertas) {
      await actualizarFila(db, 'habit_pausas', { id: abierta.id }, { hasta, updated_at: ahora });
      operaciones.push({
        operacion: 'update',
        tabla: 'habit_pausas',
        clave: abierta.id,
        payload: { hasta },
      });
    }
    return operaciones;
  });
}

/**
 * «Eliminar» archiva: se oculta y su historial se conserva (definición 6). Si lo marcó hoy, devuelve
 * las monedas que le dio, hasta donde alcance el saldo (SDD 6.1). El servidor hace lo mismo con la
 * RPC archivar_habito.
 */
export async function archivarHabito(
  userId: string,
  habito: { id: string; category_id: string },
): Promise<void> {
  await aplicar(async (db) => {
    const ahora = new Date().toISOString();
    const fecha = fechaLocal();
    const estado = await leerEstado(db, userId, habito.category_id, fecha);
    const despues = aplicarArchivar(estado, habito.id, await leerConfig(db));
    if (despues !== estado) {
      await actualizarFila(
        db,
        'habit_logs',
        { habit_id: habito.id, fecha },
        { monedas_otorgadas: false, monedas_sin_devolver: true, updated_at: ahora },
      );
      await guardarFilas(db, 'wallets', [
        { user_id: userId, saldo: despues.saldo, updated_at: ahora },
      ]);
    }
    await actualizarFila(
      db,
      'habits',
      { id: habito.id },
      { archivado_en: ahora, updated_at: ahora },
    );
    return [
      {
        operacion: 'archive',
        tabla: 'habits',
        clave: habito.id,
        payload: { habit_id: habito.id, fecha },
      },
    ];
  });
}

export type CupoHabitos = { limite: number | null; alcanzado: boolean };

/**
 * ¿Puede crear otro hábito? Para el usuario guiado hay un límite que cuenta los del plan y los
 * propios y crece con las subidas de nivel de su plan (ver `limite-habitos`).
 */
export async function leerCupoHabitos(
  userId: string,
  modo: 'guiado' | 'tradicional' | null,
): Promise<CupoHabitos> {
  const db = await getDb();
  const { subidas, desbloqueado } = await leerLimitesPlan(db, userId);
  const limite = limiteHabitos({ modo, subidas, desbloqueado });
  if (limite === null) return { limite, alcanzado: false };
  return { limite, alcanzado: alcanzoLimiteHabitos(await contarHabitosActivos(db), limite) };
}
