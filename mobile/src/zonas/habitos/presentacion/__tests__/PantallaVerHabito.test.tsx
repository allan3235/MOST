/**
 * @file PantallaVerHabito.test.tsx
 * @proyecto most.
 * @descripcion Pruebas de la vista previa de un hábito: muestra sus datos y sus micro-pasos, sin
 *   botón de editar (eso vive en el menú ⋮).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-25
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-25): creación.
 */

import { act, render, screen } from '@testing-library/react-native';

import { es } from '@/comun/i18n/es';
import { leerVistaHabito, type VistaHabito } from '@/zonas/habitos/logica/servicioHabitos';

import PantallaVerHabito from '../PantallaVerHabito';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/comun/presentacion/ui/back-button', () => ({ BackButton: () => null }));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: 'h1' }) }));
jest.mock('@/zonas/habitos/logica/servicioHabitos', () => ({ leerVistaHabito: jest.fn() }));

// ===== Datos de prueba =====

const VISTA: VistaHabito = {
  habito: {
    id: 'h1',
    category_id: 'c1',
    plan_id: null,
    paso_actual: 2,
    titulo: 'Leer por las noches',
    descripcion: 'Poco a poco.',
    duracion_min: 5,
    activo: true,
    archivado_en: null,
  },
  horario: {
    id: 's1',
    habit_id: 'h1',
    dias_semana: [1, 3, 5],
    hora: '20:30:00',
    flexible: false,
    notificar: true,
    vigente_desde: '2026-11-20',
    vigente_hasta: null,
  } as unknown as VistaHabito['horario'],
  categoria: 'trabajo',
  inicio: '2026-11-20',
  programadoHoy: true,
  hecho: false,
  pasos: [1, 2, 3].map((orden) => ({
    habit_id: 'h1',
    orden,
    titulo: `Leer ${orden * 2} min`,
    descripcion: null,
    duracion_min: orden * 2,
    duracion_reducida_min: 2,
    dias_semana: [1, 3, 5],
  })),
  avance: { hechos: 3, meta: 10 },
};

// ===== Pruebas =====

describe('PantallaVerHabito', () => {
  it('muestra los datos y los micro-pasos, sin abrir la edición', async () => {
    (leerVistaHabito as jest.Mock).mockResolvedValue(VISTA);
    await render(<PantallaVerHabito />);
    await act(async () => {});

    expect(screen.getByText('Leer por las noches')).toBeTruthy();
    expect(screen.getByText('20:30')).toBeTruthy();
    expect(screen.getByText(es.habitos.vista.hoyToca)).toBeTruthy();
    expect(screen.getByText('Leer 6 min')).toBeTruthy();
    expect(screen.getByText(es.habitos.vista.comoEditar)).toBeTruthy();
    expect(screen.queryByText(es.habitForm.editarTitulo)).toBeNull();
  });

  it('si el hábito ya no existe lo dice sin error', async () => {
    (leerVistaHabito as jest.Mock).mockResolvedValue(null);
    await render(<PantallaVerHabito />);
    await act(async () => {});
    expect(screen.getByText(es.habitos.vista.noEncontrado)).toBeTruthy();
  });
});
