/**
 * @file ListaMicroPasos.test.tsx
 * @proyecto most.
 * @descripcion Prueba de la lista de micro-pasos: orden, estado con texto y etiqueta para TalkBack.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { render, screen } from '@testing-library/react-native';

import { ListaMicroPasos } from '../ListaMicroPasos';

// Los íconos no importan aquí y su paquete viene en ESM, que Jest no transforma.
jest.mock('lucide-react-native', () => ({
  Circle: () => null,
  CircleCheck: () => null,
  Footprints: () => null,
}));

const PASOS = [
  { orden: 3, titulo: 'Leer 20 min', duracion_min: 20 },
  { orden: 1, titulo: 'Leer 5 min', duracion_min: 5 },
  { orden: 2, titulo: 'Leer 10 min', duracion_min: 10 },
];

describe('ListaMicroPasos', () => {
  it('muestra los pasos en orden y anuncia el estado de cada uno con texto', async () => {
    await render(<ListaMicroPasos pasos={PASOS} pasoActual={2} />);
    expect(screen.getByLabelText('Paso 1 de 3: Leer 5 min. Superado.')).toBeTruthy();
    expect(screen.getByLabelText('Paso 2 de 3: Leer 10 min. Vas aquí.')).toBeTruthy();
    expect(screen.getByLabelText('Paso 3 de 3: Leer 20 min. Después.')).toBeTruthy();
  });

  it('si el hábito va en versión ligera, el paso en curso muestra sus minutos reales', async () => {
    await render(
      <ListaMicroPasos
        pasos={PASOS}
        pasoActual={1}
        enCurso={{ titulo: 'Leer 2 min', duracion_min: 2 }}
      />,
    );
    expect(
      screen.getByLabelText('Paso 1 de 3: Leer 2 min. Vas aquí, versión ligera.'),
    ).toBeTruthy();
    expect(screen.getByText('Paso 1 · 2 min · Vas aquí, versión ligera')).toBeTruthy();
  });

  it('RF-16: el paso en curso muestra cuántas veces lleva de 10', async () => {
    await render(<ListaMicroPasos pasos={PASOS} pasoActual={2} avance={{ hechos: 5, meta: 10 }} />);
    expect(screen.getByText('5 de 10 hacia el siguiente paso')).toBeTruthy();
    expect(
      screen.getByLabelText('Paso 2 de 3: Leer 10 min. Vas aquí, 5 de 10 hacia el siguiente paso.'),
    ).toBeTruthy();
  });

  it('sin secuencia no muestra nada', async () => {
    await render(<ListaMicroPasos pasos={[]} pasoActual={null} />);
    expect(screen.queryByText('Tus micro-pasos')).toBeNull();
  });
});
