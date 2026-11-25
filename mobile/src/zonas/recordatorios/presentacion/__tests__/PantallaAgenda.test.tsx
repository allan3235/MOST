/**
 * @file PantallaAgenda.test.tsx
 * @proyecto most.
 * @descripcion Prueba de Mi agenda (RF-02, D-04): al guardar un bloque, un recordatorio que ya
 *   caía en esa franja se avisa y se mueve a la primera hora libre en un toque.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { guardarBloque, leerBloques } from '@/zonas/recordatorios/logica/servicioAgenda';
import { cambiarHoraRecordatorio, leerHabitos } from '@/db/habits-repository';
import { es, formatear } from '@/comun/i18n/es';

import PantallaAgenda from '@/zonas/recordatorios/presentacion/PantallaAgenda';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/comun/presentacion/ui/back-button', () => ({ BackButton: () => null }));
// La barra animada usa Reanimated, que no corre en Jest: basta con ver su texto.
jest.mock('@/comun/presentacion/ui/snackbar', () => ({
  Snackbar: ({ mensaje }: { mensaje: string | null }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return mensaje ? <Text>{mensaje}</Text> : null;
  },
}));
jest.mock('@/zonas/cuenta/presentacion/session-context', () => ({
  useSession: () => ({ session: { user: { id: 'u1' } } }),
}));
jest.mock('@/comun/presentacion/use-local-query', () => ({ useLocalQuery: () => ({ data: [] }) }));
jest.mock('@/zonas/recordatorios/logica/servicioAgenda', () => ({
  leerBloques: jest.fn(),
  guardarBloque: jest.fn(async () => undefined),
  eliminarBloque: jest.fn(),
}));
jest.mock('@/db/habits-repository', () => ({
  leerHabitos: jest.fn(),
  cambiarHoraRecordatorio: jest.fn(async () => undefined),
}));
// El diálogo real usa el reloj nativo; aquí basta con un botón que guarda la clase.
jest.mock('@/zonas/recordatorios/presentacion/componentes/DialogoBloque', () => ({
  DialogoBloque: ({ onGuardar }: { onGuardar: (d: unknown) => void }) => {
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <Pressable
        onPress={() =>
          onGuardar({
            nombre: 'Clase',
            dias_semana: [1, 3, 5],
            hora_inicio: '10:00',
            hora_fin: '11:00',
          })
        }
      >
        <Text>guardar-clase</Text>
      </Pressable>
    );
  },
}));

// ===== Datos de prueba =====

const CLASE = {
  id: 'b1',
  nombre: 'Clase',
  dias_semana: [1, 3, 5],
  hora_inicio: '10:00:00',
  hora_fin: '11:00:00',
};

function habitoConHorario(id: string, titulo: string, hora: string) {
  return {
    habito: { id, titulo, duracion_min: 5, activo: true },
    horario: { dias_semana: [1, 2, 3, 4, 5], hora, notificar: true, flexible: false },
  };
}

const t = es.agenda;

// ===== Pruebas =====

describe('PantallaAgenda (D-04)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (leerBloques as jest.Mock).mockResolvedValue([CLASE]);
    (leerHabitos as jest.Mock).mockResolvedValue([
      habitoConHorario('h1', 'Estirar', '10:30:00'),
      habitoConHorario('h2', 'Tomar agua', '08:00:00'),
    ]);
  });

  it('avisa del recordatorio que quedó dentro del bloque nuevo y lo mueve a las 11:00', async () => {
    await render(<PantallaAgenda />);
    await fireEvent.press(screen.getByText(t.agregar));
    await fireEvent.press(screen.getByText('guardar-clase'));
    await act(async () => {});

    expect(guardarBloque).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(formatear(t.revisar, { habito: 'Estirar', bloque: 'Clase', hora: '11:00' })),
    ).toBeTruthy();
    // «Tomar agua» (08:00) no choca: no se pregunta por él.
    expect(screen.queryByText(/Tomar agua/)).toBeNull();

    await fireEvent.press(screen.getByText(formatear(t.mover, { hora: '11:00' })));
    await act(async () => {});
    expect(cambiarHoraRecordatorio).toHaveBeenCalledWith('u1', 'h1', '11:00');
    expect(
      screen.getByText(formatear(t.movido, { habito: 'Estirar', hora: '11:00' })),
    ).toBeTruthy();
  });

  it('«Dejarlo así» no cambia el recordatorio', async () => {
    await render(<PantallaAgenda />);
    await fireEvent.press(screen.getByText(t.agregar));
    await fireEvent.press(screen.getByText('guardar-clase'));
    await act(async () => {});

    await fireEvent.press(screen.getByText(t.dejar));
    expect(cambiarHoraRecordatorio).not.toHaveBeenCalled();
    expect(screen.queryByText(/quedó dentro de/)).toBeNull();
  });
});
