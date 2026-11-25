/**
 * @file meta-intermedia-tarjeta.test.tsx
 * @proyecto most.
 * @descripcion Prueba de CP-11 (RF-15), capa de presentación: la meta intermedia se ofrece sin
 *   mensajes de fracaso y se aplica con un solo toque («Probar este paso»).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): sale de logica/__tests__/meta-intermedia.test.tsx.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { es } from '@/comun/i18n/es';
import type { Tarjeta } from '@/zonas/reajuste/logica/progresion';

import { ProgressionCard } from '../componentes/progression-card';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

// ===== Datos de prueba =====

const PASO = {
  nivel: 2,
  paso_actual: 2,
  titulo: 'Leer 20 min',
  descripcion: null,
  duracion_min: 20,
  usa_duracion_reducida: false,
  nivel_desde: '2026-11-01',
  dias_semana: [1, 2, 3, 4, 5],
};

const TARJETA = {
  id: 't1',
  tipo: 'bajar',
  habitId: 'h1',
  antes: PASO,
  despues: { ...PASO, nivel: 1, paso_actual: 1, titulo: 'Leer 10 min', duracion_min: 10 },
} as unknown as Extract<Tarjeta, { tipo: 'bajar' }>;

const PALABRAS_DE_CULPA = /fallaste|fracaso|fallo|perdiste|reinici/i;

// ===== Pruebas =====

describe('CP-11: tarjeta de la meta intermedia', () => {
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
});
