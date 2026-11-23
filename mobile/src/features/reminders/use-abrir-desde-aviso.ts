/**
 * @file use-abrir-desde-aviso.ts
 * @proyecto most.
 * @descripcion Acceso directo desde una notificación (RF-13): al tocar el aviso motivacional se
 *   abre Progreso. Solo se aceptan rutas conocidas, nunca una cualquiera que venga en el aviso.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import {
  clearLastNotificationResponseAsync,
  DEFAULT_ACTION_IDENTIFIER,
  useLastNotificationResponse,
} from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { RUTA_AVISO_MOTIVACIONAL } from './avisos';

// ===== Principal =====

/**
 * Abre la pantalla del aviso tocado en cuanto la persona está dentro de la app.
 * @param activo true cuando ya se ven las pestañas (con sesión y perfil completo).
 */
export function useAbrirDesdeAviso(activo: boolean): void {
  const respuesta = useLastNotificationResponse();
  useEffect(() => {
    if (!activo || !respuesta || respuesta.actionIdentifier !== DEFAULT_ACTION_IDENTIFIER) {
      return;
    }
    if (respuesta.notification.request.content.data?.ruta !== RUTA_AVISO_MOTIVACIONAL) {
      return;
    }
    // Se limpia para no volver a abrirla en cada render o al regresar a la app.
    clearLastNotificationResponseAsync().catch(() => {});
    router.navigate(RUTA_AVISO_MOTIVACIONAL);
  }, [activo, respuesta]);
}
