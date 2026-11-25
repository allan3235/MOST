/**
 * @file almacen-local.ts
 * @proyecto most.
 * @descripcion Almacén clave-valor del teléfono (expo-sqlite/kv-store) en versión síncrona, para
 *   los borradores que deben estar listos al abrir la primera pantalla (encuesta, revisión del
 *   plan). Antes cada store repetía este adaptador; ahora vive una vez en la capa de datos.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación.
 */

import Storage from 'expo-sqlite/kv-store';
import type { StateStorage } from 'zustand/middleware';

// ===== Principal =====

/** Adaptador para `persist` de zustand: lee y escribe al momento, sin promesas. */
export const almacenSincrono: StateStorage = {
  getItem: (clave) => Storage.getItemSync(clave),
  setItem: (clave, valor) => Storage.setItemSync(clave, valor),
  removeItem: (clave) => {
    Storage.removeItemSync(clave);
  },
};
