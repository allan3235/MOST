/**
 * @file agenda-repository.ts
 * @proyecto most.
 * @descripcion Agenda de bloques ocupados (RF-02) en SQLite. Se escribe localmente y se sube con
 *   la cola (funciona sin conexión). Borrar un bloque lo marca con `eliminado_en`.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación.
 */

import { randomUUID } from 'expo-crypto';

import type { BloqueAgenda } from '@/zonas/recordatorios/logica/agenda';

import { aplicar } from '@/comun/datos/aplicar-cambio';
import { actualizarFila, getDb, guardarFilas, leerFilas } from '@/comun/datos/database';

// ===== Tipos =====

export type DatosBloque = Pick<BloqueAgenda, 'nombre' | 'dias_semana' | 'hora_inicio' | 'hora_fin'>;

// ===== Principal =====

/**
 * Bloques vigentes de la persona, por hora de inicio.
 * @param userId Usuario con sesión.
 * @returns Los bloques no borrados.
 */
export async function leerBloques(userId: string): Promise<BloqueAgenda[]> {
  const db = await getDb();
  return leerFilas<BloqueAgenda>(
    db,
    'agenda_bloques',
    'user_id = ? AND eliminado_en IS NULL ORDER BY hora_inicio',
    [userId],
  );
}

/**
 * Crea un bloque o cambia uno existente.
 * @param userId Usuario con sesión.
 * @param datos Nombre, días y horas (ya validados).
 * @param id Id del bloque a cambiar; sin él se crea uno nuevo.
 */
export function guardarBloque(userId: string, datos: DatosBloque, id?: string): Promise<void> {
  return aplicar(async (db) => {
    const fila = {
      id: id ?? randomUUID(),
      user_id: userId,
      nombre: datos.nombre.trim(),
      dias_semana: datos.dias_semana,
      hora_inicio: datos.hora_inicio,
      hora_fin: datos.hora_fin,
      eliminado_en: null,
    };
    await guardarFilas(db, 'agenda_bloques', [{ ...fila, updated_at: new Date().toISOString() }]);
    return [{ operacion: 'upsert', tabla: 'agenda_bloques', clave: fila.id, payload: fila }];
  });
}

/**
 * Borra un bloque (lo marca con eliminado_en).
 * @param id Bloque a borrar.
 */
export function eliminarBloque(id: string): Promise<void> {
  return aplicar(async (db) => {
    const cambios = { eliminado_en: new Date().toISOString() };
    await actualizarFila(
      db,
      'agenda_bloques',
      { id },
      { ...cambios, updated_at: cambios.eliminado_en },
    );
    return [{ operacion: 'update', tabla: 'agenda_bloques', clave: id, payload: cambios }];
  });
}

/**
 * Cambia solo los días de un bloque (por ejemplo, al quitarle un día).
 * @param id Bloque.
 * @param dias Días que le quedan.
 */
export function cambiarDiasBloque(id: string, dias: number[]): Promise<void> {
  return aplicar(async (db) => {
    const cambios = { dias_semana: dias };
    await actualizarFila(
      db,
      'agenda_bloques',
      { id },
      { ...cambios, updated_at: new Date().toISOString() },
    );
    return [{ operacion: 'update', tabla: 'agenda_bloques', clave: id, payload: cambios }];
  });
}

/**
 * Separa un día de un bloque que se repite: el original se queda con los demás días y se crea un
 * bloque nuevo solo para ese día. Va en una sola transacción: o se guardan los dos o ninguno.
 * @param userId Usuario con sesión.
 * @param id Bloque original.
 * @param diasRestantes Días que le quedan al original.
 * @param nuevo Datos del bloque de ese día.
 */
export function separarDiaDeBloque(
  userId: string,
  id: string,
  diasRestantes: number[],
  nuevo: DatosBloque,
): Promise<void> {
  return aplicar(async (db) => {
    const ahora = new Date().toISOString();
    const cambios = { dias_semana: diasRestantes };
    await actualizarFila(db, 'agenda_bloques', { id }, { ...cambios, updated_at: ahora });
    const fila = {
      id: randomUUID(),
      user_id: userId,
      nombre: nuevo.nombre.trim(),
      dias_semana: nuevo.dias_semana,
      hora_inicio: nuevo.hora_inicio,
      hora_fin: nuevo.hora_fin,
      eliminado_en: null,
    };
    await guardarFilas(db, 'agenda_bloques', [{ ...fila, updated_at: ahora }]);
    return [
      { operacion: 'update', tabla: 'agenda_bloques', clave: id, payload: cambios },
      { operacion: 'upsert', tabla: 'agenda_bloques', clave: fila.id, payload: fila },
    ];
  });
}
