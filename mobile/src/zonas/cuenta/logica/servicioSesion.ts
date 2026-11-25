/**
 * @file servicioSesion.ts
 * @proyecto most.
 * @descripcion Servicio de la cuenta: iniciar sesión, crear cuenta, la sesión guardada, el perfil y
 *   el cierre de sesión (que vacía la base local y quita los avisos). Es la única puerta de la
 *   presentación (el proveedor de sesión y las pantallas de cuenta) a esos datos.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación (antes el proveedor usaba los datos directo).
 */

import { asegurarDuenoBaseLocal, vaciarBaseLocal } from '@/comun/datos/database';
import { establecerSesion } from '@/comun/datos/sesionGuardada';
import { sincronizarAhora } from '@/comun/logica/sync/sync-engine';
import { deviceTimeZone } from '@/comun/util/time-zone';
import { cancelarAvisos } from '@/zonas/recordatorios/logica/servicioAvisos';

import { getProfile, saveMode, type AppMode, type Profile } from '../datos/repositorioPerfil';

// ===== Reexportes de la sesión guardada y la cuenta (sin reglas propias) =====

export {
  cargarSesionGuardada,
  escucharSesion,
  type MotivoCambio,
  type Sesion,
} from '@/comun/datos/sesionGuardada';
export { crearCuenta, iniciarSesion } from '../datos/cuentaApi';
export {
  leerUltimaConexion,
  marcarConexion,
  marcarSesionCaducada,
  sesionCaducada,
} from '../datos/sesion-caducada-store';
export type { AppMode, Profile };

// ===== Principal =====

/**
 * La sesión caducó sin conexión: se olvida en el teléfono (la bienvenida lo explica).
 */
export function olvidarSesionCaducada(): Promise<void> {
  return establecerSesion(null, 'caducada');
}

/**
 * Antes de mostrar los datos de una cuenta: si la base local era de otra, se vacía y se quitan sus
 * avisos (SDD 3.4).
 * @param userId Cuenta que inició sesión.
 */
export async function prepararBaseLocal(userId: string): Promise<void> {
  if (await asegurarDuenoBaseLocal(userId)) {
    await cancelarAvisos();
  }
}

/**
 * Perfil de la cuenta (del servidor, o la copia local sin conexión).
 * @param userId Cuenta.
 * @returns El perfil.
 */
export function leerPerfil(userId: string): Promise<Profile> {
  return getProfile(userId);
}

/**
 * Guarda el modo con la zona horaria del teléfono (último paso del onboarding).
 * @param userId Cuenta.
 * @param modo Modo elegido.
 * @returns El perfil actualizado.
 */
export function guardarModo(userId: string, modo: AppMode): Promise<Profile> {
  return saveMode(userId, modo, deviceTimeZone());
}

/**
 * Cierra sesión: sube lo pendiente si se puede, olvida la sesión, vacía la base local y quita los
 * avisos de este teléfono.
 */
export async function cerrarSesion(): Promise<void> {
  try {
    await sincronizarAhora().catch(() => {});
    await establecerSesion(null, 'salida');
  } finally {
    // El borrado ocurre aunque falle lo anterior: la siguiente cuenta empieza limpia.
    await vaciarBaseLocal().catch(() => {});
    await cancelarAvisos().catch(() => {});
  }
}
