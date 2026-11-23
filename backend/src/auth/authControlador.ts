/**
 * @file authControlador.ts
 * @proyecto most.
 * @descripcion Rutas de cuenta: POST /auth/registro, POST /auth/login y GET /auth/yo.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { validar } from '../comun/validar.js';
import { AuthServicio } from './authServicio.js';
import { esquemaCredenciales, type RespuestaSesion, type UsuarioSesion } from './esquemasAuth.js';
import { GuardiaSesion, UsuarioActual } from './guardiaSesion.js';

// ===== Principal =====

@Controller('auth')
export class AuthControlador {
  constructor(private readonly auth: AuthServicio) {}

  /**
   * Crea una cuenta. Responde 409 si el correo ya existe.
   * @param cuerpo { correo, contrasena }
   * @returns Token y usuario.
   */
  @Post('registro')
  registrar(@Body() cuerpo: unknown): Promise<RespuestaSesion> {
    return this.auth.registrar(validar(esquemaCredenciales, cuerpo));
  }

  /**
   * Inicia sesión. Responde 401 si las credenciales no coinciden.
   * @param cuerpo { correo, contrasena }
   * @returns Token y usuario.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  iniciarSesion(@Body() cuerpo: unknown): Promise<RespuestaSesion> {
    return this.auth.iniciarSesion(validar(esquemaCredenciales, cuerpo));
  }

  /**
   * Devuelve el usuario del token (sirve para comprobar que la sesión sigue viva).
   * @param usuario Usuario con sesión.
   * @returns Id y correo.
   */
  @Get('yo')
  @UseGuards(GuardiaSesion)
  leerUsuario(@UsuarioActual() usuario: UsuarioSesion): UsuarioSesion {
    return usuario;
  }
}
