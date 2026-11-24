/**
 * @file PantallaCrearMeta.test.tsx
 * @proyecto most.
 * @descripcion Pruebas de «Crear meta» (RF-03): CP-01 descompone «Leer 20 minutos al día» en una
 *   lista ordenada y guarda la secuencia empezando en el paso 1; CP-02 con la meta vacía no pide
 *   micro-pasos, resalta el campo con un mensaje neutro y conserva lo capturado.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.1.0
 * @historial 1.0.0 (2026-11-23): creación.
 *   1.1.0 (2026-11-24): UC-01, sin perfil de la encuesta se invita a responderla; hora del perfil.
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { crearHabito } from '@/db/habits-repository';
import { leerGlobalesFormulario } from '@/db/plan-repository';
import { descomponerMeta } from '@/db/metasRepositorio';
import { ESPERA_TOQUE_MS } from '@/lib/candado';
import { es } from '@/i18n/es';
import { navegar } from '@/lib/navegar';

import { PantallaCrearMeta } from '../PantallaCrearMeta';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/components/ui/back-button', () => ({ BackButton: () => null }));
jest.mock('@/db/habits-repository', () => ({ crearHabito: jest.fn() }));
jest.mock('@/db/metasRepositorio', () => ({ descomponerMeta: jest.fn() }));
jest.mock('@/db/settings-repository', () => ({
  leerAjustesLocales: jest.fn(async () => ({
    horaManana: '08:00',
    horas: { manana: '08:00', mediodia: '13:00', tarde: '17:00', noche: '20:30' },
  })),
}));
// Perfil de la encuesta (UC-01): por defecto, quien prefiere la noche.
jest.mock('@/db/plan-repository', () => ({
  leerGlobalesFormulario: jest.fn(async () => ({
    tiempo: '10_20',
    disponibilidad: [['noche'], ['noche'], ['noche'], ['noche'], ['noche'], ['noche'], ['noche']],
    obstaculos: ['poco_tiempo'],
    acompanamiento: 'recordatorio_suave',
  })),
}));
jest.mock('@/features/auth/session-context', () => ({
  useSession: () => ({ session: { user: { id: 'u1' } } }),
}));
jest.mock('@/lib/navegar', () => ({ navegar: { back: jest.fn(), replace: jest.fn() } }));

// ===== Datos de prueba =====

const META = 'Leer 20 minutos al día';

const PROPUESTA = {
  categoria: 'trabajo' as const,
  titulo: META,
  descripcion: '',
  micro_pasos: [1, 2, 3].map((orden) => ({
    orden,
    titulo: `Abrir el libro y leer ${orden * 5} min`,
    descripcion: '',
    duracion_min: orden * 5,
    duracion_reducida_min: 2,
    dias_semana: [1, 2, 3, 4, 5, 6, 7],
  })),
};

const t = es.crearMeta;
const PALABRAS_DE_CULPA = /fallaste|fracaso|error tuyo|perdiste/i;

const pedir = descomponerMeta as jest.MockedFunction<typeof descomponerMeta>;
const guardar = crearHabito as jest.MockedFunction<typeof crearHabito>;

// ===== Pruebas =====

describe('PantallaCrearMeta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('CP-01: descompone la meta en una lista ordenada y guarda la secuencia desde el paso 1', async () => {
    pedir.mockResolvedValue({ ok: true, propuesta: PROPUESTA });
    await render(<PantallaCrearMeta />);

    await fireEvent.changeText(screen.getByLabelText(t.campo), META);
    await fireEvent.press(screen.getByText(es.onboarding.formulario.areas.trabajo));
    await fireEvent.press(screen.getByText(t.descomponer));

    expect(pedir).toHaveBeenCalledWith(META, 'trabajo');
    const titulos = screen.getAllByText(/Abrir el libro y leer/).map((n) => n.props.children);
    expect(titulos).toEqual([
      'Abrir el libro y leer 5 min',
      'Abrir el libro y leer 10 min',
      'Abrir el libro y leer 15 min',
    ]);

    await act(async () => {
      jest.advanceTimersByTime(ESPERA_TOQUE_MS);
    });
    await fireEvent.press(screen.getByText(t.usar));

    // El hábito arranca con el primer micro-paso y guarda toda la secuencia.
    expect(guardar).toHaveBeenCalledTimes(1);
    const [, datos, pasos] = guardar.mock.calls[0] ?? [];
    expect(datos?.nombre).toBe('Abrir el libro y leer 5 min');
    // El recordatorio cae en el momento del perfil (noche), no en una hora fija.
    expect(datos?.hora).toBe('20:30');
    expect(pasos).toHaveLength(3);
  });

  it('CP-02: con la meta vacía no pide micro-pasos, avisa con tono neutro y conserva lo capturado', async () => {
    await render(<PantallaCrearMeta />);

    await fireEvent.press(screen.getByText(es.onboarding.formulario.areas.trabajo));
    await fireEvent.changeText(screen.getByLabelText(t.campo), '   ');
    await fireEvent.press(screen.getByText(t.descomponer));

    expect(pedir).not.toHaveBeenCalled();
    expect(guardar).not.toHaveBeenCalled();
    expect(screen.getByText(t.errores.vacia)).toBeTruthy();
    expect(t.errores.vacia).not.toMatch(PALABRAS_DE_CULPA);
    // Sigue en el formulario con el área elegida (no se borra lo capturado).
    expect(screen.getByText(t.descomponer)).toBeTruthy();
    const [pastilla] = screen.getAllByLabelText(es.onboarding.formulario.areas.trabajo);
    expect(pastilla).toBeSelected();
  });

  it('UC-01: sin el perfil de la encuesta no se generan micro-pasos y se invita a responderla', async () => {
    (leerGlobalesFormulario as jest.Mock).mockResolvedValueOnce(null);
    await render(<PantallaCrearMeta />);
    await act(async () => {});

    expect(screen.getByText(t.sinPerfilTitulo)).toBeTruthy();
    expect(screen.queryByText(t.descomponer)).toBeNull();
    await fireEvent.press(screen.getByText(t.sinPerfilBoton));
    expect(navegar.replace).toHaveBeenCalledWith({
      pathname: '/plan-nuevo/[paso]',
      params: { paso: '1' },
    });
    expect(pedir).not.toHaveBeenCalled();
  });
});
