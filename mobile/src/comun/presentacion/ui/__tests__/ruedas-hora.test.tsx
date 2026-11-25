/**
 * @file ruedas-hora.test.tsx
 * @proyecto most.
 * @descripcion Pruebas de las ruedas de hora (iguales en Android y iPhone, RNF-11) y de «Hora del
 *   recordatorio», que antes en iPhone no abría nada.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-25
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-25): creación.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { es } from '@/comun/i18n/es';
import { ReminderDialog } from '@/zonas/habitos/presentacion/componentes/reminder-dialog';

import { formatearHora, partesDeHora, RuedasHora } from '../ruedas-hora';

// ===== Pruebas =====

describe('partesDeHora y formatearHora', () => {
  it('separan y arman "HH:MM"', () => {
    expect(partesDeHora('07:05')).toEqual({ hh: 7, mm: 5 });
    expect(partesDeHora('20:30:00')).toEqual({ hh: 20, mm: 30 });
    expect(formatearHora(7, 5)).toBe('07:05');
  });

  it('un valor raro queda en 00:00', () => {
    expect(partesDeHora('xx')).toEqual({ hh: 0, mm: 0 });
    expect(partesDeHora('25:70')).toEqual({ hh: 0, mm: 0 });
  });
});

describe('RuedasHora', () => {
  it('«Aceptar» devuelve la hora elegida tocando otra opción', async () => {
    const onAceptar = jest.fn();
    await render(<RuedasHora valor="10:00" onAceptar={onAceptar} onCancelar={jest.fn()} />);
    // «11» está en las dos ruedas: la primera es la de horas.
    const [hora11] = screen.getAllByText('11');
    if (hora11) await fireEvent.press(hora11);
    await fireEvent.press(screen.getByText(es.reloj.aceptar));
    expect(onAceptar).toHaveBeenCalledWith('11:00');
  });
});

describe('ReminderDialog en iPhone', () => {
  const plataforma = Platform.OS;

  beforeAll(() => {
    Platform.OS = 'ios';
  });

  afterAll(() => {
    Platform.OS = plataforma;
  });

  it('«Elegir hora» muestra las ruedas y guarda la hora', async () => {
    const onElegir = jest.fn();
    const onCerrar = jest.fn();
    await render(
      <ReminderDialog
        hora="08:00"
        onElegir={onElegir}
        onSinRecordatorio={jest.fn()}
        onCerrar={onCerrar}
      />,
    );
    await fireEvent.press(screen.getByText(es.habitForm.dialogoHora.elegir));
    expect(screen.getByText(es.reloj.aceptar)).toBeTruthy();
    await fireEvent.press(screen.getByText(es.reloj.aceptar));
    expect(onCerrar).toHaveBeenCalled();
    expect(onElegir).toHaveBeenCalledWith('08:00');
  });
});
