/**
 * @file encuesta.ts
 * @proyecto most.
 * @descripcion Claves y validación de la encuesta inicial de 7 pasos (antes mobile/src/schemas/onboarding.ts).
 *   Paquete compartido por la app y el backend.
 * @autor Equipo most. (código heredado de Habit Green; movido por Allan con Claude Code)
 * @fecha 2026-11-23
 * @version 2.0.0
 * @historial 1.0.0 (2026-11-23): se mueve a @most/compartido.
 *   2.0.0 (2026-11-24): P5 con varios momentos y por día (`disponibilidad`), P6 con varias
 *   respuestas (`obstaculos`). Las respuestas de la versión 3 se convierten al leerlas.
 */

import { z } from 'zod';

// Claves estables del formulario inicial (SDD 5.1–5.3). En la base de datos solo se guardan estas
// claves; los textos visibles viven en i18n. Este archivo se comparte con las Edge Functions, así
// que solo puede importar zod (nada de React Native ni de Expo).

export const VERSION_FORMULARIO = 4;
/** Días de la semana (ISO: 1 = lunes … 7 = domingo). */
export const DIAS_SEMANA = 7;
/** Áreas que acepta el esquema: las respuestas de antes de los planes por área tienen hasta 2. */
export const MAX_AREAS = 2;
/** Un plan es de una sola área (varios planes por usuario): lo que permite elegir el formulario. */
export const MAX_AREAS_POR_PLAN = 1;
export const MAX_OBJETIVOS = 2;

export const AREAS = ['salud_fisica', 'trabajo', 'salud_mental', 'finanzas', 'social'] as const;
export type Area = (typeof AREAS)[number];

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
} as const satisfies Record<Area, readonly string[]>;

export const OBJETIVOS = [
  'mover_mas',
  'dormir_mejor',
  'comer_mejor',
  'tomar_agua',
  'organizar_dia',
  'procrastinar_menos',
  'aprender_algo',
  'manejar_estres',
  'desconectar_pantallas',
  'tiempo_para_mi',
  'saber_gastos',
  'empezar_ahorrar',
  'evitar_impulsivas',
  'mantener_contacto',
  'tiempo_de_calidad',
  'conocer_gente',
  'estirarme',
  'aire_libre',
  'pausas_activas',
  'leer_mas',
  'ordenar_espacio',
  'practicar_habilidad',
  'concentrarme',
  'agradecer_mas',
  'escribir_diario',
  'meditar',
  'crear_algo',
  'pagar_a_tiempo',
  'aprender_finanzas',
  'planear_compras',
  'ordenar_cuentas',
  'escuchar_mejor',
  'ayudar_a_alguien',
  'agradecer_a_otros',
  'retomar_amistad',
] as const;
export type Objetivo = (typeof OBJETIVOS)[number];

export const HISTORIALES = [
  'primera_vez',
  'empieza_y_deja',
  'semanas_y_suelta',
  'mantiene',
] as const;
export type Historial = (typeof HISTORIALES)[number];

export const TIEMPOS = ['menos_10', '10_20', '20_40', 'mas_40'] as const;
export type Tiempo = (typeof TIEMPOS)[number];

export const MOMENTOS = ['manana', 'mediodia', 'tarde', 'noche', 'varia'] as const;
/** `varia` ya no se pregunta: es el resultado de una disponibilidad que cambia según el día. */
export type Momento = (typeof MOMENTOS)[number];
/** Momentos con hora concreta (todos menos `varia`); es lo que puede traer `momento_fijo`. */
export type MomentoConHora = Exclude<Momento, 'varia'>;
/** Lo que se elige en la P5, en orden del día. */
export const MOMENTOS_CON_HORA = ['manana', 'mediodia', 'tarde', 'noche'] as const satisfies
  readonly MomentoConHora[];
/** P5: momentos libres de cada día; índice 0 = lunes … 6 = domingo. */
export type Disponibilidad = MomentoConHora[][];

export const OBSTACULOS = [
  'poco_tiempo',
  'olvido',
  'motivacion',
  'desanimo',
  'distraccion',
  'recursos',
] as const;
export type Obstaculo = (typeof OBSTACULOS)[number];

export const ACOMPANAMIENTOS = [
  'resumen_nocturno',
  'recordatorio_suave',
  'recordatorio_y_animo',
  'minimo',
] as const;
export type Acompanamiento = (typeof ACOMPANAMIENTOS)[number];

export const areaSchema = z.enum(AREAS);
export const objetivoSchema = z.enum(OBJETIVOS);

/** Área a la que pertenece un objetivo. */
export function areaDeObjetivo(objetivo: Objetivo): Area {
  const area = AREAS.find((a) => (OBJETIVOS_POR_AREA[a] as readonly string[]).includes(objetivo));
  // Cada objetivo está en exactamente un área; si no, el catálogo de claves está mal escrito.
  if (area === undefined) throw new Error(`Objetivo sin área: ${objetivo}`);
  return area;
}

function sinRepetidos(lista: readonly string[]): boolean {
  return new Set(lista).size === lista.length;
}

const momentoConHoraSchema = z.enum(MOMENTOS_CON_HORA);
const obstaculoSchema = z.enum(OBSTACULOS);

/** P5: 7 días, cada uno con sus momentos libres (sin repetir); al menos un momento en la semana. */
export const disponibilidadSchema = z
  .array(z.array(momentoConHoraSchema).refine(sinRepetidos))
  .length(DIAS_SEMANA)
  .refine((dias) => dias.some((momentos) => momentos.length > 0), {
    message: 'Elige al menos un momento.',
  });

/** P6: una o varias, sin repetir (decisión del usuario: todas las que quiera). */
export const obstaculosSchema = z.array(obstaculoSchema).min(1).refine(sinRepetidos);

/** La misma lista de momentos para los 7 días. */
export function disponibilidadIgual(momentos: readonly MomentoConHora[]): Disponibilidad {
  return Array.from({ length: DIAS_SEMANA }, () => [...momentos]);
}

/**
 * Convierte respuestas de la versión 3 (un `momento` y un `obstaculo`) a la versión 4. «Varía»
 * pasa a «cualquier momento, todos los días»: sin un momento fijo, el aviso sigue siendo flexible.
 * Lo que no es un objeto o ya está en la versión 4 se deja igual.
 * @param valor Respuestas tal como vienen de la base.
 * @returns Las mismas respuestas con los campos de la versión 4.
 */
export function normalizarRespuestas(valor: unknown): unknown {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return valor;
  }
  const { momento, obstaculo, ...resto } = valor as Record<string, unknown>;
  const normal: Record<string, unknown> = { ...resto };
  if (normal.disponibilidad === undefined && typeof momento === 'string') {
    normal.disponibilidad =
      momento === 'varia'
        ? disponibilidadIgual(MOMENTOS_CON_HORA)
        : disponibilidadIgual([momento as MomentoConHora]);
  }
  if (normal.obstaculos === undefined && typeof obstaculo === 'string') {
    normal.obstaculos = [obstaculo];
  }
  return normal;
}

const respuestasBaseSchema = z
  .object({
    areas: z.array(areaSchema).min(1).max(MAX_AREAS).refine(sinRepetidos),
    objetivos: z.array(objetivoSchema).min(1).max(MAX_OBJETIVOS).refine(sinRepetidos),
    historial: z.enum(HISTORIALES),
    tiempo: z.enum(TIEMPOS),
    disponibilidad: disponibilidadSchema,
    obstaculos: obstaculosSchema,
    acompanamiento: z.enum(ACOMPANAMIENTOS),
  })
  .refine((r) => r.objetivos.every((o) => r.areas.includes(areaDeObjetivo(o))), {
    message: 'Cada objetivo debe pertenecer a un área elegida.',
    path: ['objetivos'],
  });

/** Respuestas completas; acepta también las de la versión 3 (se convierten al validar). */
export const respuestasSchema = z.preprocess(normalizarRespuestas, respuestasBaseSchema);

/** P4 a P7: lo que comparten todos los planes de la persona (su perfil). */
export const globalesSchema = z.preprocess(
  normalizarRespuestas,
  z.object({
    tiempo: z.enum(TIEMPOS),
    disponibilidad: disponibilidadSchema,
    obstaculos: obstaculosSchema,
    acompanamiento: z.enum(ACOMPANAMIENTOS),
  }),
);

export type Respuestas = z.infer<typeof respuestasBaseSchema>;
export type Globales = z.infer<typeof globalesSchema>;

/**
 * Días (ISO) en los que la persona tiene algún momento libre.
 * @param disponibilidad Respuesta de la P5.
 * @returns Días de 1 a 7, en orden.
 */
export function diasDisponibles(disponibilidad: Disponibilidad): number[] {
  return disponibilidad.flatMap((momentos, indice) => (momentos.length > 0 ? [indice + 1] : []));
}

/**
 * Momentos libres en todos los días dados (en orden del día).
 * @param disponibilidad Respuesta de la P5.
 * @param dias Días ISO.
 * @returns Los momentos que se repiten en cada uno de esos días.
 */
export function momentosComunes(
  disponibilidad: Disponibilidad,
  dias: readonly number[],
): MomentoConHora[] {
  return MOMENTOS_CON_HORA.filter((momento) =>
    dias.every((dia) => disponibilidad[dia - 1]?.includes(momento)),
  );
}

/**
 * Momento que resume la P5: el primero que se repite en todos sus días libres, o `varia` si cambia
 * según el día (o si cualquier momento le acomoda: entonces el aviso flexible encaja mejor).
 * @param disponibilidad Respuesta de la P5.
 * @returns Un momento con hora, o `varia`.
 */
export function momentoPrincipal(disponibilidad: Disponibilidad): Momento {
  const comunes = momentosComunes(disponibilidad, diasDisponibles(disponibilidad));
  return comunes.length === 0 || comunes.length === MOMENTOS_CON_HORA.length ? 'varia' : comunes[0]!;
}

/**
 * ¿La persona marcó este obstáculo en la P6?
 * @param respuestas Algo con `obstaculos`.
 * @param obstaculo Obstáculo a buscar.
 * @returns true si lo marcó.
 */
export function tieneObstaculo(
  respuestas: { obstaculos: readonly Obstaculo[] },
  obstaculo: Obstaculo,
): boolean {
  return respuestas.obstaculos.includes(obstaculo);
}
