/**
 * @file DialogoIntrospeccion.test.tsx
 * @proyecto most.
 * @descripcion Prueba del diálogo de introspección (RF-04, CP-10): escala de un toque, saltar y
 *   agradecimiento con aviso de privacidad.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ESPERA_TOQUE_MS } from '@/lib/candado';

import { DialogoIntrospeccion } from '../DialogoIntrospeccion';

// Los botones ignoran un segundo toque durante ESPERA_TOQUE_MS (toque doble): se avanza el reloj.
const esperarToque = () =>
  act(async () => {
    jest.advanceTimersByTime(ESPERA_TOQUE_MS);
  });

describe('DialogoIntrospeccion', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('CP-10: responde con la escala 1–5, salta una y guarda al terminar', async () => {
    const onTerminar = jest.fn();
    await render(<DialogoIntrospeccion motivo="semanal" onTerminar={onTerminar} />);
    expect(screen.getByText('Pregunta 1 de 3')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('4 de 5, Bastante'));
    await fireEvent.press(screen.getByText('Siguiente'));
    await esperarToque();
    await fireEvent.press(screen.getByText('Saltar'));
    await fireEvent.press(screen.getByLabelText('5 de 5, Mucho'));
    await fireEvent.press(screen.getByText('Siguiente'));
    await esperarToque();
    expect(
      screen.getByText('Tus respuestas se quedan en tu teléfono. Solo son para ti.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('Listo'));
    expect(onTerminar).toHaveBeenCalledWith({
      cerca_de_lo_importante: 4,
      amabilidad: null,
      persona_que_quiero_ser: 5,
    });
  });

  it('al pausar empieza recordando que pausar también es cuidarse', async () => {
    await render(<DialogoIntrospeccion motivo="pausa" onTerminar={jest.fn()} />);
    expect(
      screen.getByText('Pausar también es cuidarte. Si quieres, tómate un minuto para ti.'),
    ).toBeTruthy();
  });
});
