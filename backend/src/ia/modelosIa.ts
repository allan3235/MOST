/**
 * @file modelosIa.ts
 * @proyecto most.
 * @descripcion Qué modelo de Claude usa cada tarea, para no gastar de más:
 *   - plan y meta (diseñar la secuencia completa de micro-pasos) → modelo grande, esfuerzo medio.
 *   - paso_ligero (ajustar un paso de un plan que ya existe) → modelo pequeño, esfuerzo bajo.
 *   Los modelos se cambian con IA_MODELO_GRANDE e IA_MODELO_PEQUENO en backend/.env.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import type { Configuracion } from '../comun/configuracion.js';

// ===== Tipos =====

export type TareaIa = 'plan' | 'meta' | 'paso_ligero';

export type Esfuerzo = 'low' | 'medium' | 'high';

export type ConfigTarea = {
  modelo: string;
  esfuerzo: Esfuerzo;
  /**
   * Si el modelo rechaza la petición por seguridad, la API la reintenta sola en otro modelo
   * ("fallbacks" del servidor). Solo lo aceptan algunos modelos.
   */
  conRespaldoServidor: boolean;
};

// ===== Constantes =====

const MODELOS_CON_RESPALDO_SERVIDOR = new Set([
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-sonnet-5-5',
  'claude-fable-5-2',
  'claude-fable-5-1',
]);

const TAMANO_POR_TAREA: Record<TareaIa, 'grande' | 'pequeno'> = {
  plan: 'grande',
  meta: 'grande',
  paso_ligero: 'pequeno',
};

const ESFUERZO_POR_TAREA: Record<TareaIa, Esfuerzo> = {
  plan: 'medium',
  meta: 'medium',
  paso_ligero: 'low',
};

// ===== Principal =====

/**
 * Modelo y esfuerzo para una tarea.
 * @param tarea Tarea de IA.
 * @param configuracion Variables de entorno (modelos elegidos).
 * @returns Configuración de la llamada.
 */
export function configurarTarea(tarea: TareaIa, configuracion: Configuracion): ConfigTarea {
  const modelo =
    TAMANO_POR_TAREA[tarea] === 'grande'
      ? configuracion.IA_MODELO_GRANDE
      : configuracion.IA_MODELO_PEQUENO;
  return {
    modelo,
    esfuerzo: ESFUERZO_POR_TAREA[tarea],
    conRespaldoServidor: MODELOS_CON_RESPALDO_SERVIDOR.has(modelo),
  };
}
