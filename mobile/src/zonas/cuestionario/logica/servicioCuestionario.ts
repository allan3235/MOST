/**
 * @file servicioCuestionario.ts
 * @proyecto most.
 * @descripcion Servicio de la encuesta inicial (UC-01): guarda el perfil de la persona (historial,
 *   tiempo, momentos libres, obstáculos y acompañamiento) y los ajustes que salen de él. No crea
 *   hábitos: el área y la meta se preguntan después, al crear cada hábito.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación.
 */

import { getDb } from '@/comun/datos/database';
import { sincronizarAhora } from '@/comun/logica/sync/sync-engine';
import { VERSION_FORMULARIO, type Perfil } from '@/comun/modelo/esquemas/onboarding';
import { leerPresupuestos } from '@/zonas/cuenta/datos/repositorioAjustes';
import { usaSegundoAviso } from '@/zonas/planes/logica/plan-engine';

import {
  subirPerfil,
  type FilaAjustesPerfil,
  type FilaRespuestas,
} from '../datos/repositorioCuestionario';

// ===== Funciones auxiliares =====

/**
 * Ajustes que salen del perfil: tiempo diario (P4), estilo de avisos (P7), estrategias (P6) y si
 * conviene un segundo aviso.
 * @param userId Usuario con sesión.
 * @param perfil Perfil completo.
 * @param presupuestos Minutos de cada respuesta de la P4.
 * @returns La fila de ajustes.
 */
export function ajustesDelPerfil(
  userId: string,
  perfil: Perfil,
  presupuestos: Record<Perfil['tiempo'], number>,
): FilaAjustesPerfil {
  return {
    user_id: userId,
    presupuesto_min: presupuestos[perfil.tiempo],
    estilo_notificaciones: perfil.acompanamiento,
    estrategias: [...perfil.obstaculos],
    segundo_aviso: usaSegundoAviso(perfil),
  };
}

// ===== Principal =====

/**
 * Guarda el perfil (necesita conexión, como crear un plan). Después baja el perfil y los
 * ajustes al teléfono, que «Crear meta» lee de ahí.
 * @param userId Usuario con sesión.
 * @param perfil Perfil completo.
 */
export async function guardarPerfil(userId: string, perfil: Perfil): Promise<void> {
  const presupuestos = await leerPresupuestos(await getDb());
  const respuestas: FilaRespuestas = {
    user_id: userId,
    respuestas: perfil,
    version_formulario: VERSION_FORMULARIO,
  };
  await subirPerfil(ajustesDelPerfil(userId, perfil, presupuestos), respuestas);
  // Ya quedó guardado: si la bajada falla, la siguiente sincronización la trae.
  await sincronizarAhora().catch(() => {});
}
