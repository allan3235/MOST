/**
 * @file aviso-motivacional.test.ts
 * @proyecto most.
 * @descripcion Pruebas del aviso motivacional (RF-13, CP-08): 3 días seguidos y máximo uno al día.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { diasSeguidos, tocaAvisoMotivacional } from '../aviso-motivacional';

const HOY = '2026-11-23';

describe('aviso motivacional', () => {
  it('cuenta los días seguidos hasta hoy', () => {
    expect(diasSeguidos(new Set(['2026-11-21', '2026-11-22', HOY]), HOY)).toBe(3);
    // Un día que no salió corta la cuenta, sin borrar nada más.
    expect(diasSeguidos(new Set(['2026-11-20', '2026-11-22', HOY]), HOY)).toBe(2);
    expect(diasSeguidos(new Set(['2026-11-22']), HOY)).toBe(0);
  });

  it('CP-08: a los 3 días seguidos toca avisar', () => {
    expect(tocaAvisoMotivacional(3, null, HOY)).toBe(true);
    expect(tocaAvisoMotivacional(2, null, HOY)).toBe(false);
    expect(tocaAvisoMotivacional(4, null, HOY)).toBe(false);
    expect(tocaAvisoMotivacional(6, '2026-11-20', HOY)).toBe(true);
  });

  it('máximo un aviso al día', () => {
    expect(tocaAvisoMotivacional(3, HOY, HOY)).toBe(false);
  });
});
