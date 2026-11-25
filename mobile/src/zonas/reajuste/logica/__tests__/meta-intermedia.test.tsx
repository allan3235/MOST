/**
 * @file meta-intermedia.test.tsx
 * @proyecto most.
 * @descripcion Prueba de CP-11 (RF-15), capa de lógica: al aplicar la meta intermedia solo cambia
 *   el hábito; el historial (habit_logs) queda intacto. La tarjeta se prueba en presentación.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.1.0
 * @historial 1.0.0 (2026-11-23): creación.
 *   1.1.0 (2026-11-24): la prueba de la tarjeta pasa a presentacion (arquitectura en capas).
 */

import type { Tarjeta } from '@/zonas/reajuste/logica/progresion';

import { actualizarFila, leerFilas } from '@/comun/datos/database';
import { aceptarBajada } from '@/zonas/reajuste/logica/servicioReajuste';

jest.mock('@/comun/config/env', () => ({ env: { urlApi: 'http://prueba' } }));
const mockSql: string[] = [];
jest.mock('@/comun/datos/aplicar-cambio', () => ({
  suscribirseAEscrituras: () => () => undefined,
  aplicar: async (cambio: (db: unknown) => Promise<unknown>) =>
    cambio({
      runAsync: async (sql: string) => {
        mockSql.push(sql);
        return { changes: 1 };
      },
    }),
}));
jest.mock('@/comun/datos/database', () => ({
  getDb: jest.fn(),
  leerFilas: jest.fn(),
  actualizarFila: jest.fn(async () => undefined),
  guardarFilas: jest.fn(async () => undefined),
}));

// ===== Datos de prueba =====

const ANTES = {
  nivel: 2,
  paso_actual: 2,
  titulo: 'Leer 20 min',
  descripcion: null,
  duracion_min: 20,
  usa_duracion_reducida: false,
  nivel_desde: '2026-11-01',
  dias_semana: [1, 2, 3, 4, 5],
};
const DESPUES = { ...ANTES, nivel: 1, paso_actual: 1, titulo: 'Leer 10 min', duracion_min: 10 };

const TARJETA = {
  id: 't1',
  tipo: 'bajar',
  habitId: 'h1',
  antes: ANTES,
  despues: { ...DESPUES, nivel_desde: '2026-11-23' },
} as unknown as Extract<Tarjeta, { tipo: 'bajar' }>;

// ===== Pruebas =====

describe('CP-11: meta intermedia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.length = 0;
  });

  it('al aplicarla solo cambia el hábito; el historial no se toca', async () => {
    (leerFilas as jest.Mock).mockImplementation(async (_db: unknown, tabla: string) =>
      tabla === 'habits'
        ? [{ id: 'h1', archivado_en: null, nivel: 2, paso_actual: 2, usa_duracion_reducida: false }]
        : [],
    );
    await expect(aceptarBajada('u1', TARJETA)).resolves.toBe(true);

    const tablas = (actualizarFila as jest.Mock).mock.calls.map((llamada) => llamada[1]);
    expect(tablas).toEqual(['habits']);
    expect((actualizarFila as jest.Mock).mock.calls[0]?.[3]).toMatchObject({
      duracion_min: 10,
      titulo: 'Leer 10 min',
    });
    const leidas = (leerFilas as jest.Mock).mock.calls.map((llamada) => llamada[1]);
    expect([...leidas, ...mockSql].some((x) => /habit_logs/.test(String(x)))).toBe(false);
  });
});
