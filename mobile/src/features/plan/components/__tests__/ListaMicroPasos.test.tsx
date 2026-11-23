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

  it('sin secuencia no muestra nada', async () => {
    await render(<ListaMicroPasos pasos={[]} pasoActual={null} />);
    expect(screen.queryByText('Tus micro-pasos')).toBeNull();
  });
});
