import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { almacenSincrono } from '@/comun/datos/almacen-local';

import {
  normalizarRespuestas,
  type Area,
  type Disponibilidad,
  type Objetivo,
  type Obstaculo,
} from '@/comun/modelo/esquemas/onboarding';

import {
  alternarArea,
  alternarObjetivo,
  alternarObstaculo,
  BORRADOR_VACIO,
  type Borrador,
} from './form-rules';
import type { Retomar } from './retomar';

// Avance del formulario inicial (SDD 5.3). Vive en Zustand y se guarda en el almacén clave-valor
// de expo-sqlite, así que si se cierra la app las respuestas siguen ahí. Se usa la versión
// síncrona del almacén para que las respuestas ya estén cargadas al abrir la primera pantalla.
// También se guarda en qué pantalla va (`retomar`), para volver ahí si se cierra la app.

type PreguntaUnica = Exclude<
  keyof Borrador,
  'areas' | 'objetivos' | 'disponibilidad' | 'obstaculos'
>;

type OnboardingState = {
  /** Dueño de las respuestas: si entra otra cuenta en el mismo teléfono, se empieza de cero. */
  userId: string | null;
  borrador: Borrador;
  /** Paso del formulario o revisión del plan donde se quedó; null fuera del formulario. */
  retomar: Retomar | null;
  /** Plan siguiente (3 pasos): las respuestas globales ya vienen del primer plan. */
  adicional: boolean;
  /** Áreas que ya tienen un plan activo: no se pueden elegir en P1. */
  areasOcupadas: Area[];
  marcarRetomar: (retomar: Retomar | null) => void;
  prepararPara: (userId: string) => void;
  /**
   * Crear un plan desde la app (Perfil → Mis planes). Con `globales` es un plan siguiente de 3
   * pasos; sin ellas (nunca hizo el formulario) son los 7 pasos.
   */
  prepararNuevoPlan: (userId: string, globales: Partial<Borrador> | null, ocupadas: Area[]) => void;
  /** Con 2 ya elegidos, el nuevo reemplaza al primero que se eligió. */
  alternarArea: (area: Area) => void;
  alternarObjetivo: (objetivo: Objetivo) => void;
  /** P5: la disponibilidad completa (botones generales o cuadrícula por día). */
  cambiarDisponibilidad: (disponibilidad: Disponibilidad) => void;
  /** P6: varias respuestas. */
  alternarObstaculo: (obstaculo: Obstaculo) => void;
  responder: <K extends PreguntaUnica>(pregunta: K, valor: NonNullable<Borrador[K]>) => void;
  reiniciar: () => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      userId: null,
      borrador: BORRADOR_VACIO,
      retomar: null,
      adicional: false,
      areasOcupadas: [],

      marcarRetomar: (retomar) => set({ retomar }),

      prepararPara: (userId) => {
        if (get().userId !== userId) set({ userId, borrador: BORRADOR_VACIO, retomar: null });
        set({ adicional: false, areasOcupadas: [] });
      },

      prepararNuevoPlan: (userId, globales, ocupadas) =>
        set({
          userId,
          borrador: { ...BORRADOR_VACIO, ...(globales ?? {}) },
          retomar: null,
          adicional: globales !== null,
          areasOcupadas: ocupadas,
        }),

      alternarArea: (area) => {
        const { borrador } = get();
        set({ borrador: { ...borrador, ...alternarArea(borrador, area) } });
      },

      alternarObjetivo: (objetivo) => {
        const { borrador } = get();
        set({ borrador: { ...borrador, objetivos: alternarObjetivo(borrador, objetivo) } });
      },

      cambiarDisponibilidad: (disponibilidad) =>
        set({ borrador: { ...get().borrador, disponibilidad } }),

      alternarObstaculo: (obstaculo) => {
        const { borrador } = get();
        set({
          borrador: { ...borrador, obstaculos: alternarObstaculo(borrador.obstaculos, obstaculo) },
        });
      },

      responder: (pregunta, valor) => set({ borrador: { ...get().borrador, [pregunta]: valor } }),

      reiniciar: () =>
        set({ borrador: BORRADOR_VACIO, retomar: null, adicional: false, areasOcupadas: [] }),
    }),
    {
      name: 'most-onboarding',
      // 2: P5 por día y P6 con varias respuestas; un borrador guardado antes se convierte.
      version: 2,
      migrate: (guardado) => {
        const estado = (guardado ?? {}) as { borrador?: unknown };
        const borrador = normalizarRespuestas(estado.borrador) as Partial<Borrador> | undefined;
        return { ...estado, borrador: { ...BORRADOR_VACIO, ...(borrador ?? {}) } } as never;
      },
      storage: createJSONStorage(() => almacenSincrono),
      partialize: (state) => ({
        userId: state.userId,
        borrador: state.borrador,
        retomar: state.retomar,
        adicional: state.adicional,
        areasOcupadas: state.areasOcupadas,
      }),
    },
  ),
);
