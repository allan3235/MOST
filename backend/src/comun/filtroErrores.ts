/**
 * @file filtroErrores.ts
 * @proyecto most.
 * @descripcion Convierte los errores de PostgreSQL en respuestas HTTP con "code" (el SQLSTATE).
 *   Ejemplos: una política RLS que rechaza (42501) → 403; una regla de negocio de las funciones
 *   SQL (P0001, como "no_programado") → 400. Con "code", la app sabe que es un rechazo definitivo
 *   y no lo reintenta. Los errores inesperados responden 500 sin "code" (la app reintentará).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

// ===== Tipos =====

type ErrorPostgres = { code: string; message: string; severity: string };

// ===== Constantes =====

const SQLSTATE = /^[0-9A-Z]{5}$/;
const CODIGO_RLS = '42501';
const CODIGO_DUPLICADO = '23505';
/** Clases de SQLSTATE que significan "la petición no es válida", no "falló el servidor". */
const CLASES_DE_RECHAZO = ['22', '23', '42', 'P0'];

// ===== Funciones auxiliares =====

/** true si el error viene de PostgreSQL (trae SQLSTATE y severidad). */
function esErrorPostgres(error: unknown): error is ErrorPostgres {
  const candidato = error as Partial<ErrorPostgres> | null;
  return (
    typeof candidato?.code === 'string' &&
    SQLSTATE.test(candidato.code) &&
    typeof candidato.severity === 'string'
  );
}

/**
 * Estado HTTP para un SQLSTATE, o null si es un error del servidor.
 * @param codigo SQLSTATE de PostgreSQL.
 * @returns Estado HTTP de rechazo, o null.
 */
export function estadoParaSqlstate(codigo: string): number | null {
  if (codigo === CODIGO_RLS) {
    return HttpStatus.FORBIDDEN;
  }
  if (codigo === CODIGO_DUPLICADO) {
    return HttpStatus.CONFLICT;
  }
  return CLASES_DE_RECHAZO.includes(codigo.slice(0, 2)) ? HttpStatus.BAD_REQUEST : null;
}

// ===== Principal =====

@Catch()
export class FiltroErrores implements ExceptionFilter {
  private readonly registro = new Logger('FiltroErrores');

  /**
   * Responde según el tipo de error.
   * @param error Error lanzado por un controlador o servicio.
   * @param anfitrion Contexto de Nest con la respuesta HTTP.
   */
  catch(error: unknown, anfitrion: ArgumentsHost): void {
    const respuesta = anfitrion.switchToHttp().getResponse<Response>();

    if (error instanceof HttpException) {
      respuesta.status(error.getStatus()).json(error.getResponse());
      return;
    }

    if (esErrorPostgres(error)) {
      const estado = estadoParaSqlstate(error.code);
      if (estado !== null) {
        respuesta
          .status(estado)
          .json({ statusCode: estado, code: error.code, message: error.message });
        return;
      }
    }

    this.registro.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    respuesta
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error del servidor' });
  }
}
