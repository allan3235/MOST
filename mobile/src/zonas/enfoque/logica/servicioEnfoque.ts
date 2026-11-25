/**
 * @file servicioEnfoque.ts
 * @proyecto most.
 * @descripcion Servicio del modo enfoque (RF-14, CP-15/16): la única puerta de la presentación a
 *   la sesión guardada, a No Molestar y a la reprogramación de avisos. Empezar guarda el fin, deja
 *   en silencio los avisos propios y, con permiso en Android, activa No Molestar; terminar, cancelar
 *   o vencer lo restaura todo.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación (antes en features/reminders/avisos.ts y en la pantalla).
 */

import {
  fijarEnfoqueEnMemoria,
  reprogramarEnSegundoPlano,
} from '@/zonas/recordatorios/logica/servicioAvisos';

import {
  borrarEnfoque,
  guardadoFiltroPrevio,
  guardarEnfoqueHasta,
  leerEnfoqueHasta,
} from '../datos/repositorioEnfoque';
import {
  abrirAjustesNoMolestar,
  abrirPermisoNoMolestar,
  controlNoMolestar,
  plataforma,
} from '../dispositivo/noMolestar';
import { estaEnEnfoque } from './enfoque';
import {
  activarNoMolestar,
  estadoNoMolestar,
  restaurarNoMolestar,
  type EstadoNoMolestar,
} from './no-molestar';

// ===== Principal =====

/**
 * Fin de la sesión guardada (aunque ya haya pasado), o null si no hay.
 * @param userId Usuario con sesión.
 * @returns La fecha de fin.
 */
export function leerFinEnfoque(userId: string): Promise<Date | null> {
  return leerEnfoqueHasta(userId);
}

/**
 * Qué puede hacer la app con No Molestar en este teléfono (sin cambiar nada).
 * @returns activado (hay permiso), sin_permiso o no_disponible (iOS, Expo Go).
 */
export function estadoNoMolestarActual(): EstadoNoMolestar {
  return estadoNoMolestar(controlNoMolestar, plataforma);
}

/** ¿Se muestra la guía de Android (abrir sus ajustes)? En iOS la guía es solo texto. */
export function esAndroid(): boolean {
  return plataforma === 'android';
}

/**
 * Empieza una sesión: guarda su fin, silencia al momento los avisos propios y reprograma en
 * segundo plano. Con el permiso de Android, además pone el teléfono en No Molestar; en iOS nunca.
 * @param userId Usuario con sesión.
 * @param hasta Fin de la sesión.
 * @returns Qué pasó con No Molestar.
 */
export async function iniciarEnfoque(userId: string, hasta: Date): Promise<EstadoNoMolestar> {
  fijarEnfoqueEnMemoria(hasta);
  await guardarEnfoqueHasta(userId, hasta);
  reprogramarEnSegundoPlano(userId);
  return activarNoMolestar(controlNoMolestar, plataforma, guardadoFiltroPrevio(userId));
}

/**
 * Termina o cancela la sesión: No Molestar vuelve como estaba y los avisos se reprograman.
 * @param userId Usuario con sesión.
 */
export async function terminarEnfoque(userId: string): Promise<void> {
  await borrarEnfoque(userId);
  fijarEnfoqueEnMemoria(null);
  await restaurarNoMolestar(controlNoMolestar, plataforma, guardadoFiltroPrevio(userId));
  reprogramarEnSegundoPlano(userId);
}

/**
 * La sesión venció (con la pantalla abierta o la app cerrada): No Molestar vuelve como estaba.
 * @param userId Usuario con sesión.
 */
export async function restaurarTrasEnfoque(userId: string): Promise<void> {
  await restaurarNoMolestar(controlNoMolestar, plataforma, guardadoFiltroPrevio(userId));
}

/**
 * Al abrir la app o volver a ella: si la sesión ya venció, restaura No Molestar (CP-15).
 * @param userId Usuario con sesión.
 */
export async function restaurarSiVencio(userId: string): Promise<void> {
  if (!estaEnEnfoque(await leerEnfoqueHasta(userId), new Date())) {
    await restaurarTrasEnfoque(userId);
  }
}

/**
 * «Otra sesión» después de una que venció sola: se olvida la sesión vieja.
 * @param userId Usuario con sesión.
 */
export function olvidarSesionVencida(userId: string): Promise<void> {
  return borrarEnfoque(userId);
}

/** Pantalla del sistema para dar «Acceso a No molestar». */
export function pedirPermisoNoMolestar(): void {
  abrirPermisoNoMolestar();
}

/** Ajustes de No Molestar para activarlo a mano (guía de Android). */
export function abrirGuiaNoMolestar(): Promise<void> {
  return abrirAjustesNoMolestar();
}
