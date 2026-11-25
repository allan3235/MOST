/**
 * @file clienteApi.ts
 * @proyecto most.
 * @descripcion Cliente HTTP del backend de most. (reemplaza a supabase-js). Agrega el token de
 *   sesión, convierte las respuestas de error en ErrorApi (con el "code" del backend) y los
 *   fallos de red en ErrorSinRed. Si el backend responde 401 con sesión, la sesión caducó: se
 *   cierra para que la persona vuelva a entrar (sus datos locales se quedan).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { env } from '@/comun/config/env';
import { establecerSesion, leerSesion } from './sesionGuardada';

// ===== Tipos =====

type Metodo = 'GET' | 'POST';

export type OpcionesPeticion = {
  metodo?: Metodo;
  cuerpo?: unknown;
  /** Parámetros de la URL (?clave=valor). */
  consulta?: Record<string, string | number | undefined>;
  /** false para registro e inicio de sesión. */
  conSesion?: boolean;
};

// ===== Constantes =====

const TIEMPO_MAXIMO_MS = 20000;
const ESTADO_NO_AUTORIZADO = 401;

// ===== Errores =====

/** El backend respondió con un error. "code" viene cuando es un rechazo definitivo. */
export class ErrorApi extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, code: string | null, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.status = status;
    this.code = code;
  }
}

/** La petición no llegó al backend (sin red, servidor apagado o tardó demasiado). */
export class ErrorSinRed extends Error {
  constructor(mensaje = 'Sin conexión con el servidor') {
    super(mensaje);
    this.name = 'ErrorSinRed';
  }
}

// ===== Funciones auxiliares =====

function armarUrl(ruta: string, consulta: OpcionesPeticion['consulta']): string {
  const parametros = Object.entries(consulta ?? {})
    .filter((par): par is [string, string | number] => par[1] !== undefined)
    .map(([clave, valor]) => `${encodeURIComponent(clave)}=${encodeURIComponent(String(valor))}`)
    .join('&');
  return `${env.urlApi}${ruta}${parametros ? `?${parametros}` : ''}`;
}

/** Lee { code, message } del cuerpo de un error; el backend a veces manda message como lista. */
async function leerError(respuesta: Response): Promise<ErrorApi> {
  try {
    const cuerpo = (await respuesta.json()) as { code?: unknown; message?: unknown };
    const mensaje = Array.isArray(cuerpo.message) ? cuerpo.message.join('; ') : cuerpo.message;
    return new ErrorApi(
      respuesta.status,
      typeof cuerpo.code === 'string' ? cuerpo.code : null,
      typeof mensaje === 'string' ? mensaje : `Error ${respuesta.status}`,
    );
  } catch {
    return new ErrorApi(respuesta.status, null, `Error ${respuesta.status}`);
  }
}

// ===== Principal =====

/**
 * Hace una petición al backend.
 * @param ruta Ruta, por ejemplo "/sync/operacion".
 * @param opciones Método, cuerpo, parámetros y si lleva la sesión.
 * @returns El cuerpo de la respuesta ya convertido de JSON.
 */
export async function pedirApi<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const { metodo = 'GET', cuerpo, consulta, conSesion = true } = opciones;
  const sesion = conSesion ? leerSesion() : null;
  if (conSesion && !sesion) {
    throw new ErrorApi(ESTADO_NO_AUTORIZADO, null, 'Sin sesión');
  }

  const cancelador = new AbortController();
  const temporizador = setTimeout(() => cancelador.abort(), TIEMPO_MAXIMO_MS);
  let respuesta: Response;
  try {
    respuesta = await fetch(armarUrl(ruta, consulta), {
      method: metodo,
      headers: {
        Accept: 'application/json',
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(sesion ? { Authorization: `Bearer ${sesion.token}` } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: cancelador.signal,
    });
  } catch {
    throw new ErrorSinRed();
  } finally {
    clearTimeout(temporizador);
  }

  if (!respuesta.ok) {
    const error = await leerError(respuesta);
    if (error.status === ESTADO_NO_AUTORIZADO && sesion) {
      await establecerSesion(null, 'caducada');
    }
    throw error;
  }
  return (await respuesta.json()) as T;
}
