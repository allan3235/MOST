/**
 * @file sync-engine.ts
 * @proyecto most.
 * @descripcion Sincronización con el backend de most. (SDD 3.4). Cada vuelta:
 *   0. Sale si no hay sesión (sin red, las peticiones fallan y la cola espera).
 *   1. Comprueba que la base local sea de este usuario (si no, la vacía).
 *   2. Actualiza la zona horaria del perfil, para que «hoy» nunca llegue como fecha futura.
 *   3. Sube la cola de salida en orden (POST /sync/operacion). Un rechazo definitivo (respuesta
 *      con "code") descarta la operación y refresca esa fila; sin red o con un error del servidor
 *      sin código, la cola se detiene hasta la próxima vuelta.
 *   4. Descarga lo que cambió desde el último cursor de cada tabla (GET /sync/cambios; la primera
 *      vez, todo).
 *   Solo corre una vuelta a la vez; si se pide otra mientras tanto, se hace al terminar.
 * @autor Equipo most. (heredado de Habit Green; adaptado por Allan con Claude Code)
 * @fecha 2026-11-23
 * @version 2.0.0
 * @historial 1.0.0: con Supabase. 2.0.0 (2026-11-23): con el backend NestJS (rutas /sync).
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { suscribirseAEscrituras } from '@/comun/datos/aplicar-cambio';
import { avisarCambioLocal } from '@/comun/datos/db-version-store';
import { asegurarDuenoBaseLocal, enTransaccion, getDb, guardarFilas } from '@/comun/datos/database';
import { claveDeFila, TABLAS, tablaLocal, type TablaLocal } from '@/comun/datos/local-schema';
import { leerOutbox, quitarDeOutbox, sumarIntento } from '@/comun/datos/outbox';
import { ErrorApi, ErrorSinRed, pedirApi } from '@/comun/datos/clienteApi';
import { fechaLocal, sumarDias } from '@/comun/util/dates';
import { leerSesion } from '@/comun/datos/sesionGuardada';
import { deviceTimeZone } from '@/comun/util/time-zone';

import {
  clavesPendientes,
  esRechazoDefinitivo,
  filasAplicables,
  idsCompactables,
  siguienteCursor,
  type EntradaOutbox,
} from './sync-rules';
import { useSyncStore } from './sync-store';

// ===== Tipos =====

type Fila = Record<string, unknown>;

/** Resultado de enviar una operación: null si salió bien. code null = se puede reintentar. */
type FalloEnvio = { code: string | null; message: string } | null;

// ===== Constantes =====

const PAGINA = 1000;
const DIAS_DE_HISTORIAL = 365;
/** Tablas de recompensas que se vuelven a bajar completas tras rechazar un check-in. */
const TABLAS_RECOMPENSAS = ['wallets', 'plant_progress'] as const;

// ===== Estado =====

let usuario: string | null = null;
let enCurso: Promise<void> | null = null;
let otraVuelta = false;
let temporizador: ReturnType<typeof setTimeout> | null = null;

// ===== Principal =====

/** Activa la sincronización para el usuario con sesión (o la apaga con null). */
export function configurarSync(userId: string | null): void {
  usuario = userId;
}

/** Sincroniza en cuanto se pueda, agrupando las peticiones seguidas (por ejemplo, varios checks). */
export function pedirSincronizacion(): void {
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    temporizador = null;
    void sincronizarAhora();
  }, 400);
}

export function sincronizarAhora(): Promise<void> {
  if (enCurso) {
    otraVuelta = true;
    return enCurso;
  }
  enCurso = (async () => {
    do {
      otraVuelta = false;
      if (usuario === null) return;
      await unaVuelta(usuario);
    } while (otraVuelta);
  })().finally(() => {
    enCurso = null;
  });
  return enCurso;
}

// ===== Funciones auxiliares =====

class SinRed extends Error {}

async function unaVuelta(userId: string): Promise<void> {
  const db = await getDb();
  // Si la base era de otra cuenta y se vació, las pantallas se actualizan ya, sin esperar la vuelta.
  if (await asegurarDuenoBaseLocal(userId)) avisarCambioLocal();
  // No se pregunta antes al sistema si "hay internet": Android puede decir que no aunque el backend
  // sí responda (red sin validar, red local, emulador). Se intenta y, sin red de verdad, la petición
  // falla al momento (SinRed) y la cola espera a la siguiente vuelta.
  // Sin sesión el servidor rechazaría las operaciones y se descartarían de la cola.
  if (leerSesion() === null) return;

  useSyncStore.setState({ sincronizando: true });
  try {
    await actualizarZonaHoraria(db, userId);
    await subirOutbox(db);
    await descargar(db);
    useSyncStore.setState({ ultima: new Date().toISOString(), error: null });
  } catch (error) {
    // Sin red no es un error: la cola espera a la próxima vuelta.
    const mensaje =
      error instanceof SinRed ? null : error instanceof Error ? error.message : String(error);
    if (mensaje) console.warn('[sync]', mensaje);
    useSyncStore.setState({ error: mensaje });
  } finally {
    useSyncStore.setState({ sincronizando: false });
    avisarCambioLocal();
  }
}

/**
 * Petición a la API dentro de la sincronización: un rechazo definitivo se lanza tal cual; sin red
 * o con un error sin código se lanza SinRed (se reintenta en la siguiente vuelta).
 */
async function pedirSync<T>(ruta: string, opciones: Parameters<typeof pedirApi>[1]): Promise<T> {
  try {
    return await pedirApi<T>(ruta, opciones);
  } catch (error) {
    if (error instanceof ErrorApi && esRechazoDefinitivo(error)) throw error;
    throw new SinRed(error instanceof Error ? error.message : String(error));
  }
}

async function actualizarZonaHoraria(db: SQLiteDatabase, userId: string): Promise<void> {
  const zona = deviceTimeZone();
  const perfil = await db.getFirstAsync<{ zona_horaria: string }>(
    'SELECT zona_horaria FROM profiles WHERE id = ?',
    [userId],
  );
  if (perfil?.zona_horaria === zona) return;
  const { filas } = await pedirSync<{ filas: Fila[] }>('/sync/operacion', {
    metodo: 'POST',
    cuerpo: {
      operacion: 'update',
      tabla: 'profiles',
      clave: { id: userId },
      cambios: { zona_horaria: zona },
    },
  });
  if (filas.length > 0) await guardarFilas(db, 'profiles', filas);
}

/** Cuerpo de POST /sync/operacion para una entrada de la cola. */
function cuerpoDeOperacion(entrada: EntradaOutbox): Record<string, unknown> {
  switch (entrada.operacion) {
    case 'upsert':
      return {
        operacion: 'upsert',
        tabla: entrada.tabla,
        filas: Array.isArray(entrada.payload) ? entrada.payload : [entrada.payload],
      };
    case 'update':
      return {
        operacion: 'update',
        tabla: entrada.tabla,
        clave: claveComoFiltro(tablaLocal(entrada.tabla), entrada.clave),
        cambios: entrada.payload,
      };
    case 'archive':
      return {
        operacion: 'archive',
        habit_id: entrada.payload.habit_id,
        fecha: entrada.payload.fecha,
      };
    case 'complete':
      return {
        operacion: 'complete',
        log_id: entrada.payload.log_id,
        habit_id: entrada.payload.habit_id,
        fecha: entrada.payload.fecha,
      };
    case 'uncomplete':
      return {
        operacion: 'uncomplete',
        habit_id: entrada.payload.habit_id,
        fecha: entrada.payload.fecha,
      };
  }
}

async function enviar(entrada: EntradaOutbox): Promise<FalloEnvio> {
  try {
    await pedirApi('/sync/operacion', { metodo: 'POST', cuerpo: cuerpoDeOperacion(entrada) });
    return null;
  } catch (error) {
    if (error instanceof ErrorApi) return { code: error.code, message: error.message };
    if (error instanceof ErrorSinRed) return { code: null, message: error.message };
    return { code: null, message: error instanceof Error ? error.message : String(error) };
  }
}

async function subirOutbox(db: SQLiteDatabase): Promise<void> {
  let cola = await leerOutbox(db);
  const compactables = idsCompactables(cola);
  if (compactables.length > 0) {
    await quitarDeOutbox(db, compactables);
    cola = cola.filter((e) => !compactables.includes(e.id));
  }

  for (const entrada of cola) {
    const error = await enviar(entrada);
    if (!error) {
      await quitarDeOutbox(db, [entrada.id]);
    } else if (esRechazoDefinitivo(error)) {
      console.warn(
        '[sync] operación rechazada',
        entrada.operacion,
        entrada.tabla,
        error.code,
        error.message,
      );
      await quitarDeOutbox(db, [entrada.id]);
      await refrescarFila(db, entrada);
      if (entrada.operacion !== 'upsert' && entrada.operacion !== 'update') {
        await refrescarRecompensas(db);
      }
    } else {
      await sumarIntento(db, entrada.id);
      throw new SinRed(error.message);
    }
  }
}

/** outbox.clave ("valor1|valor2") como filtro { columna: valor } de la clave primaria. */
function claveComoFiltro(tabla: TablaLocal, clave: string): Record<string, string> {
  const valores = clave.split('|');
  return Object.fromEntries(tabla.clave.map((columna, i) => [columna, valores[i] ?? '']));
}

/** Después de un rechazo, la fila local vuelve a quedar como está en el servidor. */
async function refrescarFila(db: SQLiteDatabase, entrada: EntradaOutbox): Promise<void> {
  const tabla = tablaLocal(entrada.tabla);
  const valores = entrada.clave.split('|');
  const { fila } = await pedirSync<{ fila: Fila | null }>('/sync/fila', {
    metodo: 'POST',
    cuerpo: { tabla: tabla.nombre, clave: claveComoFiltro(tabla, entrada.clave) },
  });
  if (fila) {
    await guardarFilas(db, entrada.tabla, [fila]);
  } else {
    const condicion = tabla.clave.map((c) => `${c} = ?`).join(' AND ');
    await db.runAsync(`DELETE FROM ${tabla.nombre} WHERE ${condicion}`, valores);
  }
}

/**
 * Tras rechazar un check-in, el saldo y las plantas locales pueden traer un cálculo optimista que
 * el servidor nunca aplicó; como no cambiaron allá, la descarga incremental no los corregiría.
 */
async function refrescarRecompensas(db: SQLiteDatabase): Promise<void> {
  for (const nombre of TABLAS_RECOMPENSAS) {
    const { filas } = await pedirSync<{ filas: Fila[] }>('/sync/cambios', {
      consulta: { tabla: nombre },
    });
    await guardarFilas(db, nombre, filas);
  }
}

async function descargar(db: SQLiteDatabase): Promise<void> {
  const pendientes = clavesPendientes(await leerOutbox(db));

  for (const tabla of TABLAS as readonly TablaLocal[]) {
    const guardado = await db.getFirstAsync<{ cursor: string | null }>(
      'SELECT cursor FROM sync_state WHERE tabla = ?',
      [tabla.nombre],
    );
    const cursor = guardado?.cursor ?? null;
    let nuevoCursor = cursor;

    for (let pagina = 0; ; pagina++) {
      const { filas } = await pedirSync<{ filas: Fila[] }>('/sync/cambios', {
        consulta: {
          tabla: tabla.nombre,
          desde: cursor ?? undefined,
          desdeFecha:
            cursor === null && tabla.filtroFecha
              ? sumarDias(fechaLocal(), -DIAS_DE_HISTORIAL)
              : undefined,
          pagina,
          tamano: PAGINA,
        },
      });

      const aplicables = filasAplicables(
        tabla.nombre,
        filas,
        (f) => claveDeFila(tabla, f),
        pendientes,
      );
      await enTransaccion(db, () => guardarFilas(db, tabla, aplicables));
      nuevoCursor = siguienteCursor(nuevoCursor, filas);
      if (filas.length < PAGINA) break;
    }

    if (nuevoCursor !== cursor) {
      await db.runAsync('INSERT OR REPLACE INTO sync_state (tabla, cursor) VALUES (?, ?)', [
        tabla.nombre,
        nuevoCursor,
      ]);
    }
  }
}

// Cada escritura local pide una sincronización: la capa de datos solo avisa a quien se suscribe.
suscribirseAEscrituras(pedirSincronizacion);
