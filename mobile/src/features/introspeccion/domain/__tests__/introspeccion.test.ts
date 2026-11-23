/**
 * @file introspeccion.test.ts
 * @proyecto most.
 * @descripcion Pruebas de la introspección por valores (RF-04, CP-10): escala 1–5, máximo 3
 *   preguntas y una vez por semana.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { es } from '@/i18n/es';

import { ESCALA, esRespuestaValida, PREGUNTAS, tocaReflexion } from '../introspeccion';

const HOY = '2026-11-23';

describe('introspección por valores', () => {
  it('RF-04: de 1 a 3 preguntas, cada una con su texto', () => {
    expect(PREGUNTAS.length).toBeGreaterThanOrEqual(1);
    expect(PREGUNTAS.length).toBeLessThanOrEqual(3);
    for (const p of PREGUNTAS) expect(es.introspeccion.preguntas[p]).toBeTruthy();
  });

  it('CP-10: la escala va de 1 a 5', () => {
    expect(ESCALA).toEqual([1, 2, 3, 4, 5]);
    expect(esRespuestaValida(1)).toBe(true);
    expect(esRespuestaValida(5)).toBe(true);
    expect(esRespuestaValida(0)).toBe(false);
    expect(esRespuestaValida(6)).toBe(false);
    expect(esRespuestaValida(2.5)).toBe(false);
  });

  it('nunca usa palabras clínicas ni de diagnóstico', () => {
    const texto = JSON.stringify(es.introspeccion).toLowerCase();
    for (const palabra of ['depresi', 'ansiedad', 'trastorno', 'diagn', 'síntoma', 'fracaso']) {
      expect(texto).not.toContain(palabra);
    }
  });

  it('la semanal toca a los 7 días de la última o del primer uso', () => {
    expect(tocaReflexion(null, '2026-11-16', HOY)).toBe(true);
    expect(tocaReflexion(null, '2026-11-20', HOY)).toBe(false);
    expect(tocaReflexion('2026-11-18', '2026-10-01', HOY)).toBe(false);
    expect(tocaReflexion(null, null, HOY)).toBe(false);
  });
});
