/**
 * @file authServicio.ts
 * @proyecto most.
 * @descripcion Registro e inicio de sesión con correo y contraseña. Al registrar, un disparador
 *   de la base crea el perfil, el monedero y las 5 plantas del usuario.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.1.0
 * @historial 1.0.0 (2026-11-22): creación. 1.1.0 (2026-11-23): consultas con Prisma.
 */

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaServicio } from '../baseDatos/prismaServicio.js';
import { Prisma } from '../generated/prisma/client.js';
import { crearHashContrasena, esContrasenaCorrecta } from './contrasena.js';
import type { Credenciales, RespuestaSesion, UsuarioSesion } from './esquemasAuth.js';

// ===== Constantes =====

/** Código de Prisma para "valor duplicado" en un campo único. */
const CODIGO_DUPLICADO = 'P2002';
const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos';
const CAMPOS_SESION = { id: true, correo: true } as const;

// ===== Principal =====

@Injectable()
export class AuthServicio {
  constructor(
    private readonly prisma: PrismaServicio,
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
      const usuario = await this.prisma.usuarios.create({
        data: { correo: credenciales.correo, hash_contrasena: hash },
        select: CAMPOS_SESION,
      });
      return this.crearSesion(usuario);
    } catch (error) {
      const esDuplicado =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === CODIGO_DUPLICADO;
      if (esDuplicado) {
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
    const usuario = await this.prisma.usuarios.findUnique({
      where: { correo: credenciales.correo },
      select: { ...CAMPOS_SESION, hash_contrasena: true },
    });
    const esValida =
      usuario !== null &&
      (await esContrasenaCorrecta(credenciales.contrasena, usuario.hash_contrasena));
    if (!esValida) {
      throw new UnauthorizedException(MENSAJE_CREDENCIALES);
    }
    return this.crearSesion({ id: usuario.id, correo: usuario.correo });
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
