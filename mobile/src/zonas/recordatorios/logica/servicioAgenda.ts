/**
 * @file servicioAgenda.ts
 * @proyecto most.
 * @descripcion Servicio de «Mi agenda» (RF-02): la puerta de la presentación a los bloques ocupados
 *   de la persona. Las reglas (choques, primera hora libre, validación) están en agenda.ts; los
 *   datos, en repositorioAgenda.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación.
 */

import {
  eliminarBloque as eliminarDeBase,
  guardarBloque as guardarEnBase,
  leerBloques as leerDeBase,
  type DatosBloque,
} from '../datos/repositorioAgenda';
import type { BloqueAgenda } from './agenda';

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
