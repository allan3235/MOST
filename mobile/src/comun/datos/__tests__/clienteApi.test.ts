/**
 * @file clienteApi.test.ts
 * @proyecto most.
 * @descripcion Pruebas del cliente de la API: token, errores con código, sin red y sesión caducada.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { ErrorApi, ErrorSinRed, pedirApi } from '@/comun/datos/clienteApi';
import { establecerSesion, leerSesion } from '@/comun/datos/sesionGuardada';

jest.mock('@/comun/config/env', () => ({ env: { urlApi: 'http://api.prueba' } }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// ===== Funciones auxiliares =====

function responder(estado: number, cuerpo: unknown): void {
  globalThis.fetch = jest.fn(async () => ({
    ok: estado >= 200 && estado < 300,
    status: estado,
    json: async () => cuerpo,
  })) as unknown as typeof fetch;
}

const SESION = { token: 'token-1', user: { id: 'u1', email: 'ana@most.test' } };

// ===== Pruebas =====

describe('pedirApi', () => {
  beforeEach(async () => {
    await establecerSesion(SESION, 'entrada');
  });

  it('manda el token y arma la URL con los parámetros', async () => {
    responder(200, { filas: [] });
    await pedirApi('/sync/cambios', { consulta: { tabla: 'habits', desde: undefined, pagina: 0 } });

    const [url, opciones] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://api.prueba/sync/cambios?tabla=habits&pagina=0');
    expect(opciones.headers.Authorization).toBe('Bearer token-1');
  });

  it('un rechazo trae el code del backend (la cola lo descarta)', async () => {
    responder(403, { statusCode: 403, code: '42501', message: 'RLS' });
    await expect(pedirApi('/sync/operacion', { metodo: 'POST', cuerpo: {} })).rejects.toMatchObject(
      {
        status: 403,
        code: '42501',
      },
    );
  });

  it('un error sin code se puede reintentar', async () => {
    responder(500, { statusCode: 500, message: 'Error del servidor' });
    const error = await pedirApi('/salud').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).code).toBeNull();
  });

  it('sin red lanza ErrorSinRed', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    await expect(pedirApi('/salud')).rejects.toBeInstanceOf(ErrorSinRed);
  });

  it('un 401 con sesión la cierra (caducó)', async () => {
    responder(401, { statusCode: 401, message: 'Tu sesión terminó.' });
    await expect(pedirApi('/sync/cambios')).rejects.toMatchObject({ status: 401 });
    expect(leerSesion()).toBeNull();
  });

  it('registro e inicio de sesión no llevan token', async () => {
    responder(200, { token: 't', usuario: { id: 'u', correo: 'c' } });
    await pedirApi('/auth/login', { metodo: 'POST', cuerpo: {}, conSesion: false });
    const [, opciones] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(opciones.headers.Authorization).toBeUndefined();
  });
});
