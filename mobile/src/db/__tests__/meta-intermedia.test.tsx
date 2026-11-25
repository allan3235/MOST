/**
 * @file meta-intermedia.test.tsx
 * @proyecto most.
 * @descripcion Pruebas de CP-11 (RF-15): con 2 de 7 días (28 %) se ofrece una meta intermedia
 *   que se aplica en un toque («Probar este paso»), sin mensajes de fracaso, y al aplicarla solo
 *   cambia el hábito: el historial (habit_logs) queda intacto.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { ProgressionCard } from '@/features/progression/components/progression-card';
import type { Tarjeta } from '@/features/progression/domain/progresion';
import { es } from '@/comun/i18n/es';

import { actualizarFila, leerFilas } from '@/comun/datos/database';
import { aceptarBajada } from '../progression-repository';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
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

const PALABRAS_DE_CULPA = /fallaste|fracaso|fallo|perdiste|reinici/i;

// ===== Pruebas =====

describe('CP-11: meta intermedia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.length = 0;
  });

  it('se ofrece sin mensajes de fracaso y se aplica con un solo toque', async () => {
    const onAceptar = jest.fn();
    await render(
      <ProgressionCard
        tarjeta={TARJETA}
        indice={1}
        total={1}
        ocupado={false}
        onAceptar={onAceptar}
        onCerrar={jest.fn()}
        onIrAPerfil={jest.fn()}
      />,
    );
    expect(screen.getByText(/Leer 10 min/).props.children).not.toMatch(PALABRAS_DE_CULPA);
    await fireEvent.press(screen.getByText(es.progresion.probarPaso));
    expect(onAceptar).toHaveBeenCalledTimes(1);
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
