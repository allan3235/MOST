/**
 * @file TarjetaBarreras.test.tsx
 * @proyecto most.
 * @descripcion Prueba de la tarjeta de barreras (RF-17 + RF-19): la pregunta con 3 opciones, y
 *   con la respuesta, la alternativa en un toque sin palabras de culpa.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Propuesta } from '../../domain/reprogramar';
import { TarjetaBarreras, type TarjetaBarrerasProps } from '../TarjetaBarreras';

jest.mock('lucide-react-native', () => ({ MessageCircleQuestionMark: () => null }));

const HOY = '2026-11-18';

const PROPUESTA = {
  habito: { id: 'h1', titulo: 'Caminar 5 min' },
  fechaOriginal: '2026-11-17',
  anteriores: [],
  diaPropuesto: '2026-11-19',
  diasLibres: ['2026-11-19', '2026-11-20'],
} as unknown as Propuesta;

function props(extra: Partial<TarjetaBarrerasProps> = {}): TarjetaBarrerasProps {
  return {
    propuesta: PROPUESTA,
    hoy: HOY,
    barrera: null,
    alternativas: [],
    indice: 1,
    total: 1,
    ocupado: false,
    onBarrera: jest.fn(),
    onLigero: jest.fn(),
    onMover: jest.fn(),
    onOtroDia: jest.fn(),
    onDejar: jest.fn(),
    ...extra,
  };
}

describe('TarjetaBarreras', () => {
  it('pregunta qué se atravesó con 3 opciones y deja no decirlo', async () => {
    const p = props();
    await render(<TarjetaBarreras {...p} />);
    expect(screen.getByText('«Caminar 5 min» no salió ayer. Pasa. ¿Qué se atravesó?')).toBeTruthy();
    await fireEvent.press(screen.getByText('No me alcanzó el tiempo'));
    expect(p.onBarrera).toHaveBeenCalledWith('tiempo');
    await fireEvent.press(screen.getByText('Prefiero no decir'));
    expect(p.onBarrera).toHaveBeenCalledWith(null);
  });

  it('CP-13: con falta de tiempo ofrece la versión ligera en un toque', async () => {
    const p = props({
      barrera: 'tiempo',
      alternativas: [
        { tipo: 'ligero', paso: { titulo: 'Caminar 2 min', duracion_min: 2 } },
        { tipo: 'mover', fecha: '2026-11-19' },
      ],
    });
    await render(<TarjetaBarreras {...p} />);
    expect(screen.getByText('Ese día no cuenta en contra.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Probar «Caminar 2 min», de 2 min'));
    expect(p.onLigero).toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Moverlo a mañana'));
    expect(p.onMover).toHaveBeenCalledWith('2026-11-19');
    await fireEvent.press(screen.getByText('Dejarlo así'));
    expect(p.onDejar).toHaveBeenCalled();
  });
});
