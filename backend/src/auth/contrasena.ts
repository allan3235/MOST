/**
 * @file contrasena.ts
 * @proyecto most.
 * @descripcion Hash y verificación de contraseñas con scrypt (incluido en Node, sin dependencias
 *   nativas). Nunca se guarda la contraseña: solo "scrypt$sal$hash" en base64.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// ===== Constantes =====

const BYTES_SAL = 16;
const BYTES_HASH = 64;
const PREFIJO = 'scrypt';
const SEPARADOR = '$';
const PARTES_HASH = 3;

const derivarClave = promisify(scrypt) as (
  contrasena: string,
  sal: Buffer,
  largo: number,
) => Promise<Buffer>;

// ===== Principal =====

/**
 * Calcula el hash de una contraseña con una sal aleatoria.
 * @param contrasena Contraseña en texto plano.
 * @returns Cadena "scrypt$sal$hash" para guardar en la base.
 */
export async function crearHashContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(BYTES_SAL);
  const hash = await derivarClave(contrasena, sal, BYTES_HASH);
  return [PREFIJO, sal.toString('base64'), hash.toString('base64')].join(SEPARADOR);
}

/**
 * Compara una contraseña con un hash guardado, en tiempo constante.
 * @param contrasena Contraseña en texto plano.
 * @param guardado Hash guardado con crearHashContrasena.
 * @returns true si coinciden.
 */
export async function esContrasenaCorrecta(contrasena: string, guardado: string): Promise<boolean> {
  const partes = guardado.split(SEPARADOR);
  if (partes.length !== PARTES_HASH || partes[0] !== PREFIJO) {
    return false;
  }
  const sal = Buffer.from(partes[1], 'base64');
  const esperado = Buffer.from(partes[2], 'base64');
  const calculado = await derivarClave(contrasena, sal, esperado.length);
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}
