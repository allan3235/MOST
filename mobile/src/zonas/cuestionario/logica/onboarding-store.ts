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
  type Flujo,
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
  /** Qué recorrido es: la encuesta del perfil, un plan del catálogo o ambos. */
  flujo: Flujo;
  /** Áreas que ya tienen un plan activo: no se pueden elegir en P1. */
  areasOcupadas: Area[];
  /** Al terminar la encuesta de la bienvenida: Hoy abre «Crear meta» una vez (no se guarda). */
  primerHabito: boolean;
  pedirPrimerHabito: (pedir: boolean) => void;
  marcarRetomar: (retomar: Retomar | null) => void;
  /** La encuesta del perfil (UC-01), en la bienvenida o desde «Crear meta». */
  prepararPara: (userId: string) => void;
  /**
   * Crear un plan del catálogo desde la app (Perfil → Mis planes). Con `globales` (el perfil ya
   * guardado) solo se preguntan área y objetivos; sin ellas, las 7 preguntas.
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
      flujo: 'perfil',
      areasOcupadas: [],
      primerHabito: false,

      pedirPrimerHabito: (primerHabito) => set({ primerHabito }),

      marcarRetomar: (retomar) => set({ retomar }),

      prepararPara: (userId) => {
        if (get().userId !== userId) set({ userId, borrador: BORRADOR_VACIO, retomar: null });
        set({ flujo: 'perfil', areasOcupadas: [] });
      },

      prepararNuevoPlan: (userId, globales, ocupadas) =>
        set({
          userId,
          borrador: { ...BORRADOR_VACIO, ...(globales ?? {}) },
          retomar: null,
          flujo: globales !== null ? 'plan' : 'perfil_y_plan',
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
        set({ borrador: BORRADOR_VACIO, retomar: null, flujo: 'perfil', areasOcupadas: [] }),
    }),
    {
      name: 'most-onboarding',
      // 2: P5 por día y P6 con varias respuestas; un borrador guardado antes se convierte.
      // 3: la encuesta inicial es solo el perfil (`flujo` en lugar de `adicional`); quien iba a
      // mitad de los 7 pasos de la bienvenida retoma desde la primera pregunta del perfil.
      version: 3,
      migrate: (guardado) => {
        const estado = (guardado ?? {}) as {
          borrador?: unknown;
          adicional?: boolean;
          retomar?: unknown;
        };
        const { adicional, ...resto } = estado;
        const borrador = normalizarRespuestas(estado.borrador) as Partial<Borrador> | undefined;
        const enBienvenida = adicional !== true && Boolean(estado.retomar);
        return {
          ...resto,
          borrador: { ...BORRADOR_VACIO, ...(borrador ?? {}) },
          flujo: adicional === true ? 'plan' : 'perfil',
          retomar: enBienvenida ? { pantalla: 'formulario', paso: 1 } : null,
        } as never;
      },
      storage: createJSONStorage(() => almacenSincrono),
      partialize: (state) => ({
        userId: state.userId,
        borrador: state.borrador,
        retomar: state.retomar,
        flujo: state.flujo,
        areasOcupadas: state.areasOcupadas,
      }),
    },
  ),
);
