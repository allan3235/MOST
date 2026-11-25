/**
 * @file servicioRegistros.ts
 * @proyecto most.
 * @descripcion Servicio de marcar y desmarcar hábitos (SDD 6.1, RF-08, RI-04): guarda el registro,
 *   aplica las recompensas (XP de la planta y monedas, con su tope) y lo deja en la cola de salida
 *   en una sola transacción; también marca desde la notificación. El SQL propio vive en
 *   repositorioRegistros.
 * @autor Equipo most. (código heredado de Habit Green; reorganizado por Allan con Claude Code)
 * @fecha 2026-11-24
 * @version 2.0.0
 * @historial 2.0.0 (2026-11-24): pasa a zonas/habitos/logica (antes db/logs-repository.ts) y saca
 *   el SQL a la capa de datos.
 */

import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  aplicarCompletar,
  aplicarDeshacer,
  RECOMPENSAS_POR_DEFECTO,
  type ConfigRecompensas,
  type EstadoDia,
  type LogDelDia,
  type ResultadoRecompensa,
} from '@/zonas/plantas/logica/recompensas';
import { fechaLocal } from '@/comun/util/dates';
import { pedirSincronizacion } from '@/comun/logica/sync/sync-engine';

import {
  actualizarFila,
  enTransaccion,
  getDb,
  guardarFilas,
  leerFilas,
} from '@/comun/datos/database';
import { avisarCambioLocal } from '@/comun/datos/db-version-store';
import { encolar } from '@/comun/datos/outbox';

import {
  leerDeshechosSinDevolver,
  leerHabitoParaMarcar,
  leerPlanta,
  leerRegistroDelDia,
  leerSaldo,
  leerUltimaFechaRegistro,
} from '../datos/repositorioRegistros';

// Check-ins (habit_logs) con sus recompensas (SDD 6.1). Se marcan y se deshacen solo para hoy
// (definición 6). En el teléfono se calcula al momento lo mismo que hará el servidor (XP de la
// planta, monedas y topes) y se guarda junto con la operación en la cola; al sincronizar, las
// RPC complete_habit y uncomplete_habit deciden y sus valores reemplazan a los locales.

type HabitoCheck = { id: string; category_id: string };

/** La fecha del teléfono es anterior al último registro: se atrasó el reloj. */
export class RelojAtrasadoError extends Error {}

export type ResultadoCheckIn = {
  /** Monedas que dio. */
  monedas: number;
  /** Por qué no dio monedas: tope del día, o ya pagó hoy y no se devolvió. */
  sinMonedas: ResultadoRecompensa['sinMonedas'];
  /** Fase nueva de la planta, si cambió. */
  cambioFase: number | null;
};

function revisarQueSeaHoy(fecha: string): void {
  if (fecha !== fechaLocal()) throw new Error('Solo se puede marcar el hábito de hoy');
}

export async function leerConfig(db: SQLiteDatabase): Promise<ConfigRecompensas> {
  const [fila] = await leerFilas<{ valor: Partial<ConfigRecompensas> }>(
    db,
    'app_config',
    "clave = 'recompensas'",
  );
  return { ...RECOMPENSAS_POR_DEFECTO, ...fila?.valor };
}

export async function leerEstado(
  db: SQLiteDatabase,
  userId: string,
  categoryId: string,
  fecha: string,
): Promise<EstadoDia> {
  const planta = await leerPlanta(db, userId, categoryId);
  const saldo = await leerSaldo(db, userId);
  const logs = await leerFilas<LogDelDia>(
    db,
    'habit_logs',
    'user_id = ? AND fecha = ? AND eliminado_en IS NULL',
    [userId, fecha],
  );
  return {
    planta: planta ?? { xp: 0, nivel: 0, fase: 1 },
    saldo,
    logs,
    deshechosSinDevolver: await leerDeshechosSinDevolver(db, userId, fecha),
  };
}

async function guardarPlantaYSaldo(
  db: SQLiteDatabase,
  userId: string,
  categoryId: string,
  estado: EstadoDia,
  ahora: string,
): Promise<void> {
  await guardarFilas(db, 'plant_progress', [
    { user_id: userId, category_id: categoryId, ...estado.planta, updated_at: ahora },
  ]);
  await guardarFilas(db, 'wallets', [{ user_id: userId, saldo: estado.saldo, updated_at: ahora }]);
}

export async function completarHabito(
  userId: string,
  habito: HabitoCheck,
  fecha: string,
): Promise<ResultadoCheckIn | null> {
  revisarQueSeaHoy(fecha);
  const db = await getDb();
  // null: ya estaba completado (por ejemplo, un doble toque) y no cambió nada.
  let resultado: ResultadoCheckIn | null = null;
  await enTransaccion(db, async () => {
    const estado = await leerEstado(db, userId, habito.category_id, fecha);
    if (estado.logs.some((l) => l.habit_id === habito.id)) return;

    // Atrasar el reloj no permite marcar días pasados (el servidor tampoco les da recompensas).
    const ultimo = await leerUltimaFechaRegistro(db, userId);
    if (ultimo && ultimo > fecha) throw new RelojAtrasadoError();

    // Si ya hubo un registro ese día (marcado y deshecho), se reutiliza su id y su marca de pago.
    const previo = await leerRegistroDelDia(db, habito.id, fecha);
    const ahora = new Date().toISOString();
    const nuevo: LogDelDia = {
      id: previo?.id ?? randomUUID(),
      habit_id: habito.id,
      category_id: habito.category_id,
      completado_en: ahora,
      xp_otorgado: false,
      monedas_otorgadas: false,
      monedas_sin_devolver: previo?.monedas_sin_devolver === 1,
    };
    const r = aplicarCompletar(estado, nuevo, await leerConfig(db));
    const guardado = r.estado.logs.find((l) => l.habit_id === habito.id) ?? nuevo;

    await guardarFilas(db, 'habit_logs', [
      {
        ...guardado,
        user_id: userId,
        fecha,
        estado: 'hecho',
        updated_at: ahora,
        eliminado_en: null,
      },
    ]);
    await guardarPlantaYSaldo(db, userId, habito.category_id, r.estado, ahora);
    await encolar(db, {
      operacion: 'complete',
      tabla: 'habit_logs',
      clave: `${habito.id}|${fecha}`,
      payload: { log_id: nuevo.id, habit_id: habito.id, fecha },
    });
    resultado = {
      monedas: r.estado.saldo - estado.saldo,
      sinMonedas: r.sinMonedas,
      cambioFase: r.cambioFase,
    };
  });
  avisarCambioLocal();
  pedirSincronizacion();
  return resultado;
}

export async function deshacerHabito(
  userId: string,
  habito: HabitoCheck,
  fecha: string,
): Promise<void> {
  revisarQueSeaHoy(fecha);
  const db = await getDb();
  await enTransaccion(db, async () => {
    const estado = await leerEstado(db, userId, habito.category_id, fecha);
    const r = aplicarDeshacer(estado, habito.id, await leerConfig(db));
    const ahora = new Date().toISOString();

    await actualizarFila(
      db,
      'habit_logs',
      { habit_id: habito.id, fecha },
      {
        eliminado_en: ahora,
        updated_at: ahora,
        xp_otorgado: false,
        monedas_otorgadas: false,
        monedas_sin_devolver: r.estado.deshechosSinDevolver.includes(habito.id),
      },
    );
    // Otros registros del día que recibieron el XP o las monedas que se liberaron.
    for (const log of r.estado.logs) {
      const antes = estado.logs.find((l) => l.id === log.id);
      if (
        antes &&
        (antes.xp_otorgado !== log.xp_otorgado || antes.monedas_otorgadas !== log.monedas_otorgadas)
      ) {
        await actualizarFila(
          db,
          'habit_logs',
          { habit_id: log.habit_id, fecha },
          { xp_otorgado: log.xp_otorgado, monedas_otorgadas: log.monedas_otorgadas },
        );
      }
    }
    await guardarPlantaYSaldo(db, userId, habito.category_id, r.estado, ahora);
    await encolar(db, {
      operacion: 'uncomplete',
      tabla: 'habit_logs',
      clave: `${habito.id}|${fecha}`,
      payload: { habit_id: habito.id, fecha },
    });
  });
  avisarCambioLocal();
  pedirSincronizacion();
}

/** Resultado de «Hecho» en un aviso (RI-04). */
export type ResultadoDesdeAviso = 'hecho' | 'ya_estaba' | 'otro_dia' | 'sin_habito';

/**
 * «Hecho» desde la notificación de un hábito (RI-04): lo marca igual que en Hoy (recompensas y
 * cola incluidas). Un aviso de otro día no marca nada: solo se puede marcar el día de hoy.
 * @param userId Usuario con sesión.
 * @param habitId Hábito del aviso.
 * @param fechaAviso Fecha "YYYY-MM-DD" para la que era el aviso.
 * @returns Qué pasó.
 */
export async function completarDesdeAviso(
  userId: string,
  habitId: string,
  fechaAviso: string,
): Promise<ResultadoDesdeAviso> {
  const hoy = fechaLocal();
  if (fechaAviso !== hoy) {
    return 'otro_dia';
  }
  const db = await getDb();
  const habito = await leerHabitoParaMarcar(db, habitId, userId);
  if (!habito) {
    return 'sin_habito';
  }
  const resultado = await completarHabito(userId, habito, hoy);
  return resultado === null ? 'ya_estaba' : 'hecho';
}
