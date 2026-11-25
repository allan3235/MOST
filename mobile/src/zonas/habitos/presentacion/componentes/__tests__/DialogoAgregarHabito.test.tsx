/**
 * @file DialogoAgregarHabito.test.tsx
 * @proyecto most.
 * @descripcion Pruebas del «+» de Hábitos: muestra las dos formas de crear un hábito con su
 *   explicación y cada opción lleva a su camino.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-25
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-25): creación.
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { es } from '@/comun/i18n/es';
import { ESPERA_TOQUE_MS } from '@/comun/presentacion/candado';

import { DialogoAgregarHabito } from '../DialogoAgregarHabito';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

// ===== Datos de prueba =====

const t = es.habitos.agregarOpciones;

// ===== Pruebas =====

describe('DialogoAgregarHabito', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('explica las dos opciones y marca micro-pasos como recomendada', async () => {
    await render(
      <DialogoAgregarHabito
        visible
        onMicroPasos={jest.fn()}
        onAMiManera={jest.fn()}
        onCerrar={jest.fn()}
      />,
    );
    expect(screen.getByText(t.titulo)).toBeTruthy();
    expect(screen.getByText(t.microPasosAyuda)).toBeTruthy();
    expect(screen.getByText(t.aMiManeraAyuda)).toBeTruthy();
    expect(screen.getByText(t.recomendado)).toBeTruthy();
  });

  it('cada opción lleva a su camino y «Cancelar» cierra', async () => {
    const onMicroPasos = jest.fn();
    const onAMiManera = jest.fn();
    const onCerrar = jest.fn();
    await render(
      <DialogoAgregarHabito
        visible
        onMicroPasos={onMicroPasos}
        onAMiManera={onAMiManera}
        onCerrar={onCerrar}
      />,
    );
    await fireEvent.press(screen.getByText(t.microPasos));
    await act(async () => {
      jest.advanceTimersByTime(ESPERA_TOQUE_MS);
    });
    await fireEvent.press(screen.getByText(t.aMiManera));
    await fireEvent.press(screen.getByText(t.cancelar));
    expect(onMicroPasos).toHaveBeenCalledTimes(1);
    expect(onAMiManera).toHaveBeenCalledTimes(1);
    expect(onCerrar).toHaveBeenCalled();
  });
});
