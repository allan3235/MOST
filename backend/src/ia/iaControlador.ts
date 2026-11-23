/**
 * @file iaControlador.ts
 * @proyecto most.
 * @descripcion Rutas de IA (requieren sesión): POST /ia/plan, POST /ia/meta y
 *   POST /ia/paso-ligero. Devuelven borradores; la app los guarda cuando la persona confirma.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import type { UsuarioSesion } from '../auth/esquemasAuth.js';
import { GuardiaSesion, UsuarioActual } from '../auth/guardiaSesion.js';
import { validar } from '../comun/validar.js';
import { esquemaRespuestas } from './esquemasEncuesta.js';
import { esquemaPeticionMeta, esquemaPeticionPasoLigero, type BorradorPlan } from './esquemasIa.js';
import { IaServicio, type PropuestaMeta, type PropuestaPasoLigero } from './iaServicio.js';

// ===== Constantes =====

const esquemaPeticionPlan = z.object({ respuestas: esquemaRespuestas });

// ===== Principal =====

@Controller('ia')
@UseGuards(GuardiaSesion)
export class IaControlador {
  constructor(private readonly ia: IaServicio) {}

  /**
   * Borrador del plan desde la encuesta de 7 pasos (UC-02).
   * @param usuario Usuario con sesión.
   * @param cuerpo { respuestas }
   * @returns { origen: 'ia' | 'catalogo', resumen, habitos }
   */
  @Post('plan')
  @HttpCode(HttpStatus.OK)
  generarPlan(
    @UsuarioActual() usuario: UsuarioSesion,
    @Body() cuerpo: unknown,
  ): Promise<BorradorPlan> {
    return this.ia.generarPlan(usuario.id, validar(esquemaPeticionPlan, cuerpo).respuestas);
  }

  /**
   * Convierte una meta escrita en un hábito con micro-pasos (RF-03).
   * @param usuario Usuario con sesión.
   * @param cuerpo { texto, categoria }
   * @returns { origen: 'ia', habito }. 503 IA_NO_DISPONIBLE · 422 META_NO_APROPIADA.
   */
  @Post('meta')
  @HttpCode(HttpStatus.OK)
  descomponerMeta(
    @UsuarioActual() usuario: UsuarioSesion,
    @Body() cuerpo: unknown,
  ): Promise<PropuestaMeta> {
    const { texto, categoria } = validar(esquemaPeticionMeta, cuerpo);
    return this.ia.descomponerMeta(usuario.id, texto, categoria);
  }

  /**
   * Paso intermedio más ligero que el actual (meta intermedia, RF-15).
   * @param usuario Usuario con sesión.
   * @param cuerpo { habit_id }
   * @returns { origen, antes_de, paso }
   */
  @Post('paso-ligero')
  @HttpCode(HttpStatus.OK)
  proponerPasoLigero(
    @UsuarioActual() usuario: UsuarioSesion,
    @Body() cuerpo: unknown,
  ): Promise<PropuestaPasoLigero> {
    return this.ia.proponerPasoLigero(
      usuario.id,
      validar(esquemaPeticionPasoLigero, cuerpo).habit_id,
    );
  }
}
