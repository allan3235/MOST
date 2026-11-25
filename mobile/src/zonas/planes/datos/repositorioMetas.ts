/**
 * @file metasRepositorio.ts
 * @proyecto most.
 * @descripcion «Crear meta» (RF-03): pide al backend (POST /ia/meta) que la IA convierta una meta
 *   escrita en un hábito con su secuencia de micro-pasos. Necesita conexión; no guarda nada (el
 *   hábito se guarda cuando la persona confirma, con crearHabito).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { ErrorApi, ErrorSinRed, pedirApi } from '@/comun/datos/clienteApi';
import type { Area } from '@/comun/modelo/esquemas/onboarding';
import type { MicroPaso } from '@/comun/modelo/esquemas/plan';

// ===== Tipos =====

export type PropuestaMeta = {
  categoria: Area;
  titulo: string;
  descripcion: string;
  micro_pasos: MicroPaso[];
};

export type MotivoSinPropuesta =
  'sin_conexion' | 'no_apropiada' | 'no_disponible' | 'perfil_incompleto' | 'error';

export type ResultadoMeta =
  | { ok: true; propuesta: PropuestaMeta }
  | { ok: false; motivo: MotivoSinPropuesta; mensaje: string | null };

type RespuestaMeta = { origen: 'ia'; habito: PropuestaMeta };

// ===== Constantes =====

const MOTIVO_POR_CODIGO: Record<string, MotivoSinPropuesta> = {
  META_NO_APROPIADA: 'no_apropiada',
  IA_NO_DISPONIBLE: 'no_disponible',
  // UC-01: sin la encuesta no hay perfil para armar los micro-pasos.
  PERFIL_INCOMPLETO: 'perfil_incompleto',
};

// ===== Principal =====

/**
 * Descompone una meta en micro-pasos con la IA.
 * @param texto Meta escrita por la persona (ya validada: 3 a 120 caracteres).
 * @param categoria Área elegida.
 * @returns La propuesta, o el motivo por el que no la hay (con el mensaje del backend si trae).
 */
export async function descomponerMeta(texto: string, categoria: Area): Promise<ResultadoMeta> {
  try {
    const respuesta = await pedirApi<RespuestaMeta>('/ia/meta', {
      metodo: 'POST',
      cuerpo: { texto, categoria },
    });
    return { ok: true, propuesta: respuesta.habito };
  } catch (error) {
    if (error instanceof ErrorSinRed) {
      return { ok: false, motivo: 'sin_conexion', mensaje: null };
    }
    if (error instanceof ErrorApi && error.code && error.code in MOTIVO_POR_CODIGO) {
      return { ok: false, motivo: MOTIVO_POR_CODIGO[error.code], mensaje: error.message };
    }
    return { ok: false, motivo: 'error', mensaje: null };
  }
}
