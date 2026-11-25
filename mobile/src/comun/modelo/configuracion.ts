/**
 * @file configuracion.ts
 * @proyecto most.
 * @descripcion Configuración por defecto del dominio (modelo común, usable por cualquier capa):
 *   horas de cada momento, ventana de avisos y parámetros del motor de reajuste. `app_config` y
 *   Perfil pueden cambiarlos; estos son los valores mientras no lleguen. Antes vivían en la capa de
 *   lógica y la capa de datos los importaba al revés.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación (sale de planificar-avisos.ts y progresion.ts).
 */

// ===== Tipos =====

export type MomentoAviso = 'manana' | 'mediodia' | 'tarde' | 'noche' | 'resumen_nocturno';
/** Hora "HH:MM" de cada momento: las de Perfil sobre las de `app_config`. */
export type HorasAvisos = Record<MomentoAviso, string>;

/** `app_config.notificaciones`. */
export type ConfigAvisos = {
  ventana_dias: number;
  tope_programadas: number;
  horas_segundo_aviso: number;
};

export type ConfigProgresion = {
  umbral_subir: number;
  umbral_bajar: number;
  ventana_dias: number;
  /** Días que se miran para bajar (RF-15); los de subir son `ventana_dias`. */
  ventana_dias_bajar: number;
  ventana_dias_baja_frecuencia: number;
  dias_por_semana_baja_frecuencia: number;
  minimo_ocurrencias: number;
  dias_entre_evaluaciones: number;
  limite_habitos_plan: number;
  dias_para_desbloqueo: number;
  ventana_desbloqueo_dias: number;
};

// ===== Constantes =====

/** RF-15: con menos de este cumplimiento en los últimos DIAS_EVALUADOS se propone bajar. */
export const UMBRAL_CUMPLIMIENTO = 0.4;
export const DIAS_EVALUADOS = 7;

export const HORAS_POR_DEFECTO: HorasAvisos = {
  manana: '08:00',
  mediodia: '13:00',
  tarde: '17:00',
  noche: '20:30',
  resumen_nocturno: '21:00',
};

export const AVISOS_POR_DEFECTO: ConfigAvisos = {
  ventana_dias: 7,
  tope_programadas: 60,
  horas_segundo_aviso: 2,
};

export const PROGRESION_POR_DEFECTO: ConfigProgresion = {
  umbral_subir: 0.85,
  umbral_bajar: UMBRAL_CUMPLIMIENTO,
  ventana_dias: 14,
  ventana_dias_bajar: DIAS_EVALUADOS,
  ventana_dias_baja_frecuencia: 28,
  dias_por_semana_baja_frecuencia: 2,
  minimo_ocurrencias: 4,
  dias_entre_evaluaciones: 7,
  limite_habitos_plan: 4,
  dias_para_desbloqueo: 90,
  ventana_desbloqueo_dias: 28,
};
