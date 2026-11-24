/**
 * @file enfoque.test.ts
 * @proyecto most.
 * @descripcion Pruebas del modo enfoque (RF-14, CP-15/16): durante la sesión la app no emite sus
 *   avisos y al terminar vuelven.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import {
  DURACIONES_ENFOQUE,
  estaEnEnfoque,
  finDeEnfoque,
  quitarAvisosDuranteEnfoque,
  textoRestante,
} from '../enfoque';

const INICIO = new Date(2026, 10, 23, 10, 0, 0);
const aviso = (h: number, m: number) => ({ id: `${h}:${m}`, fecha: new Date(2026, 10, 23, h, m) });

describe('modo enfoque', () => {
  it('ofrece sesiones de 15, 25 y 45 minutos', () => {
    expect(DURACIONES_ENFOQUE).toEqual([15, 25, 45]);
  });

  it('la sesión dura lo elegido y luego termina sola', () => {
    const hasta = finDeEnfoque(INICIO, 25);
    expect(hasta).toEqual(new Date(2026, 10, 23, 10, 25, 0));
    expect(estaEnEnfoque(hasta, new Date(2026, 10, 23, 10, 24))).toBe(true);
    expect(estaEnEnfoque(hasta, new Date(2026, 10, 23, 10, 25))).toBe(false);
    expect(estaEnEnfoque(null, INICIO)).toBe(false);
  });

  it('CP-15/16: durante la sesión no queda ningún aviso propio; después sí', () => {
    const hasta = finDeEnfoque(INICIO, 25);
    const avisos = [aviso(10, 10), aviso(10, 24), aviso(10, 30), aviso(13, 0)];
    expect(quitarAvisosDuranteEnfoque(avisos, hasta).map((a) => a.id)).toEqual(['10:30', '13:0']);
    // Al cancelar o terminar (sin sesión) vuelven todos.
    expect(quitarAvisosDuranteEnfoque(avisos, null)).toHaveLength(4);
  });

  it('el contador muestra mm:ss y no baja de 00:00', () => {
    const hasta = finDeEnfoque(INICIO, 15);
    expect(textoRestante(hasta, INICIO)).toBe('15:00');
    expect(textoRestante(hasta, new Date(2026, 10, 23, 10, 14, 30))).toBe('00:30');
    expect(textoRestante(hasta, new Date(2026, 10, 23, 11, 0))).toBe('00:00');
  });
});
