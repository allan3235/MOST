/**
 * @file esquemasSync.ts
 * @proyecto most.
 * @descripcion Tablas que se pueden sincronizar y forma de las peticiones de /sync.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.3.0
 * @historial 1.0.0 (2026-11-22): creación. 1.1.0 (2026-11-23): micro_pasos. 1.2.0: habit_pausas. 1.3.0
 *   (2026-11-24): agenda_bloques (RF-02).
 */

import { z } from 'zod';

// ===== Constantes =====

/** Tablas que la app descarga (las mismas de mobile/src/db/local-schema.ts). */
export const TABLAS_LECTURA = [
  'profiles',
  'user_settings',
  'onboarding_answers',
  'app_config',
  'categories',
  'habit_catalog',
  'plans',
  'habits',
  'habit_schedules',
  'micro_pasos',
  'habit_pausas',
  'agenda_bloques',
  'habit_occurrences',
  'habit_logs',
  'plant_progress',
  'wallets',
  'accessories',
  'user_accessories',
] as const;

/**
 * Tablas que la app escribe directamente. Los registros, plantas y monedero solo cambian con
 * complete/uncomplete/archive y la tienda. Además, las políticas RLS revisan cada fila.
 */
export const TABLAS_ESCRITURA = [
  'profiles',
  'user_settings',
  'onboarding_answers',
  'plans',
  'habits',
  'habit_schedules',
  'micro_pasos',
  'habit_pausas',
  'agenda_bloques',
  'habit_occurrences',
  'user_accessories',
] as const satisfies readonly (typeof TABLAS_LECTURA)[number][];

/** Columna de fecha para limitar la primera descarga (historial de un año, no todo). */
export const CAMPO_FECHA_POR_TABLA: Partial<Record<TablaLectura, string>> = {
  habit_logs: 'fecha',
};

export const TAMANO_PAGINA_MAXIMO = 1000;
export const OPERACIONES_POR_LOTE_MAXIMO = 50;
const FILAS_POR_UPSERT_MAXIMO = 100;

// ===== Tipos =====

export type TablaLectura = (typeof TABLAS_LECTURA)[number];
export type TablaEscritura = (typeof TABLAS_ESCRITURA)[number];

// ===== Esquemas =====

const fecha = z.iso.date({ message: 'La fecha debe tener el formato AAAA-MM-DD' });
const fila = z.record(z.string(), z.unknown());
const tablaEscritura = z.enum(TABLAS_ESCRITURA, { message: 'Tabla no permitida para escribir' });
const tablaLectura = z.enum(TABLAS_LECTURA, { message: 'Tabla no permitida' });

export const esquemaOperacion = z.discriminatedUnion('operacion', [
  z.object({
    operacion: z.literal('upsert'),
    tabla: tablaEscritura,
    filas: z.array(fila).min(1).max(FILAS_POR_UPSERT_MAXIMO),
    /** Columnas del índice único para decidir si la fila existe (por defecto, la clave). */
    enConflicto: z.array(z.string()).min(1).optional(),
  }),
  z.object({
    operacion: z.literal('update'),
    tabla: tablaEscritura,
    clave: fila,
    cambios: fila,
  }),
  z.object({
    operacion: z.literal('complete'),
    log_id: z.uuid(),
    habit_id: z.uuid(),
    fecha,
  }),
  z.object({ operacion: z.literal('uncomplete'), habit_id: z.uuid(), fecha }),
  z.object({ operacion: z.literal('archive'), habit_id: z.uuid(), fecha }),
]);

export const esquemaLote = z.object({
  operaciones: z.array(esquemaOperacion).min(1).max(OPERACIONES_POR_LOTE_MAXIMO),
});

export const esquemaCambios = z.object({
  tabla: tablaLectura,
  desde: z.string().optional(),
  desdeFecha: fecha.optional(),
  pagina: z.coerce.number().int().min(0).default(0),
  tamano: z.coerce.number().int().min(1).max(TAMANO_PAGINA_MAXIMO).default(TAMANO_PAGINA_MAXIMO),
});

export const esquemaLeerFila = z.object({ tabla: tablaLectura, clave: fila });

export type Operacion = z.infer<typeof esquemaOperacion>;
export type PeticionCambios = z.infer<typeof esquemaCambios>;

/** Lo que devuelve cada operación: las filas guardadas o el resultado de la función SQL. */
export type ResultadoOperacion = { filas: Record<string, unknown>[] } | { resultado: unknown };
