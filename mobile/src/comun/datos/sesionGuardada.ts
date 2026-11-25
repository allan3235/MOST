/**
 * @file sesionGuardada.ts
 * @proyecto most.
 * @descripcion Sesión del usuario: el token que entrega el backend al iniciar sesión, guardado en
 *   expo-secure-store (definición 10). Se mantiene una copia en memoria para no leer el
 *   almacenamiento seguro en cada petición, y avisa a quien escuche cuando la sesión cambia.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación (reemplaza la sesión de Supabase).
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ===== Tipos =====

export type Sesion = {
  token: string;
  user: { id: string; email: string };
};

export type MotivoCambio = 'entrada' | 'salida' | 'caducada' | 'lectura';

type Oyente = (sesion: Sesion | null, motivo: MotivoCambio) => void;

// ===== Constantes =====

const CLAVE = 'most-sesion';
/** En web (solo pruebas rápidas) no hay almacenamiento seguro: la sesión vive en memoria. */
const HAY_ALMACEN = Platform.OS !== 'web';

// ===== Estado =====

let actual: Sesion | null = null;
const oyentes = new Set<Oyente>();

// ===== Funciones auxiliares =====

function esSesion(valor: unknown): valor is Sesion {
  const candidata = valor as Partial<Sesion> | null;
  return (
    typeof candidata?.token === 'string' &&
    typeof candidata.user?.id === 'string' &&
    typeof candidata.user.email === 'string'
  );
}

function avisar(motivo: MotivoCambio): void {
  for (const oyente of oyentes) {
    oyente(actual, motivo);
  }
}

// ===== Principal =====

/** Sesión en memoria (null si no hay). La usa el cliente de la API en cada petición. */
export function leerSesion(): Sesion | null {
  return actual;
}

/**
 * Lee la sesión guardada en el teléfono al abrir la app.
 * @returns La sesión, o null si no hay o está dañada.
 */
export async function cargarSesionGuardada(): Promise<Sesion | null> {
  if (!HAY_ALMACEN) {
    return actual;
  }
  try {
    const crudo = await SecureStore.getItemAsync(CLAVE);
    const sesion: unknown = crudo ? JSON.parse(crudo) : null;
    actual = esSesion(sesion) ? sesion : null;
  } catch {
    actual = null;
  }
  return actual;
}

/**
 * Guarda una sesión nueva (o la borra con null) y avisa a los oyentes.
 * @param sesion Sesión recibida del backend, o null para cerrarla.
 * @param motivo Por qué cambió: así el proveedor distingue un cierre pedido de uno por caducidad.
 */
export async function establecerSesion(sesion: Sesion | null, motivo: MotivoCambio): Promise<void> {
  actual = sesion;
  if (HAY_ALMACEN) {
    try {
      if (sesion) {
        await SecureStore.setItemAsync(CLAVE, JSON.stringify(sesion));
      } else {
        await SecureStore.deleteItemAsync(CLAVE);
      }
    } catch {
      // Si el almacén falla, la sesión sigue en memoria hasta cerrar la app.
    }
  }
  avisar(motivo);
}

/**
 * Escucha los cambios de sesión.
 * @param oyente Función que recibe la sesión nueva y el motivo.
 * @returns Función para dejar de escuchar.
 */
export function escucharSesion(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}
