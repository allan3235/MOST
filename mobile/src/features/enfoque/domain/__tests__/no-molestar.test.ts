/**
 * @file no-molestar.test.ts
 * @proyecto most.
 * @descripcion Pruebas de No Molestar en el modo enfoque (RF-14). CP-15: Android con permiso pasa
 *   a «solo prioridad» y al terminar regresa al filtro que tenía. CP-16: en iOS o en Android sin
 *   permiso no se toca la configuración del teléfono.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import {
  activarNoMolestar,
  estadoNoMolestar,
  FILTRO_PRIORIDAD,
  restaurarNoMolestar,
  type ControlNoMolestar,
  type GuardadoFiltro,
} from '../no-molestar';

// ===== Datos de prueba =====

/** INTERRUPTION_FILTER_ALL: el teléfono sin No Molestar. */
const FILTRO_TODO = 1;

function telefono(permiso: boolean, filtro = FILTRO_TODO) {
  const control = {
    filtro,
    cambios: [] as number[],
    tienePermiso: () => permiso,
    filtroActual: () => control.filtro,
    ponerFiltro: (nuevo: number) => {
      if (!permiso) return false;
      control.filtro = nuevo;
      control.cambios.push(nuevo);
      return true;
    },
  };
  return control satisfies ControlNoMolestar;
}

function guardado(): GuardadoFiltro & { valor: number | null } {
  const g = {
    valor: null as number | null,
    leer: async () => g.valor,
    guardar: async (filtro: number) => {
      g.valor = filtro;
    },
    borrar: async () => {
      g.valor = null;
    },
  };
  return g;
}

// ===== Pruebas =====

describe('No Molestar del modo enfoque', () => {
  it('CP-15: Android con permiso pasa a No Molestar y al terminar vuelve al estado previo', async () => {
    const tel = telefono(true);
    const g = guardado();
    await expect(activarNoMolestar(tel, 'android', g)).resolves.toBe('activado');
    expect(tel.filtro).toBe(FILTRO_PRIORIDAD);
    expect(g.valor).toBe(FILTRO_TODO);

    await expect(restaurarNoMolestar(tel, 'android', g)).resolves.toBe(true);
    expect(tel.filtro).toBe(FILTRO_TODO);
    expect(g.valor).toBeNull();
  });

  it('CP-15: si ya tenía un filtro propio, al terminar regresa a ese mismo', async () => {
    const SOLO_ALARMAS = 4;
    const tel = telefono(true, SOLO_ALARMAS);
    const g = guardado();
    await activarNoMolestar(tel, 'android', g);
    // Reiniciar la sesión no pisa el filtro de antes de la primera.
    await activarNoMolestar(tel, 'android', g);
    await restaurarNoMolestar(tel, 'android', g);
    expect(tel.filtro).toBe(SOLO_ALARMAS);
  });

  it('CP-16: Android sin permiso no cambia nada y pide guiar a darlo', async () => {
    const tel = telefono(false);
    const g = guardado();
    await expect(activarNoMolestar(tel, 'android', g)).resolves.toBe('sin_permiso');
    expect(tel.cambios).toEqual([]);
    expect(g.valor).toBeNull();
    await expect(restaurarNoMolestar(tel, 'android', g)).resolves.toBe(false);
  });

  it('CP-16: en iOS nunca se intenta, aunque hubiera un control', async () => {
    const tel = telefono(true);
    const g = guardado();
    expect(estadoNoMolestar(tel, 'ios')).toBe('no_disponible');
    await expect(activarNoMolestar(tel, 'ios', g)).resolves.toBe('no_disponible');
    expect(tel.cambios).toEqual([]);
  });

  it('sin el módulo nativo (Expo Go) solo queda la guía manual', () => {
    expect(estadoNoMolestar(null, 'android')).toBe('no_disponible');
  });
});
