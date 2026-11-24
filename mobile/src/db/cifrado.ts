/**
 * @file cifrado.ts
 * @proyecto most.
 * @descripcion Cifrado en reposo de la base local (RNF-05, CP-10) con SQLCipher (AES-256). La
 *   clave es aleatoria (32 bytes), se crea una sola vez por instalación y vive en SecureStore
 *   (Keystore en Android, Keychain en iOS), nunca en el código ni en la base. Se aplica con
 *   `PRAGMA key` justo al abrir. Si el binario no trae SQLCipher (Expo Go), `cipher_version` no
 *   devuelve nada: la base se abre sin cifrar y se avisa en consola; en la build de desarrollo y
 *   en producción siempre va cifrada.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// ===== Tipos =====

/** Lo que usa este módulo de la base; así se prueba sin SQLite real. */
export type BaseConClave = {
  getFirstAsync: <T>(sql: string) => Promise<T | null>;
  execAsync: (sql: string) => Promise<void>;
};

/** Almacén seguro de la clave (SecureStore; inyectable en pruebas). */
export type AlmacenClave = {
  leer: () => Promise<string | null>;
  guardar: (clave: string) => Promise<void>;
};

/**
 * cifrada: SQLCipher activo y la clave abre la base.
 * sin_sqlcipher: el binario no trae SQLCipher (Expo Go): la base queda sin cifrar.
 * no_abre: la clave no abre el archivo (base vieja sin cifrar o de otra clave): hay que recrearla.
 */
export type ResultadoClave = 'cifrada' | 'sin_sqlcipher' | 'no_abre';

// ===== Constantes =====

export const LLAVE_CLAVE_BASE = 'most_clave_base_local';
/** 32 bytes = 256 bits, el tamaño de clave de AES-256. */
export const BYTES_CLAVE = 32;
const BASE_HEX = 16;
const DIGITOS_BYTE = 2;

const ALMACEN_SEGURO: AlmacenClave = {
  leer: () => SecureStore.getItemAsync(LLAVE_CLAVE_BASE),
  guardar: (clave) =>
    SecureStore.setItemAsync(LLAVE_CLAVE_BASE, clave, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
};

// ===== Funciones auxiliares =====

/** Bytes a texto hexadecimal (solo 0-9 y a-f: seguro dentro del PRAGMA). */
function aHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(BASE_HEX).padStart(DIGITOS_BYTE, '0')).join('');
}

// ===== Principal =====

/**
 * Clave de la base: la guardada, o una nueva aleatoria que se guarda en el almacén seguro.
 * @param almacen Dónde vive la clave (SecureStore por defecto).
 * @param aleatorio Generador de bytes (expo-crypto por defecto).
 * @returns La clave en hexadecimal (64 caracteres).
 */
export async function obtenerClaveBase(
  almacen: AlmacenClave = ALMACEN_SEGURO,
  aleatorio: (n: number) => Uint8Array = getRandomBytes,
): Promise<string> {
  const guardada = await almacen.leer();
  if (guardada) {
    return guardada;
  }
  const nueva = aHex(aleatorio(BYTES_CLAVE));
  await almacen.guardar(nueva);
  return nueva;
}

/**
 * Aplica la clave a una base recién abierta y comprueba que la abre.
 * @param db Base recién abierta (antes de cualquier otra consulta).
 * @param clave Clave en hexadecimal.
 * @returns Si quedó cifrada, si el binario no trae SQLCipher, o si la clave no abre el archivo.
 */
export async function aplicarClave(db: BaseConClave, clave: string): Promise<ResultadoClave> {
  const version = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
  if (!version?.cipher_version) {
    return 'sin_sqlcipher';
  }
  await db.execAsync(`PRAGMA key = '${clave}'`);
  try {
    // La primera lectura real es la que falla si la clave no corresponde al archivo.
    await db.getFirstAsync('SELECT count(*) AS n FROM sqlite_master');
    return 'cifrada';
  } catch {
    return 'no_abre';
  }
}
