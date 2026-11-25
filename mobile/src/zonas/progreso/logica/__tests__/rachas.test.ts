/**
 * @file rachas.test.ts
 * @proyecto most.
 * @descripcion Pruebas del avance acumulado (sin rachas que se borren, RNF-07).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 2.0.0
 * @historial 1.0.0: rachas seguidas. 2.0.0 (2026-11-23): total acumulado.
 */

import { lineaDeRacha, pildoraDeRacha, rachaDeHabito } from '@/zonas/progreso/logica/rachas';

const serie = (texto: string) => [...texto].map((c) => ({ hecho: c === '1' }));

describe('avance acumulado por hábito', () => {
  it('cuenta todas las veces completadas; un día sin hacerlo no resta', () => {
    expect(rachaDeHabito(serie('1110011'))).toEqual({ actual: 5, mejor: 5 });
    expect(rachaDeHabito(serie('110'))).toEqual({ actual: 2, mejor: 2 });
    expect(rachaDeHabito([])).toEqual({ actual: 0, mejor: 0 });
  });

  it('nunca vuelve a 0: fallar al final no borra lo logrado', () => {
    const antes = rachaDeHabito(serie('1111'));
    const despues = rachaDeHabito(serie('11110'));
    expect(despues.actual).toBe(antes.actual);
  });

  it('el texto es igual para todos y no menciona rachas rotas', () => {
    expect(lineaDeRacha({ actual: 3, mejor: 3 }, false)).toEqual([{ texto: 'rachaActual', n: 3 }]);
    expect(lineaDeRacha({ actual: 3, mejor: 3 }, true)).toEqual([{ texto: 'rachaActual', n: 3 }]);
    expect(lineaDeRacha({ actual: 0, mejor: 0 }, false)).toEqual([]);
  });

  it('la píldora muestra el total; sin ninguna, no hay píldora', () => {
    expect(pildoraDeRacha({ actual: 7, mejor: 7 }, false)).toEqual({ tipo: 'actual', n: 7 });
    expect(pildoraDeRacha({ actual: 0, mejor: 0 }, true)).toBeNull();
  });
});
