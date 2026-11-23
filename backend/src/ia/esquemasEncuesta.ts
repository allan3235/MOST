/**
 * @file esquemasEncuesta.ts
 * @proyecto most.
 * @descripcion Claves de la encuesta inicial de 7 pasos y su validación. Copia de
 *   mobile/src/schemas/onboarding.ts (solo lo que el backend necesita).
 *   TODO(Allan): moverlo a compartido/ en la Fase 2 para no tenerlo duplicado.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { z } from 'zod';

// ===== Constantes =====

export const AREAS = ['salud_fisica', 'trabajo', 'salud_mental', 'finanzas', 'social'] as const;

export const OBJETIVOS_POR_AREA = {
  salud_fisica: [
    'mover_mas',
    'dormir_mejor',
    'comer_mejor',
    'tomar_agua',
    'estirarme',
    'aire_libre',
    'pausas_activas',
  ],
  trabajo: [
    'organizar_dia',
    'procrastinar_menos',
    'aprender_algo',
    'leer_mas',
    'ordenar_espacio',
    'practicar_habilidad',
    'concentrarme',
  ],
  salud_mental: [
    'manejar_estres',
    'desconectar_pantallas',
    'tiempo_para_mi',
    'agradecer_mas',
    'escribir_diario',
    'meditar',
    'crear_algo',
  ],
  finanzas: [
    'saber_gastos',
    'empezar_ahorrar',
    'evitar_impulsivas',
    'pagar_a_tiempo',
    'aprender_finanzas',
    'planear_compras',
    'ordenar_cuentas',
  ],
  social: [
    'mantener_contacto',
    'tiempo_de_calidad',
    'conocer_gente',
    'escuchar_mejor',
    'ayudar_a_alguien',
    'agradecer_a_otros',
    'retomar_amistad',
  ],
} as const satisfies Record<(typeof AREAS)[number], readonly string[]>;

const OBJETIVOS = Object.values(OBJETIVOS_POR_AREA).flat() as [string, ...string[]];
const MAX_AREAS = 2;
const MAX_OBJETIVOS = 2;

/** Minutos al día según la pregunta 4 (definición 5: 10, 20, 40 o 60). */
export const PRESUPUESTO_POR_TIEMPO = {
  menos_10: 10,
  '10_20': 20,
  '20_40': 40,
  mas_40: 60,
} as const;

// ===== Tipos =====

export type Area = (typeof AREAS)[number];

// ===== Funciones auxiliares =====

/**
 * Área a la que pertenece un objetivo.
 * @param objetivo Clave del objetivo.
 * @returns El área, o undefined si la clave no existe.
 */
export function buscarAreaDeObjetivo(objetivo: string): Area | undefined {
  return AREAS.find((area) => (OBJETIVOS_POR_AREA[area] as readonly string[]).includes(objetivo));
}

function esSinRepetidos(lista: readonly string[]): boolean {
  return new Set(lista).size === lista.length;
}

// ===== Esquemas =====

export const esquemaArea = z.enum(AREAS, { message: 'Área inválida' });

export const esquemaRespuestas = z
  .object({
    areas: z.array(esquemaArea).min(1).max(MAX_AREAS).refine(esSinRepetidos),
    objetivos: z.array(z.enum(OBJETIVOS)).min(1).max(MAX_OBJETIVOS).refine(esSinRepetidos),
    historial: z.enum(['primera_vez', 'empieza_y_deja', 'semanas_y_suelta', 'mantiene']),
    tiempo: z.enum(['menos_10', '10_20', '20_40', 'mas_40']),
    momento: z.enum(['manana', 'mediodia', 'tarde', 'noche', 'varia']),
    obstaculo: z.enum([
      'poco_tiempo',
      'olvido',
      'motivacion',
      'desanimo',
      'distraccion',
      'recursos',
    ]),
    acompanamiento: z.enum([
      'resumen_nocturno',
      'recordatorio_suave',
      'recordatorio_y_animo',
      'minimo',
    ]),
  })
  .refine(
    (respuestas) =>
      respuestas.objetivos.every((objetivo) => {
        const area = buscarAreaDeObjetivo(objetivo);
        return area !== undefined && respuestas.areas.includes(area);
      }),
    { message: 'Cada objetivo debe pertenecer a un área elegida', path: ['objetivos'] },
  );

export type Respuestas = z.infer<typeof esquemaRespuestas>;
