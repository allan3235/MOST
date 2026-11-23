/**
 * @file tiposPostgres.spec.ts
 * @proyecto most.
 * @descripcion Pruebas de la conversión de marcas de tiempo.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { convertirMarcaTiempo } from './tiposPostgres.js';

describe('convertirMarcaTiempo', () => {
  it('conserva los microsegundos y completa la zona', () => {
    expect(convertirMarcaTiempo('2026-11-22 23:48:52.123456+00')).toBe(
      '2026-11-22T23:48:52.123456+00:00',
    );
  });

  it('respeta zonas con minutos', () => {
    expect(convertirMarcaTiempo('2026-11-22 23:48:52+05:30')).toBe('2026-11-22T23:48:52+05:30');
  });
});
