/**
 * @file repositorioCuestionario.ts
 * @proyecto most.
 * @descripcion Capa de datos de la encuesta inicial (UC-01): sube el perfil y los ajustes que salen
 *   de él al servidor en un solo lote. La copia local llega con la sincronización.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación (la encuesta ya no genera un plan).
 */

import { pedirApi } from '@/comun/datos/clienteApi';
import type { Perfil } from '@/comun/modelo/esquemas/onboarding';

// ===== Tipos =====

/** Fila de `user_settings` que sale del perfil (las horas de cada momento no se tocan). */
export type FilaAjustesPerfil = {
  user_id: string;
  presupuesto_min: number;
  estilo_notificaciones: Perfil['acompanamiento'];
  estrategias: string[];
  segundo_aviso: boolean;
};

/** Fila de `onboarding_answers`. */
export type FilaRespuestas = {
  user_id: string;
  respuestas: Perfil;
  version_formulario: number;
};

// ===== Principal =====

/**
 * Sube ajustes y respuestas en un lote (o se guardan los dos o ninguno). Usa upsert por usuario:
 * repetir la encuesta reemplaza la anterior sin duplicar.
 * @param ajustes Fila de ajustes.
 * @param respuestas Fila de respuestas.
 */
export async function subirPerfil(
  ajustes: FilaAjustesPerfil,
  respuestas: FilaRespuestas,
): Promise<void> {
  const operaciones = [
    { operacion: 'upsert', tabla: 'user_settings', filas: [ajustes], enConflicto: ['user_id'] },
    {
      operacion: 'upsert',
      tabla: 'onboarding_answers',
      filas: [respuestas],
      enConflicto: ['user_id'],
    },
  ];
  await pedirApi('/sync/lote', { metodo: 'POST', cuerpo: { operaciones } });
}
