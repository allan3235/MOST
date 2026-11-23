/**
 * @file proveedorIa.ts
 * @proyecto most.
 * @descripcion Conexión con la IA. ProveedorIa es la interfaz que usa el servicio (en las pruebas
 *   se reemplaza por una IA simulada, sin gastar). ProveedorClaude la implementa con el SDK
 *   oficial de Anthropic: salida estructurada validada con Zod y, en los modelos que lo
 *   permiten, respaldo automático del servidor si el modelo rechaza la petición.
 *   La clave (ANTHROPIC_API_KEY) vive solo en backend/.env; nunca en la app.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { Injectable, Logger } from '@nestjs/common';
import type { z } from 'zod';

import { leerConfiguracion } from '../comun/configuracion.js';
import { configurarTarea, type TareaIa } from './modelosIa.js';

// ===== Tipos =====

export type EstadoIa = 'ok' | 'rechazo' | 'error' | 'sin_clave';

export type ResultadoIa<T> =
  | { estado: 'ok'; datos: T; tokens: number; modelo: string }
  | { estado: Exclude<EstadoIa, 'ok'>; tokens: number; modelo: string; detalle?: string };

export interface ProveedorIa {
  /**
   * Pide a la IA una respuesta con la forma del esquema.
   * @param tarea Tarea (decide el modelo).
   * @param instrucciones Mensaje de sistema.
   * @param mensaje Datos de la petición.
   * @param esquema Forma esperada de la respuesta.
   * @returns La respuesta validada, o el motivo por el que no hay.
   */
  generar<T extends z.ZodType>(
    tarea: TareaIa,
    instrucciones: string,
    mensaje: string,
    esquema: T,
  ): Promise<ResultadoIa<z.infer<T>>>;
}

// ===== Constantes =====

/** Token de inyección: el servicio pide "el proveedor de IA", no una clase concreta. */
export const PROVEEDOR_IA = Symbol('PROVEEDOR_IA');

/** Las respuestas son cortas (un plan); este tope solo evita cortes a media respuesta. */
const TOKENS_MAXIMOS = 16000;
const BETA_RESPALDO_SERVIDOR = 'server-side-fallback-2026-07-01';

// ===== Principal =====

@Injectable()
export class ProveedorClaude implements ProveedorIa {
  private readonly registro = new Logger('ProveedorClaude');
  private cliente: Anthropic | null = null;

  async generar<T extends z.ZodType>(
    tarea: TareaIa,
    instrucciones: string,
    mensaje: string,
    esquema: T,
  ): Promise<ResultadoIa<z.infer<T>>> {
    const { modelo, esfuerzo, conRespaldoServidor } = configurarTarea(tarea, leerConfiguracion());
    const cliente = this.obtenerCliente();
    if (!cliente) {
      return { estado: 'sin_clave', tokens: 0, modelo };
    }

    try {
      const respuesta = await cliente.beta.messages.parse({
        model: modelo,
        max_tokens: TOKENS_MAXIMOS,
        system: instrucciones,
        messages: [{ role: 'user', content: mensaje }],
        output_config: { effort: esfuerzo, format: betaZodOutputFormat(esquema) },
        ...(conRespaldoServidor ? { betas: [BETA_RESPALDO_SERVIDOR], fallbacks: 'default' } : {}),
      });
      const tokens = respuesta.usage.input_tokens + respuesta.usage.output_tokens;

      if (respuesta.stop_reason === 'refusal') {
        return {
          estado: 'rechazo',
          tokens,
          modelo,
          detalle: respuesta.stop_details?.category ?? undefined,
        };
      }
      if (respuesta.parsed_output === null) {
        return {
          estado: 'error',
          tokens,
          modelo,
          detalle: `sin salida (${respuesta.stop_reason})`,
        };
      }
      return { estado: 'ok', datos: respuesta.parsed_output as z.infer<T>, tokens, modelo };
    } catch (error) {
      const detalle =
        error instanceof Anthropic.APIError
          ? `${error.status ?? 'sin estado'}: ${error.message}`
          : error instanceof Error
            ? error.message
            : String(error);
      this.registro.warn(`[${tarea}] ${modelo} falló: ${detalle}`);
      return { estado: 'error', tokens: 0, modelo, detalle };
    }
  }

  /**
   * Crea el cliente la primera vez. El servidor exige ANTHROPIC_API_KEY: sin ella el SDK solo
   * fallaría al hacer cada petición, así que se responde "sin_clave" de inmediato (sin reintentos
   * ni gasto del límite diario) y la app sigue con el catálogo.
   */
  private obtenerCliente(): Anthropic | null {
    if (this.cliente) {
      return this.cliente;
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return null;
    }
    this.cliente = new Anthropic();
    return this.cliente;
  }
}
