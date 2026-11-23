/**
 * @file cuentaApi.ts
 * @proyecto most.
 * @descripcion Crear cuenta e iniciar sesión contra el backend. Si sale bien, guarda la sesión:
 *   el proveedor de sesión se entera y el layout raíz lleva a la pantalla que toca.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación (reemplaza supabase.auth).
 */

import { pedirApi } from '@/lib/clienteApi';
import { establecerSesion } from '@/lib/sesionGuardada';

// ===== Tipos =====

type RespuestaSesion = { token: string; usuario: { id: string; correo: string } };

// ===== Funciones auxiliares =====

async function abrirSesion(ruta: string, correo: string, contrasena: string): Promise<void> {
  const respuesta = await pedirApi<RespuestaSesion>(ruta, {
    metodo: 'POST',
    cuerpo: { correo, contrasena },
    conSesion: false,
  });
  await establecerSesion(
    { token: respuesta.token, user: { id: respuesta.usuario.id, email: respuesta.usuario.correo } },
    'entrada',
  );
}

// ===== Principal =====

/**
 * Inicia sesión. Lanza ErrorApi (401 si no coinciden) o ErrorSinRed.
 * @param correo Correo ya validado.
 * @param contrasena Contraseña.
 */
export function iniciarSesion(correo: string, contrasena: string): Promise<void> {
  return abrirSesion('/auth/login', correo, contrasena);
}

/**
 * Crea la cuenta y entra de una vez (sin confirmación de correo en el MVP). Lanza ErrorApi (409 si
 * el correo ya tiene cuenta) o ErrorSinRed.
 * @param correo Correo ya validado.
 * @param contrasena Contraseña de 8 caracteres o más.
 */
export function crearCuenta(correo: string, contrasena: string): Promise<void> {
  return abrirSesion('/auth/registro', correo, contrasena);
}
