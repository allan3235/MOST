/**
 * @file metasRepositorio.test.ts
 * @proyecto most.
 * @descripcion Pruebas de «Crear meta»: propuesta, sin conexión y rechazos del backend.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { ErrorApi, ErrorSinRed, pedirApi } from '@/comun/datos/clienteApi';

import { descomponerMeta } from '../repositorioMetas';

jest.mock('@/comun/config/env', () => ({ env: { urlApi: 'http://prueba' } }));
jest.mock('@/comun/datos/clienteApi', () => {
  const real = jest.requireActual('@/comun/datos/clienteApi');
  return { ...real, pedirApi: jest.fn() };
});

const pedir = pedirApi as jest.MockedFunction<typeof pedirApi>;

const HABITO = {
  categoria: 'trabajo' as const,
  titulo: 'Leer novelas',
  descripcion: '',
  micro_pasos: [
    {
      orden: 1,
      titulo: 'Leer 3 min',
      descripcion: '',
      duracion_min: 3,
      duracion_reducida_min: 1,
      dias_semana: [1, 3, 5],
    },
  ],
};

describe('descomponerMeta', () => {
  it('envía el texto y el área y devuelve la propuesta', async () => {
    pedir.mockResolvedValueOnce({ origen: 'ia', habito: HABITO });
    const resultado = await descomponerMeta('Leer más', 'trabajo');
    expect(pedir).toHaveBeenCalledWith('/ia/meta', {
      metodo: 'POST',
      cuerpo: { texto: 'Leer más', categoria: 'trabajo' },
    });
    expect(resultado).toEqual({ ok: true, propuesta: HABITO });
  });

  it('sin conexión lo dice (generar necesita internet)', async () => {
    pedir.mockRejectedValueOnce(new ErrorSinRed());
    expect(await descomponerMeta('Leer más', 'trabajo')).toEqual({
      ok: false,
      motivo: 'sin_conexion',
      mensaje: null,
    });
  });

  it('una meta no apropiada o la IA caída traen el mensaje del backend', async () => {
    pedir.mockRejectedValueOnce(new ErrorApi(422, 'META_NO_APROPIADA', '¿Probamos de otra forma?'));
    expect(await descomponerMeta('x x x', 'trabajo')).toMatchObject({
      motivo: 'no_apropiada',
      mensaje: '¿Probamos de otra forma?',
    });
    pedir.mockRejectedValueOnce(new ErrorApi(503, 'IA_NO_DISPONIBLE', 'Intenta en un rato.'));
    expect(await descomponerMeta('Leer', 'trabajo')).toMatchObject({ motivo: 'no_disponible' });
  });

  it('cualquier otro error es genérico (sin texto técnico)', async () => {
    pedir.mockRejectedValueOnce(new ErrorApi(500, null, 'Error del servidor'));
    expect(await descomponerMeta('Leer', 'trabajo')).toEqual({
      ok: false,
      motivo: 'error',
      mensaje: null,
    });
  });
});
