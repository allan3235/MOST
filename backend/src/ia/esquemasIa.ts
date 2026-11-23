/**
 * @file esquemasIa.ts
 * @proyecto most.
 * @descripcion Forma de lo que responde la IA (salida estructurada) y de lo que el backend
 *   entrega a la app. Los esquemas de la IA solo revisan la estructura: los límites de MOST
 *   (minutos, cantidad de pasos, candado mínimo) los aplica reglasMicroPasos.ts, para no depender
 *   de que el modelo los obedezca.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { z } from 'zod';

import { esquemaArea, type Area } from './esquemasEncuesta.js';

// ===== Esquemas de la IA =====

const esquemaPasoIa = z.object({
  titulo: z.string().describe('Empieza con un verbo; menciona los minutos si tiene duración'),
  descripcion: z.string().describe('Una frase concreta y amable'),
  duracion_min: z.number().int().describe('Minutos; 0 si es un recordatorio sin duración'),
  duracion_reducida_min: z
    .number()
    .int()
    .describe('Versión para días difíciles; 0 si no tiene duración'),
  dias_semana: z.array(z.number().int()).describe('Días ISO: 1 = lunes … 7 = domingo'),
});

const esquemaHabitoIa = z.object({
  objetivo: z.string().describe('La clave del objetivo recibido, igual que llegó'),
  titulo: z.string().describe('Nombre corto del hábito'),
  descripcion: z.string(),
  micro_pasos: z.array(esquemaPasoIa).describe('De 3 a 5 pasos, del más ligero al más exigente'),
});

/** Respuesta de la IA para un plan desde la encuesta. */
export const esquemaPlanIa = z.object({
  resumen: z.string().describe('Por qué el plan empieza pequeño, sin culpa'),
  habitos: z.array(esquemaHabitoIa),
});

/** Respuesta de la IA para una meta escrita por la persona. */
export const esquemaMetaIa = z.object({
  es_apropiada: z
    .boolean()
    .describe('false si la meta pide algo médico, peligroso o que no es un hábito'),
  habito: esquemaHabitoIa,
});

/** Respuesta del modelo pequeño: un paso intermedio más ligero que el actual. */
export const esquemaPasoLigeroIa = z.object({ paso: esquemaPasoIa });

export type PasoIa = z.infer<typeof esquemaPasoIa>;
export type HabitoIa = z.infer<typeof esquemaHabitoIa>;
export type PlanIa = z.infer<typeof esquemaPlanIa>;
export type MetaIa = z.infer<typeof esquemaMetaIa>;

// ===== Lo que recibe la app =====

export type MicroPaso = {
  orden: number;
  titulo: string;
  descripcion: string;
  duracion_min: number;
  duracion_reducida_min: number;
  dias_semana: number[];
};

export type HabitoPropuesto = {
  objetivo: string | null;
  categoria: Area;
  titulo: string;
  descripcion: string;
  /** Paso con el que empieza (P3: 2 si la persona ya mantiene hábitos, si no 1). */
  paso_inicial: number;
  /** P6 "poco_tiempo": empieza con la versión reducida. */
  usa_duracion_reducida: boolean;
  micro_pasos: MicroPaso[];
};

export type OrigenPropuesta = 'ia' | 'catalogo';

export type BorradorPlan = {
  origen: OrigenPropuesta;
  resumen: string;
  habitos: HabitoPropuesto[];
};

// ===== Peticiones a /ia =====

const LARGO_MINIMO_META = 3;
const LARGO_MAXIMO_META = 120;

export const esquemaPeticionMeta = z.object({
  texto: z
    .string()
    .trim()
    .min(LARGO_MINIMO_META, 'Escribe tu meta (3 caracteres o más)')
    .max(LARGO_MAXIMO_META, `La meta debe tener ${LARGO_MAXIMO_META} caracteres o menos`),
  categoria: esquemaArea,
});

export const esquemaPeticionPasoLigero = z.object({ habit_id: z.uuid('Hábito inválido') });
