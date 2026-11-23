/**
 * @file auth-error-message.ts
 * @proyecto most.
 * @descripcion Traduce los errores de cuenta (registro e inicio de sesión) a mensajes amables.
 *   Nunca se muestra el texto técnico.
 * @autor Equipo most. (heredado de Habit Green; adaptado por Allan con Claude Code)
 * @fecha 2026-11-23
 * @version 2.0.0
 * @historial 1.0.0: códigos de Supabase Auth. 2.0.0 (2026-11-23): estados del backend de most.
 */

import { es } from '@/i18n/es';
import { ErrorApi, ErrorSinRed } from '@/lib/clienteApi';

// ===== Constantes =====

const MENSAJE_POR_ESTADO: Record<number, string> = {
  401: es.auth.errores.credenciales,
  409: es.auth.errores.usuarioExiste,
  429: es.auth.errores.demasiadosIntentos,
};

// ===== Principal =====

/**
 * Mensaje para mostrar a la persona.
 * @param error Lo que lanzó iniciarSesion o crearCuenta.
 * @returns Texto amable en español.
 */
export function authErrorMessage(error: unknown): string {
  if (error instanceof ErrorSinRed) {
    return es.auth.errores.sinConexion;
  }
  if (error instanceof ErrorApi && error.status in MENSAJE_POR_ESTADO) {
    return MENSAJE_POR_ESTADO[error.status];
  }
  // Error no previsto: en desarrollo se muestra el detalle en la terminal de `expo start`.
  if (__DEV__ && process.env.NODE_ENV !== 'test') {
    console.warn('[auth] Error no reconocido:', error);
  }
  return es.comun.errorGenerico;
}
