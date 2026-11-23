/**
 * @file authServicio.ts
 * @proyecto most.
 * @descripcion Registro e inicio de sesión con correo y contraseña. Al registrar, un disparador
 *   de la base crea el perfil, el monedero y las 5 plantas del usuario.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { BaseDatosServicio } from '../baseDatos/baseDatosServicio.js';
import { crearHashContrasena, esContrasenaCorrecta } from './contrasena.js';
import type { Credenciales, RespuestaSesion, UsuarioSesion } from './esquemasAuth.js';

// ===== Tipos =====

type FilaUsuario = UsuarioSesion & { hash_contrasena: string };

// ===== Constantes =====

/** Código de PostgreSQL para "valor duplicado" en un índice único. */
const CODIGO_DUPLICADO = '23505';
const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos';

// ===== Principal =====

@Injectable()
export class AuthServicio {
  constructor(
    private readonly baseDatos: BaseDatosServicio,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Crea una cuenta nueva.
   * @param credenciales Correo y contraseña ya validados.
   * @returns Token de sesión y datos del usuario.
   */
  async registrar(credenciales: Credenciales): Promise<RespuestaSesion> {
    const hash = await crearHashContrasena(credenciales.contrasena);
    try {
      const [usuario] = await this.baseDatos.consultar<UsuarioSesion>(
        'insert into auth.usuarios (correo, hash_contrasena) values ($1, $2) returning id, correo',
        [credenciales.correo, hash],
      );
      return this.crearSesion(usuario);
    } catch (error) {
      if ((error as { code?: string }).code === CODIGO_DUPLICADO) {
        throw new ConflictException('Ese correo ya tiene una cuenta. Inicia sesión.');
      }
      throw error;
    }
  }

  /**
   * Inicia sesión. El mensaje de error es el mismo si el correo no existe o la contraseña no
   * coincide, para no revelar qué correos tienen cuenta.
   * @param credenciales Correo y contraseña ya validados.
   * @returns Token de sesión y datos del usuario.
   */
  async iniciarSesion(credenciales: Credenciales): Promise<RespuestaSesion> {
    const [fila] = await this.baseDatos.consultar<FilaUsuario>(
      'select id, correo, hash_contrasena from auth.usuarios where correo = $1',
      [credenciales.correo],
    );
    const esValida =
      fila !== undefined &&
      (await esContrasenaCorrecta(credenciales.contrasena, fila.hash_contrasena));
    if (!esValida) {
      throw new UnauthorizedException(MENSAJE_CREDENCIALES);
    }
    return this.crearSesion({ id: fila.id, correo: fila.correo });
  }

  /**
   * Firma el token de sesión. El campo "sub" lleva el id del usuario.
   * @param usuario Usuario con sesión.
   * @returns Token y usuario.
   */
  private async crearSesion(usuario: UsuarioSesion): Promise<RespuestaSesion> {
    const token = await this.jwt.signAsync({ sub: usuario.id, correo: usuario.correo });
    return { token, usuario };
  }
}
