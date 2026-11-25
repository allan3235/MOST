/**
 * @file hitos.test.ts
 * @proyecto most.
 * @descripcion Pruebas de los hitos del micro-paso (RF-16, CP-09): 5/10 y 8/10.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { avanceDelPaso, hitoAlcanzado, META_REPETICIONES_PASO } from '@/zonas/plantas/logica/hitos';

describe('hitos del micro-paso', () => {
  it('CP-09: a los 5 de 10 es el hito del 50 % y a los 8 de 10 el del 80 %', () => {
    expect(META_REPETICIONES_PASO).toBe(10);
    expect(hitoAlcanzado(4, 5)).toBe(50);
    expect(hitoAlcanzado(7, 8)).toBe(80);
  });

  it('entre hitos no hay refuerzo', () => {
    expect(hitoAlcanzado(5, 6)).toBeNull();
    expect(hitoAlcanzado(8, 9)).toBeNull();
    expect(hitoAlcanzado(0, 1)).toBeNull();
  });

  it('si se cruzan dos de golpe, se celebra el más alto', () => {
    expect(hitoAlcanzado(3, 9)).toBe(80);
  });

  it('el avance no pasa de la meta', () => {
    expect(avanceDelPaso(14)).toEqual({ hechos: 10, meta: 10 });
    expect(avanceDelPaso(3)).toEqual({ hechos: 3, meta: 10 });
  });
});
