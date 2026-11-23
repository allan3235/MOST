/**
 * @file esquemasAuth.ts
 * @proyecto most.
 * @descripcion Esquemas de las peticiones de registro e inicio de sesión.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { z } from 'zod';

// ===== Constantes =====

export const LARGO_MINIMO_CONTRASENA = 8;
const LARGO_MAXIMO_CONTRASENA = 128;

export const esquemaCredenciales = z.object({
  correo: z.string().trim().toLowerCase().pipe(z.email('Escribe un correo válido')),
  contrasena: z
    .string()
    .min(
      LARGO_MINIMO_CONTRASENA,
      `La contraseña debe tener ${LARGO_MINIMO_CONTRASENA} caracteres o más`,
    )
    .max(LARGO_MAXIMO_CONTRASENA, 'La contraseña es demasiado larga'),
});

// ===== Tipos =====

export type Credenciales = z.infer<typeof esquemaCredenciales>;

export type UsuarioSesion = {
  id: string;
  correo: string;
};

export type RespuestaSesion = {
  token: string;
  usuario: UsuarioSesion;
};
