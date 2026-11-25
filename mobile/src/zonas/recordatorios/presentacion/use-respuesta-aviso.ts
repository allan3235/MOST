/**
 * @file use-respuesta-aviso.ts
 * @proyecto most.
 * @descripcion Lo que pasa al tocar una notificación de most.:
 *   - Botón «Hecho» en el aviso de un hábito (RI-04): se marca el hábito (con su recompensa) y se
 *     abre Hoy, donde se ve hecho.
 *   - Tocar el aviso motivacional (RF-13): se abre Progreso.
 *   Solo se aceptan rutas y acciones conocidas, nunca una cualquiera que venga en el aviso.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 2.0.0
 * @historial 1.0.0 (2026-11-23): creación (use-abrir-desde-aviso, RF-13). 2.0.0 (2026-11-23):
 *   acción «Hecho» (RI-04).
 */

import { router } from 'expo-router';
import { useEffect } from 'react';

import {
  atenderRespuestaAviso,
  useUltimaRespuestaAviso,
} from '@/zonas/recordatorios/logica/servicioAvisos';

// ===== Principal =====

/**
 * Atiende el último toque a una notificación en cuanto la persona está dentro de la app.
 * @param userId Usuario con sesión, o null si todavía no hay.
 * @param activo true cuando ya se ven las pestañas (con sesión y perfil completo).
 */
export function useRespuestaAviso(userId: string | null, activo: boolean): void {
  const respuesta = useUltimaRespuestaAviso();
  useEffect(() => {
    if (!activo || !userId || !respuesta) {
      return;
    }
    const destino = atenderRespuestaAviso(userId, respuesta);
    if (destino) {
      router.navigate(destino);
    }
  }, [activo, respuesta, userId]);
}
