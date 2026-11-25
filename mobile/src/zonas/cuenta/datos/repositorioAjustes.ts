/**
 * @file repositorioAjustes.ts
 * @proyecto most.
 * @descripcion Capa de datos de los ajustes del usuario (`user_settings`) y de `app_config`: los lee
 *   de SQLite con sus valores por defecto (modelo común) y guarda los cambios de Perfil con la cola
 *   de salida (funciona sin conexión). Los cálculos (minutos por día, límite de duración) viven en
 *   servicioAjustes.
 * @autor Equipo most. (código heredado de Habit Green; reorganizado por Allan con Claude Code)
 * @fecha 2026-11-24
 * @version 1.1.0
 * @historial 1.1.0 (2026-11-24): pasa a zonas/cuenta/datos (antes db/settings-repository.ts).
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import {
  AVISOS_POR_DEFECTO,
  HORAS_POR_DEFECTO,
  PROGRESION_POR_DEFECTO,
  type ConfigAvisos,
  type ConfigProgresion,
  type HorasAvisos,
  type MomentoAviso,
} from '@/comun/modelo/configuracion';
import {
  ACOMPANAMIENTOS,
  OBSTACULOS,
  TIEMPOS,
  type Acompanamiento,
  type Obstaculo,
  type Tiempo,
} from '@/comun/modelo/esquemas/onboarding';
import { aplicar } from '@/comun/datos/aplicar-cambio';
import { actualizarFila, getDb, leerFilas } from '@/comun/datos/database';

// Ajustes del usuario (`user_settings`). Se crean al confirmar el plan de la encuesta (UC-01); al
// llegar a las pestañas, la sincronización los descarga a SQLite junto con `app_config`, y desde
// ahí se leen. Lo que se
// cambia en Perfil se guarda en el teléfono y se sube con la cola, así que funciona sin conexión.

const MOMENTOS_AVISO = Object.keys(HORAS_POR_DEFECTO) as MomentoAviso[];
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Solo las horas válidas de un objeto que llega de la base (puede venir incompleto o nulo). */
function horasValidas(valor: unknown): Partial<HorasAvisos> {
  if (typeof valor !== 'object' || valor === null) return {};
  const fuente = valor as Record<string, unknown>;
  const horas: Partial<HorasAvisos> = {};
  for (const momento of MOMENTOS_AVISO) {
    const hora = fuente[momento];
    if (typeof hora === 'string' && HORA.test(hora.slice(0, 5))) horas[momento] = hora.slice(0, 5);
  }
  return horas;
}

async function leerValorConfig(db: SQLiteDatabase, clave: string): Promise<unknown> {
  const [fila] = await leerFilas<{ valor: unknown }>(db, 'app_config', 'clave = ?', [clave]);
  return fila?.valor ?? null;
}

/** `app_config.notificaciones`, con valores por defecto si aún no se descarga. */
export async function leerConfigAvisos(db: SQLiteDatabase): Promise<ConfigAvisos> {
  const valor = await leerValorConfig(db, 'notificaciones');
  const fuente =
    typeof valor === 'object' && valor !== null ? (valor as Partial<ConfigAvisos>) : {};
  return { ...AVISOS_POR_DEFECTO, ...fuente };
}

/** `app_config.progresion` (SDD 6.3), con valores por defecto si aún no se descarga. */
export async function leerConfigProgresion(db: SQLiteDatabase): Promise<ConfigProgresion> {
  const valor = await leerValorConfig(db, 'progresion');
  const fuente = (typeof valor === 'object' && valor !== null ? valor : {}) as Record<
    string,
    unknown
  >;
  const config = { ...PROGRESION_POR_DEFECTO };
  for (const clave of Object.keys(config) as (keyof ConfigProgresion)[]) {
    if (typeof fuente[clave] === 'number') config[clave] = fuente[clave];
  }
  return config;
}

/** `app_config.presupuestos` (minutos por respuesta de la P4), o los del SDD. */
export async function leerPresupuestos(db: SQLiteDatabase): Promise<Record<Tiempo, number>> {
  const valor = await leerValorConfig(db, 'presupuestos');
  const fuente = (typeof valor === 'object' && valor !== null ? valor : {}) as Record<
    string,
    unknown
  >;
  const presupuestos: Record<Tiempo, number> = {
    menos_10: 10,
    '10_20': 20,
    '20_40': 40,
    mas_40: 60,
  };
  for (const clave of TIEMPOS) {
    if (typeof fuente[clave] === 'number') presupuestos[clave] = fuente[clave];
  }
  return presupuestos;
}

export type Ajustes = {
  presupuestoMin: number;
  estilo: Acompanamiento;
  estrategias: Obstaculo[];
  segundoAviso: boolean;
  /** RF-18: resumen nocturno con lo de mañana, además del estilo elegido. */
  resumenNocturno: boolean;
  /** Las horas de Perfil sobre las de `app_config`. */
  horas: HorasAvisos;
};

type FilaAjustes = {
  presupuesto_min: number;
  estilo_notificaciones: string;
  estrategias: unknown;
  segundo_aviso: boolean;
  resumen_nocturno?: boolean | null;
  horas_por_momento: unknown;
};

export async function leerAjustesEn(db: SQLiteDatabase, userId: string): Promise<Ajustes | null> {
  const [fila] = await leerFilas<FilaAjustes>(db, 'user_settings', 'user_id = ?', [userId]);
  if (!fila) return null;
  const base = horasValidas(await leerValorConfig(db, 'horas_por_momento'));
  const estrategias = Array.isArray(fila.estrategias) ? fila.estrategias : [];
  return {
    presupuestoMin: fila.presupuesto_min,
    estilo: (ACOMPANAMIENTOS as readonly string[]).includes(fila.estilo_notificaciones)
      ? (fila.estilo_notificaciones as Acompanamiento)
      : 'recordatorio_suave',
    estrategias: estrategias.filter((e): e is Obstaculo =>
      (OBSTACULOS as readonly string[]).includes(String(e)),
    ),
    segundoAviso: fila.segundo_aviso,
    resumenNocturno: fila.resumen_nocturno === true,
    horas: { ...HORAS_POR_DEFECTO, ...base, ...horasValidas(fila.horas_por_momento) },
  };
}

export async function leerAjustes(userId: string): Promise<Ajustes | null> {
  return leerAjustesEn(await getDb(), userId);
}

export type CambiosAjustes = Partial<{
  presupuesto_min: number;
  estilo_notificaciones: Acompanamiento;
  segundo_aviso: boolean;
  resumen_nocturno: boolean;
  horas_por_momento: HorasAvisos;
}>;

/** Cambia ajustes desde Perfil: se guardan en el teléfono y se suben con la cola (SDD 3.4). */
export async function guardarAjustes(userId: string, cambios: CambiosAjustes): Promise<void> {
  await aplicar(async (db) => {
    await actualizarFila(
      db,
      'user_settings',
      { user_id: userId },
      { ...cambios, updated_at: new Date().toISOString() },
    );
    return [{ operacion: 'update', tabla: 'user_settings', clave: userId, payload: cambios }];
  });
}

export type AjustesLocales = {
  estiloNotificaciones: string | null;
  /** Hora de «Mañana» en Perfil: con ella empiezan los hábitos nuevos. */
  horaManana: string;
  /** Hora de cada momento (Perfil sobre los valores por defecto). */
  horas: HorasAvisos;
  /** Saldo del monedero; 0 hasta que lleguen las recompensas (Entrega 4). */
  saldo: number;
};

/** Ajustes y saldo desde SQLite, para Hoy y el formulario de hábito (funciona sin conexión). */
export async function leerAjustesLocales(userId: string): Promise<AjustesLocales> {
  const db = await getDb();
  const ajustes = await leerAjustesEn(db, userId);
  const monedero = await db.getFirstAsync<{ saldo: number }>(
    'SELECT saldo FROM wallets WHERE user_id = ?',
    [userId],
  );
  return {
    estiloNotificaciones: ajustes?.estilo ?? null,
    horaManana: ajustes?.horas.manana ?? HORAS_POR_DEFECTO.manana,
    horas: { ...HORAS_POR_DEFECTO, ...ajustes?.horas },
    saldo: monedero?.saldo ?? 0,
  };
}
