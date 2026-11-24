/**
 * @file reglasMicroPasos.spec.ts
 * @proyecto most.
 * @descripcion Pruebas de las reglas que la IA no puede romper.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import type { HabitoIa, MicroPaso, PasoIa } from './esquemasIa.js';
import {
  corregirHabito,
  corregirPasoLigero,
  crearPasoLigeroSinIa,
  limpiarDias,
  type LimitesHabito,
} from './reglasMicroPasos.js';

// ===== Datos de prueba =====

const LIMITES: LimitesHabito = {
  minutosMaximos: 20,
  categoria: 'trabajo',
  objetivo: 'leer_mas',
  pasoInicial: 1,
  usaDuracionReducida: false,
};

function crearPaso(duracion: number, cambios: Partial<PasoIa> = {}): PasoIa {
  return {
    titulo: `Leer ${duracion} min`,
    descripcion: 'Un rato de lectura.',
    duracion_min: duracion,
    duracion_reducida_min: Math.ceil(duracion / 2),
    dias_semana: [1, 3, 5],
    ...cambios,
  };
}

function crearHabito(pasos: PasoIa[]): HabitoIa {
  return {
    objetivo: 'leer_mas',
    titulo: 'Leer más',
    descripcion: 'Poco a poco.',
    micro_pasos: pasos,
  };
}

const PASO_ACTUAL: MicroPaso = {
  orden: 2,
  titulo: 'Leer 10 min',
  descripcion: '',
  duracion_min: 10,
  duracion_reducida_min: 5,
  dias_semana: [1, 3, 5],
};

// ===== Pruebas =====

describe('corregirHabito', () => {
  it('deja igual un hábito que ya cumple las reglas', () => {
    const habito = corregirHabito(
      crearHabito([crearPaso(5), crearPaso(10), crearPaso(20)]),
      LIMITES,
    );
    expect(habito?.micro_pasos.map((p) => p.duracion_min)).toEqual([5, 10, 20]);
    expect(habito?.micro_pasos.map((p) => p.orden)).toEqual([1, 2, 3]);
  });

  it('corrige minutos: primer paso de 5 o menos, triple como máximo y sin pasar el tope', () => {
    const habito = corregirHabito(
      crearHabito([crearPaso(15), crearPaso(60), crearPaso(90), crearPaso(3)]),
      LIMITES,
    );
    // 15 → 5 (primer paso); 60 → 15 (triple de 5); 90 → 20 (tope diario); 3 → 20 (no baja).
    expect(habito?.micro_pasos.map((p) => p.duracion_min)).toEqual([5, 15, 20, 20]);
  });

  it('respeta el candado mínimo en la versión reducida', () => {
    const habito = corregirHabito(
      crearHabito([
        crearPaso(2, { duracion_reducida_min: 0 }),
        crearPaso(4, { duracion_reducida_min: -3 }),
        crearPaso(6, { duracion_reducida_min: 50 }),
      ]),
      LIMITES,
    );
    // Sin reducida válida se usa la mitad sin bajar de 2 min (2 → 2, 4 → 2); siempre menor que la
    // normal (50 → 5).
    expect(habito?.micro_pasos.map((p) => p.duracion_reducida_min)).toEqual([2, 2, 5]);
  });

  it('un paso de 1 minuto sube al candado mínimo de 2 min (RR-03)', () => {
    const habito = corregirHabito(crearHabito([crearPaso(1), crearPaso(2), crearPaso(3)]), LIMITES);
    expect(habito?.micro_pasos[0]).toMatchObject({ duracion_min: 2, duracion_reducida_min: 2 });
  });

  it('si recorta los minutos, el título dice los minutos reales', () => {
    const habito = corregirHabito(
      crearHabito([
        crearPaso(5, { titulo: 'Caminar 5 min' }),
        crearPaso(15, { titulo: 'Caminar 15 min' }),
        crearPaso(30, { titulo: 'Caminar o moverme 30 min', duracion_reducida_min: 10 }),
      ]),
      { ...LIMITES, minutosMaximos: 10 },
    );
    expect(habito?.micro_pasos.map((p) => p.titulo)).toEqual([
      'Caminar 5 min',
      'Caminar 10 min',
      'Caminar o moverme 10 min',
    ]);
    // La reducida baja en la misma proporción que la duración: 10 de 30 → 3 de 10.
    expect(habito?.micro_pasos[2].duracion_reducida_min).toBe(3);
  });

  it('con poco tiempo diario, nada pasa de ese tope', () => {
    const habito = corregirHabito(crearHabito([crearPaso(5), crearPaso(10), crearPaso(20)]), {
      ...LIMITES,
      minutosMaximos: 3,
    });
    expect(habito?.micro_pasos.map((p) => p.duracion_min)).toEqual([3, 3, 3]);
  });

  it('un recordatorio (0 min) se queda sin duración en todos los pasos', () => {
    const habito = corregirHabito(crearHabito([crearPaso(0), crearPaso(5), crearPaso(0)]), {
      ...LIMITES,
      usaDuracionReducida: true,
    });
    expect(habito?.micro_pasos.every((p) => p.duracion_min === 0)).toBe(true);
    expect(habito?.usa_duracion_reducida).toBe(false);
  });

  it('se queda con 5 pasos como máximo y ajusta el paso inicial', () => {
    const pasos = [1, 2, 3, 4, 5, 6, 7].map((n) => crearPaso(n));
    const habito = corregirHabito(crearHabito(pasos), { ...LIMITES, pasoInicial: 9 });
    expect(habito?.micro_pasos).toHaveLength(5);
    expect(habito?.paso_inicial).toBe(5);
  });

  it('rechaza menos de 3 pasos, pasos sin días válidos o sin título', () => {
    expect(corregirHabito(crearHabito([crearPaso(5), crearPaso(10)]), LIMITES)).toBeNull();
    expect(
      corregirHabito(
        crearHabito([crearPaso(5), crearPaso(10, { dias_semana: [0, 9] }), crearPaso(20)]),
        LIMITES,
      ),
    ).toBeNull();
    expect(
      corregirHabito(
        crearHabito([crearPaso(5, { titulo: '  ' }), crearPaso(10), crearPaso(20)]),
        LIMITES,
      ),
    ).toBeNull();
  });
});

describe('CP-01 (RF-03): «Leer 20 minutos al día»', () => {
  it('queda en 3 a 5 pasos ordenados de menor a mayor esfuerzo y el primero dura 5 min o menos', () => {
    // La IA propone un primer paso largo y sin orden de esfuerzo: las reglas lo corrigen.
    const habito = corregirHabito(
      crearHabito([crearPaso(8), crearPaso(4), crearPaso(15), crearPaso(20)]),
      LIMITES,
    );
    const minutos = habito?.micro_pasos.map((p) => p.duracion_min) ?? [];
    expect(minutos.length).toBeGreaterThanOrEqual(3);
    expect(minutos.length).toBeLessThanOrEqual(5);
    expect(minutos[0]).toBeLessThanOrEqual(5);
    expect(minutos).toEqual([...minutos].sort((a, b) => a - b));
    expect(habito?.micro_pasos.map((p) => p.orden)).toEqual(minutos.map((_m, i) => i + 1));
  });
});

describe('limpiarDias', () => {
  it('quita repetidos e inválidos y ordena', () => {
    expect(limpiarDias([5, 1, 1, 8, 0, 3])).toEqual([1, 3, 5]);
  });
});

describe('paso más ligero (meta intermedia)', () => {
  it('siempre más corto que el actual y nunca menos de 2 min (RR-03)', () => {
    expect(corregirPasoLigero(crearPaso(30), PASO_ACTUAL)?.duracion_min).toBe(9);
    expect(corregirPasoLigero(crearPaso(0), PASO_ACTUAL)?.duracion_min).toBe(2);
  });

  it('sin IA: la mitad del tiempo con el candado mínimo', () => {
    expect(crearPasoLigeroSinIa(PASO_ACTUAL).duracion_min).toBe(5);
    expect(crearPasoLigeroSinIa({ ...PASO_ACTUAL, duracion_min: 1 }).duracion_min).toBe(2);
  });

  it('un recordatorio se aligera con menos días', () => {
    const recordatorio = { ...PASO_ACTUAL, duracion_min: 0, duracion_reducida_min: 0 };
    expect(crearPasoLigeroSinIa(recordatorio).dias_semana).toEqual([1]);
  });
});
