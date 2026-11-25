/**
 * @file use-check-in.test.tsx
 * @proyecto most.
 * @descripcion Pruebas del check-in (CP-07 y CP-09). CP-07: al marcar un micro-paso, la moneda
 *   animada «+10» aparece en menos de 1.5 s y se quita sola. CP-09: a los 5 de 10 y a los 8 de
 *   10 se abre la celebración del hito, con sonido si está activado, sin reiniciar la app; y la
 *   tarjeta del hito muestra el indicador actualizado.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { notificationAsync } from 'expo-haptics';

import { completarHabito } from '@/db/logs-repository';
import { leerSonidoLogros, revisarHito } from '@/zonas/plantas/logica/servicioPlantas';
import { CelebracionHito } from '@/zonas/plantas/presentacion/componentes/CelebracionHito';
import {
  CoinBurst,
  DURACION_COIN_BURST,
} from '@/zonas/plantas/presentacion/componentes/coin-burst';
import { es, formatear } from '@/comun/i18n/es';

import { useCheckIn } from '../use-check-in';

// Reanimated no corre en Jest: un mock mínimo con lo que usa la moneda animada.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View },
    Easing: { out: () => () => 0, quad: () => 0 },
    useReducedMotion: () => false,
    useSharedValue: (valor: number) => ({ value: valor }),
    useAnimatedStyle: (estilo: () => object) => estilo(),
    withTiming: (valor: number) => valor,
    withDelay: (_ms: number, valor: number) => valor,
    withSequence: (...valores: number[]) => valores.at(-1),
  };
});
jest.mock('@/db/logs-repository', () => ({
  completarHabito: jest.fn(),
  deshacerHabito: jest.fn(),
  RelojAtrasadoError: class extends Error {},
}));
jest.mock('@/comun/config/env', () => ({ env: { urlApi: 'http://prueba' } }));
// Solo se simulan las lecturas; celebrar (vibrar y sonar) es el real, con el dispositivo simulado.
jest.mock('@/zonas/plantas/logica/servicioPlantas', () => ({
  ...jest.requireActual('@/zonas/plantas/logica/servicioPlantas'),
  revisarHito: jest.fn(),
  leerSonidoLogros: jest.fn(),
}));
jest.mock('@/zonas/recordatorios/logica/servicioAvisos', () => ({
  mandarAvisoMotivacional: jest.fn(async () => undefined),
}));
jest.mock('@/comun/logica/fecha-hoy', () => ({
  useFechaHoy: { getState: () => ({ revisar: () => false }) },
}));
const mockReproducir = jest.fn(async () => undefined);
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({ seekTo: async () => undefined, play: mockReproducir }),
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success' },
}));

// ===== Datos de prueba =====

const LIMITE_RECOMPENSA_MS = 1500;
const HABITO = { id: 'abrir-libro', category_id: 'c1', categoria: 'trabajo' as const };
const META = 10;

const completar = completarHabito as jest.Mock;
const hito = revisarHito as jest.Mock;

function hitoDe(porcentaje: 50 | 80, hechos: number) {
  return { porcentaje, titulo: 'Abrir el libro', avance: { hechos, meta: META } };
}

// ===== Pruebas =====

describe('check-in de un micro-paso', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    completar.mockResolvedValue({ monedas: 10, sinMonedas: null, cambioFase: null });
    hito.mockResolvedValue(null);
    (leerSonidoLogros as jest.Mock).mockResolvedValue(true);
  });
  afterEach(() => jest.useRealTimers());

  it('CP-07: la moneda «+10» aparece en menos de 1.5 s y se quita sola', async () => {
    const { result } = await renderHook(() => useCheckIn('u1'));
    const inicio = performance.now();
    await act(async () => {
      result.current.alternar(HABITO, false);
    });
    expect(performance.now() - inicio).toBeLessThan(LIMITE_RECOMPENSA_MS);
    expect(result.current.premio?.monedas).toBe(10);
    expect(result.current.error).toBeNull();
    expect(result.current.aviso).toBeNull();
    // Lo que Hoy dibuja con ese premio: la moneda con «+10».
    await render(<CoinBurst monedas={result.current.premio?.monedas ?? 0} />);
    // Es decorativa (oculta al lector de pantalla, que recibe el anuncio aparte).
    expect(screen.getByText('+10', { includeHiddenElements: true })).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(DURACION_COIN_BURST);
    });
    expect(result.current.premio).toBeNull();
  });

  it('CP-09: celebra el 50 % a los 5 de 10 y el 80 % a los 8 de 10, sin reiniciar', async () => {
    const { result } = await renderHook(() => useCheckIn('u1'));

    hito.mockResolvedValueOnce(hitoDe(50, 5));
    await act(async () => {
      result.current.alternar(HABITO, false);
    });
    expect(result.current.hito).toMatchObject({ porcentaje: 50, sonido: true });

    await act(async () => result.current.cerrarHito());
    // 6 y 7 de 10: entre hitos no hay celebración.
    await act(async () => {
      result.current.alternar(HABITO, false);
    });
    expect(result.current.hito).toBeNull();

    hito.mockResolvedValueOnce(hitoDe(80, 8));
    await act(async () => {
      result.current.alternar(HABITO, false);
    });
    expect(result.current.hito).toMatchObject({ porcentaje: 80, avance: { hechos: 8 } });
  });

  it('CP-09: la celebración muestra el hito y el indicador, con vibración y sonido', async () => {
    const t = es.hitos;
    const onCerrar = jest.fn();
    await render(<CelebracionHito hito={{ ...hitoDe(80, 8), sonido: true }} onCerrar={onCerrar} />);
    await act(async () => {});

    expect(screen.getByText(t.titulo[80])).toBeTruthy();
    expect(screen.getByText(formatear(t.contador, { n: 8, meta: META }))).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityValue).toMatchObject({ now: 8 });
    expect(notificationAsync).toHaveBeenCalled();
    expect(mockReproducir).toHaveBeenCalled();

    await fireEvent.press(screen.getByText(t.genial));
    expect(onCerrar).toHaveBeenCalled();
  });
});
