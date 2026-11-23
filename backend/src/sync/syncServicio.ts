/**
 * @file syncServicio.ts
 * @proyecto most.
 * @descripcion Sincronización entre la base local de la app y PostgreSQL. Todo corre como el
 *   usuario con sesión (rol authenticated + RLS): aunque la app mande la fila de otra persona,
 *   la base la rechaza. Las recompensas (complete/uncomplete/archive) las calculan las funciones
 *   SQL de siempre.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { Injectable } from '@nestjs/common';

import { BaseDatosServicio, type ClienteBaseDatos } from '../baseDatos/baseDatosServicio.js';
import {
  construirConsultaCambios,
  construirConsultaFila,
  construirUpdate,
  construirUpsert,
  type EsquemaTabla,
  type Fila,
} from './constructorSql.js';
import {
  CAMPO_FECHA_POR_TABLA,
  type Operacion,
  type PeticionCambios,
  type ResultadoOperacion,
  type TablaLectura,
} from './esquemasSync.js';

// ===== Constantes =====

/** Columnas y tipo de cada tabla de public, leídos del catálogo de PostgreSQL. */
const SQL_COLUMNAS = `
  select c.relname::text as tabla, a.attname::text as columna, format_type(a.atttypid, a.atttypmod) as tipo
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
  order by c.relname, a.attnum`;

/**
 * Clave primaria de cada tabla de public, en el orden del índice. Se convierte a text[]: "pg" no
 * entiende los arreglos del tipo name[] y los entregaría como el texto "{id}".
 */
const SQL_CLAVES = `
  select c.relname::text as tabla,
         array_agg(a.attname::text order by array_position(i.indkey::int2[], a.attnum)) as clave
  from pg_index i
  join pg_class c on c.oid = i.indrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum = any (i.indkey::int2[])
  where i.indisprimary and n.nspname = 'public'
  group by c.relname`;

// ===== Principal =====

@Injectable()
export class SyncServicio {
  private esquemas: Promise<Map<string, EsquemaTabla>> | null = null;

  constructor(private readonly baseDatos: BaseDatosServicio) {}

  /**
   * Aplica una operación de la cola de la app.
   * @param usuarioId Usuario con sesión.
   * @param operacion Operación validada.
   * @returns Filas guardadas o resultado de la función de recompensas.
   */
  async aplicarOperacion(usuarioId: string, operacion: Operacion): Promise<ResultadoOperacion> {
    const esquemas = await this.leerEsquemas();
    return this.baseDatos.comoUsuario(usuarioId, (cliente) =>
      this.ejecutar(cliente, esquemas, operacion),
    );
  }

  /**
   * Aplica varias operaciones en una sola transacción: o se guardan todas, o ninguna.
   * @param usuarioId Usuario con sesión.
   * @param operaciones Operaciones validadas, en orden.
   * @returns Resultado de cada operación.
   */
  async aplicarLote(usuarioId: string, operaciones: Operacion[]): Promise<ResultadoOperacion[]> {
    const esquemas = await this.leerEsquemas();
    return this.baseDatos.comoUsuario(usuarioId, async (cliente) => {
      const resultados: ResultadoOperacion[] = [];
      for (const operacion of operaciones) {
        resultados.push(await this.ejecutar(cliente, esquemas, operacion));
      }
      return resultados;
    });
  }

  /**
   * Filas de una tabla que cambiaron desde el cursor (solo las que RLS deja ver).
   * @param usuarioId Usuario con sesión.
   * @param peticion Tabla, cursor y página.
   * @returns Filas en orden de updated_at.
   */
  async leerCambios(usuarioId: string, peticion: PeticionCambios): Promise<Fila[]> {
    const tabla = await this.esquemaDe(peticion.tabla);
    const consulta = construirConsultaCambios(tabla, {
      desde: peticion.desde,
      desdeFecha: peticion.desdeFecha,
      campoFecha: CAMPO_FECHA_POR_TABLA[peticion.tabla],
      limite: peticion.tamano,
      desplazamiento: peticion.pagina * peticion.tamano,
    });
    return this.baseDatos.comoUsuario(usuarioId, async (cliente) => {
      const resultado = await cliente.query<Fila>(consulta.sql, consulta.valores);
      return resultado.rows;
    });
  }

  /**
   * Una fila por su clave, o null si no existe o no es del usuario.
   * @param usuarioId Usuario con sesión.
   * @param nombreTabla Tabla permitida para leer.
   * @param clave Valores de la clave primaria.
   * @returns La fila o null.
   */
  async leerFila(usuarioId: string, nombreTabla: TablaLectura, clave: Fila): Promise<Fila | null> {
    const consulta = construirConsultaFila(await this.esquemaDe(nombreTabla), clave);
    return this.baseDatos.comoUsuario(usuarioId, async (cliente) => {
      const resultado = await cliente.query<Fila>(consulta.sql, consulta.valores);
      return resultado.rows[0] ?? null;
    });
  }

  /** Ejecuta una operación dentro de una transacción ya abierta. */
  private async ejecutar(
    cliente: ClienteBaseDatos,
    esquemas: Map<string, EsquemaTabla>,
    operacion: Operacion,
  ): Promise<ResultadoOperacion> {
    switch (operacion.operacion) {
      case 'upsert': {
        const tabla = this.buscarEsquema(esquemas, operacion.tabla);
        const filas: Fila[] = [];
        for (const fila of operacion.filas) {
          const consulta = construirUpsert(tabla, fila, operacion.enConflicto);
          filas.push(...(await cliente.query<Fila>(consulta.sql, consulta.valores)).rows);
        }
        return { filas };
      }
      case 'update': {
        const tabla = this.buscarEsquema(esquemas, operacion.tabla);
        const consulta = construirUpdate(tabla, operacion.clave, operacion.cambios);
        return { filas: (await cliente.query<Fila>(consulta.sql, consulta.valores)).rows };
      }
      case 'complete':
        return this.llamarFuncion(
          cliente,
          'select public.complete_habit($1, $2, $3) as resultado',
          [operacion.log_id, operacion.habit_id, operacion.fecha],
        );
      case 'uncomplete':
        return this.llamarFuncion(cliente, 'select public.uncomplete_habit($1, $2) as resultado', [
          operacion.habit_id,
          operacion.fecha,
        ]);
      case 'archive':
        return this.llamarFuncion(cliente, 'select public.archivar_habito($1, $2) as resultado', [
          operacion.habit_id,
          operacion.fecha,
        ]);
    }
  }

  /** Llama una función SQL que devuelve jsonb. */
  private async llamarFuncion(
    cliente: ClienteBaseDatos,
    sql: string,
    parametros: unknown[],
  ): Promise<ResultadoOperacion> {
    const resultado = await cliente.query<{ resultado: unknown }>(sql, parametros);
    return { resultado: resultado.rows[0]?.resultado ?? null };
  }

  /** Esquema de una tabla (de la caché). */
  private async esquemaDe(nombre: string): Promise<EsquemaTabla> {
    return this.buscarEsquema(await this.leerEsquemas(), nombre);
  }

  private buscarEsquema(esquemas: Map<string, EsquemaTabla>, nombre: string): EsquemaTabla {
    const tabla = esquemas.get(nombre);
    if (!tabla) {
      throw new Error(`La tabla ${nombre} no existe en la base (¿faltan migraciones?)`);
    }
    return tabla;
  }

  /** Lee una sola vez el esquema de todas las tablas. Si falla, se vuelve a intentar después. */
  private leerEsquemas(): Promise<Map<string, EsquemaTabla>> {
    this.esquemas ??= this.cargarEsquemas().catch((error: unknown) => {
      this.esquemas = null;
      throw error;
    });
    return this.esquemas;
  }

  private async cargarEsquemas(): Promise<Map<string, EsquemaTabla>> {
    const columnas = await this.baseDatos.consultar<{
      tabla: string;
      columna: string;
      tipo: string;
    }>(SQL_COLUMNAS);
    const claves = await this.baseDatos.consultar<{ tabla: string; clave: string[] }>(SQL_CLAVES);
    const clavePorTabla = new Map(claves.map((fila) => [fila.tabla, fila.clave]));

    const columnasPorTabla = new Map<string, Map<string, string>>();
    for (const { tabla, columna, tipo } of columnas) {
      const mapa = columnasPorTabla.get(tabla) ?? new Map<string, string>();
      mapa.set(columna, tipo);
      columnasPorTabla.set(tabla, mapa);
    }

    const esquemas = new Map<string, EsquemaTabla>();
    for (const [nombre, mapa] of columnasPorTabla) {
      esquemas.set(nombre, { nombre, columnas: mapa, clave: clavePorTabla.get(nombre) ?? [] });
    }
    return esquemas;
  }
}
