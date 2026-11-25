/**
 * @file servicioAgenda.ts
 * @proyecto most.
 * @descripcion Servicio de «Mi agenda» (RF-02): la puerta de la presentación a los bloques ocupados
 *   de la persona. Las reglas (choques, primera hora libre, validación) están en agenda.ts; los
 *   datos, en repositorioAgenda.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.1.0
 * @historial 1.0.0 (2026-11-24): creación.
 *   1.1.0 (2026-11-25): cambiar o quitar un bloque solo en un día.
 */

import {
  cambiarDiasBloque,
  eliminarBloque as eliminarDeBase,
  guardarBloque as guardarEnBase,
  leerBloques as leerDeBase,
  separarDiaDeBloque,
  type DatosBloque,
} from '../datos/repositorioAgenda';
import { cambioSoloUnDia, type BloqueAgenda } from './agenda';

export type { DatosBloque };

// ===== Principal =====

/**
 * Bloques ocupados de la persona.
 * @param userId Usuario con sesión.
 * @returns Sus bloques.
 */
export function leerBloques(userId: string): Promise<BloqueAgenda[]> {
  return leerDeBase(userId);
}

/**
 * Crea un bloque o, con `id`, lo edita (se guarda en el teléfono y se sincroniza).
 * @param userId Usuario con sesión.
 * @param datos Nombre, días y horas.
 * @param id Bloque a editar.
 */
export function guardarBloque(userId: string, datos: DatosBloque, id?: string): Promise<void> {
  return guardarEnBase(userId, datos, id);
}

/**
 * Elimina un bloque.
 * @param id Bloque.
 */
export function eliminarBloque(id: string): Promise<void> {
  return eliminarDeBase(id);
}

/**
 * Guarda un cambio solo para un día de un bloque; los demás días no cambian.
 * @param userId Usuario con sesión.
 * @param bloque Bloque original.
 * @param dia Día ISO que se cambia.
 * @param datos Nombre y horas nuevos.
 */
export async function guardarSoloUnDia(
  userId: string,
  bloque: BloqueAgenda,
  dia: number,
  datos: DatosBloque,
): Promise<void> {
  const cambio = cambioSoloUnDia(bloque, dia, datos);
  if (cambio.tipo === 'editar') {
    await guardarEnBase(userId, cambio.datos, bloque.id);
    return;
  }
  await separarDiaDeBloque(userId, bloque.id, cambio.diasRestantes, cambio.nuevo);
}

/**
 * Quita un bloque solo en un día (si era su único día, se elimina).
 * @param bloque Bloque.
 * @param dia Día ISO.
 */
export async function eliminarSoloUnDia(bloque: BloqueAgenda, dia: number): Promise<void> {
  const restantes = bloque.dias_semana.filter((d) => d !== dia);
  if (restantes.length === 0) {
    await eliminarDeBase(bloque.id);
    return;
  }
  await cambiarDiasBloque(bloque.id, restantes);
}
