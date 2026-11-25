/**
 * @file servicioMetas.ts
 * @proyecto most.
 * @descripcion Servicio de «Crear meta» (RF-03): la puerta de la presentación para descomponer una
 *   meta en micro-pasos con la IA del backend. La llamada y sus errores viven en repositorioMetas.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación.
 */

import type { Area } from '@/comun/modelo/esquemas/onboarding';

import {
  descomponerMeta as pedirAlBackend,
  type MotivoSinPropuesta,
  type PropuestaMeta,
  type ResultadoMeta,
} from '../datos/repositorioMetas';

export type { MotivoSinPropuesta, PropuestaMeta, ResultadoMeta };

// ===== Principal =====

/**
 * Descompone una meta en micro-pasos con la IA (necesita conexión).
 * @param texto Meta escrita por la persona (3 a 120 caracteres).
 * @param categoria Área elegida.
 * @returns La propuesta, o el motivo por el que no la hay.
 */
export function descomponerMeta(texto: string, categoria: Area): Promise<ResultadoMeta> {
  return pedirAlBackend(texto, categoria);
}
