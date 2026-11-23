/**
 * @file barreras.test.ts
 * @proyecto most.
 * @descripcion Pruebas de la lista de barreras (RF-17 + RF-19, CP-13): qué alternativas se
 *   ofrecen según lo que se atravesó y en qué orden.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { alternativasPara, BARRERAS, type Alternativa } from '../barreras';

const LIGERO = { titulo: 'Caminar 2 min', duracion_min: 2 };
const MANANA = '2026-11-24';

const tipos = (lista: Alternativa[]) => lista.map((a) => a.tipo);

describe('lista de barreras', () => {
  it('pregunta con máximo 3 opciones', () => {
    expect(BARRERAS.length).toBeLessThanOrEqual(3);
  });

  it('CP-13: con falta de tiempo, la versión ligera va primero', () => {
    expect(tipos(alternativasPara('tiempo', MANANA, true, LIGERO))).toEqual([
      'ligero',
      'mover',
      'elegir',
    ]);
  });

  it('si faltó algo o no se pudo llegar, otro día va primero', () => {
    expect(tipos(alternativasPara('recursos', MANANA, true, LIGERO))).toEqual([
      'mover',
      'ligero',
      'elegir',
    ]);
    expect(tipos(alternativasPara('acceso', MANANA, false, LIGERO))).toEqual(['mover', 'ligero']);
  });

  it('sin día libre ni versión más ligera no ofrece nada (queda «Dejarlo así»)', () => {
    expect(alternativasPara('tiempo', null, false, null)).toEqual([]);
  });

  it('mover lleva el primer día libre', () => {
    expect(alternativasPara('recursos', MANANA, false, null)).toEqual([
      { tipo: 'mover', fecha: MANANA },
    ]);
  });
});
