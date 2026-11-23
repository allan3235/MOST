/**
 * @file baseDatosServicio.ts
 * @proyecto most.
 * @descripcion Conexión a PostgreSQL. Las operaciones de un usuario corren con
 *   comoUsuario(): una transacción con el rol "authenticated" y el id del usuario, para que las
 *   políticas RLS de la base decidan qué filas puede leer o escribir (igual que en Supabase).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';

import { leerConfiguracion } from '../comun/configuracion.js';

// ===== Tipos =====

export type ClienteBaseDatos = pg.PoolClient;

// ===== Principal =====

@Injectable()
export class BaseDatosServicio implements OnModuleDestroy {
  private readonly pool: pg.Pool;

  constructor() {
    this.pool = new pg.Pool({ connectionString: leerConfiguracion().DATABASE_URL });
  }

  /**
   * Consulta con el rol del backend, sin RLS. Solo para lo que no pertenece a un usuario con
   * sesión (por ejemplo, registro e inicio de sesión).
   * @param sql Consulta con parámetros $1, $2…
   * @param parametros Valores de los parámetros.
   * @returns Filas del resultado.
   */
  async consultar<T extends pg.QueryResultRow>(
    sql: string,
    parametros: unknown[] = [],
  ): Promise<T[]> {
    const resultado = await this.pool.query<T>(sql, parametros);
    return resultado.rows;
  }

  /**
   * Ejecuta un trabajo como el usuario indicado, dentro de una transacción. Si el trabajo lanza
   * un error, se deshace todo.
   * @param usuarioId Id del usuario con sesión.
   * @param trabajo Función que recibe el cliente de la transacción.
   * @returns Lo que devuelva el trabajo.
   */
  async comoUsuario<T>(
    usuarioId: string,
    trabajo: (cliente: ClienteBaseDatos) => Promise<T>,
  ): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('begin');
      await cliente.query('set local role authenticated');
      await cliente.query("select set_config('app.usuario_id', $1, true)", [usuarioId]);
      const resultado = await trabajo(cliente);
      await cliente.query('commit');
      return resultado;
    } catch (error) {
      await cliente.query('rollback');
      throw error;
    } finally {
      cliente.release();
    }
  }

  /** Cierra las conexiones al apagar el servidor. */
  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
