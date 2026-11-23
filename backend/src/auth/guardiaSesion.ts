/**
 * @file guardiaSesion.ts
 * @proyecto most.
 * @descripcion Guardia que exige un token de sesión válido ("Authorization: Bearer <token>") y
 *   deja el usuario en la petición para el decorador @UsuarioActual().
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import type { UsuarioSesion } from './esquemasAuth.js';

// ===== Tipos =====

type PeticionConUsuario = Request & { usuario?: UsuarioSesion };

type ContenidoToken = { sub: string; correo: string };

// ===== Constantes =====

const PREFIJO_BEARER = 'Bearer ';
const MENSAJE_SIN_SESION = 'Tu sesión terminó. Vuelve a iniciar sesión.';

// ===== Principal =====

@Injectable()
export class GuardiaSesion implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  /**
   * Revisa el token de la petición.
   * @param contexto Contexto de Nest con la petición HTTP.
   * @returns true si el token es válido; si no, responde 401.
   */
  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest<PeticionConUsuario>();
    const encabezado = peticion.headers.authorization ?? '';
    if (!encabezado.startsWith(PREFIJO_BEARER)) {
      throw new UnauthorizedException(MENSAJE_SIN_SESION);
    }
    try {
      const contenido = await this.jwt.verifyAsync<ContenidoToken>(
        encabezado.slice(PREFIJO_BEARER.length),
      );
      peticion.usuario = { id: contenido.sub, correo: contenido.correo };
      return true;
    } catch {
      throw new UnauthorizedException(MENSAJE_SIN_SESION);
    }
  }
}

/** Decorador de parámetro: entrega el usuario con sesión (requiere GuardiaSesion). */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): UsuarioSesion => {
    const peticion = contexto.switchToHttp().getRequest<PeticionConUsuario>();
    if (!peticion.usuario) {
      throw new UnauthorizedException(MENSAJE_SIN_SESION);
    }
    return peticion.usuario;
  },
);
