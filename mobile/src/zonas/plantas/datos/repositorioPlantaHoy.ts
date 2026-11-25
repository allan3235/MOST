/**
 * @file repositorioPlantaHoy.ts
 * @proyecto most.
 * @descripcion Capa de datos de la planta que se muestra en Hoy: guarda en el teléfono el área que
 *   la persona eligió en el Jardín (almacén clave-valor, por usuario). Es una preferencia de este
 *   teléfono; no se sube al servidor.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-25
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-25): creación.
 */

import Storage from 'expo-sqlite/kv-store';

import { AREAS, type Area } from '@/comun/modelo/esquemas/onboarding';

// ===== Constantes =====

const PREFIJO_CLAVE = 'most-planta-hoy-';

// ===== Principal =====

/**
 * Área elegida para Hoy, o null si nunca eligió (o el valor guardado ya no es válido).
 * @param userId Usuario con sesión.
 * @returns El área.
 */
export async function leerPlantaElegida(userId: string): Promise<Area | null> {
  const valor = await Storage.getItem(`${PREFIJO_CLAVE}${userId}`);
  return (AREAS as readonly string[]).includes(valor ?? '') ? (valor as Area) : null;
}

/**
 * Guarda el área elegida para Hoy.
 * @param userId Usuario con sesión.
 * @param area Área de la planta.
 */
export async function guardarPlantaElegida(userId: string, area: Area): Promise<void> {
  await Storage.setItem(`${PREFIJO_CLAVE}${userId}`, area);
}
