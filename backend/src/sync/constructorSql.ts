/**
 * @file constructorSql.ts
 * @proyecto most.
 * @descripcion Arma las consultas SQL de la sincronización a partir del esquema real de cada
 *   tabla. Solo acepta nombres de columna que existen en la base (se leen de PostgreSQL), así que
 *   no se puede inyectar SQL por los nombres; los valores siempre van como parámetros ($1, $2…).
 *   Son funciones puras: no tocan la base y se prueban sin ella.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { ErrorSync } from './errorSync.js';

// ===== Tipos =====

/** Columnas (nombre → tipo de PostgreSQL) y clave primaria de una tabla. */
export type EsquemaTabla = {
  nombre: string;
  columnas: ReadonlyMap<string, string>;
  clave: readonly string[];
};

export type ConsultaSql = { sql: string; valores: unknown[] };

export type Fila = Record<string, unknown>;

export type OpcionesCambios = {
  /** Marca de tiempo (updated_at) de la última fila recibida; sin ella se descarga todo. */
  desde?: string;
  /** Primera descarga: solo filas con campoFecha igual o posterior a esta fecha. */
  desdeFecha?: string;
  campoFecha?: string;
  limite: number;
  desplazamiento: number;
};

// ===== Constantes =====

const COLUMNA_ACTUALIZACION = 'updated_at';
const TIPOS_JSON = new Set(['json', 'jsonb']);

// ===== Funciones auxiliares =====

/** Pone comillas a un identificador ya validado contra el esquema. */
function citar(identificador: string): string {
  return `"${identificador}"`;
}

/** Lanza ErrorSync si alguna columna no existe en la tabla. */
function revisarColumnas(tabla: EsquemaTabla, columnas: readonly string[]): void {
  for (const columna of columnas) {
    if (!tabla.columnas.has(columna)) {
      throw new ErrorSync(
        'COLUMNA_DESCONOCIDA',
        `La columna ${columna} no existe en ${tabla.nombre}`,
      );
    }
  }
}

/** Tipo de la columna (ya validada). */
function tipoDe(tabla: EsquemaTabla, columna: string): string {
  return tabla.columnas.get(columna) ?? 'text';
}

/**
 * Prepara un valor para enviarlo como parámetro. Los JSON se envían como texto: si no, "pg"
 * convertiría un arreglo en un arreglo de PostgreSQL en lugar de un arreglo JSON.
 */
function prepararValor(tipo: string, valor: unknown): unknown {
  if (valor === undefined || valor === null) {
    return null;
  }
  return TIPOS_JSON.has(tipo) ? JSON.stringify(valor) : valor;
}

/** Condición "k1 = $n::tipo and k2 = …" para buscar por clave primaria. */
function condicionPorClave(tabla: EsquemaTabla, clave: Fila, primerParametro: number): ConsultaSql {
  const columnas = Object.keys(clave);
  const estaCompleta =
    columnas.length === tabla.clave.length && tabla.clave.every((c) => columnas.includes(c));
  if (!estaCompleta) {
    throw new ErrorSync(
      'CLAVE_INCOMPLETA',
      `La clave de ${tabla.nombre} es (${tabla.clave.join(', ')})`,
    );
  }
  const partes = tabla.clave.map(
    (columna, i) => `${citar(columna)} = $${primerParametro + i}::${tipoDe(tabla, columna)}`,
  );
  return {
    sql: partes.join(' and '),
    valores: tabla.clave.map((columna) => prepararValor(tipoDe(tabla, columna), clave[columna])),
  };
}

// ===== Principal =====

/**
 * insert … on conflict … do update: crea la fila o actualiza las columnas enviadas.
 * @param tabla Esquema de la tabla.
 * @param fila Columnas y valores.
 * @param enConflicto Columnas del índice único que decide si la fila ya existe (por defecto, la
 *   clave primaria).
 * @returns Consulta con parámetros; devuelve la fila guardada.
 */
export function construirUpsert(
  tabla: EsquemaTabla,
  fila: Fila,
  enConflicto: readonly string[] = tabla.clave,
): ConsultaSql {
  const columnas = Object.keys(fila);
  if (columnas.length === 0) {
    throw new ErrorSync('FILA_VACIA', `No hay columnas para guardar en ${tabla.nombre}`);
  }
  revisarColumnas(tabla, [...columnas, ...enConflicto]);

  const marcadores = columnas.map((columna, i) => `$${i + 1}::${tipoDe(tabla, columna)}`);
  const actualizables = columnas.filter((columna) => !enConflicto.includes(columna));
  const accion =
    actualizables.length === 0
      ? 'do nothing'
      : `do update set ${actualizables.map((c) => `${citar(c)} = excluded.${citar(c)}`).join(', ')}`;

  return {
    sql:
      `insert into public.${citar(tabla.nombre)} (${columnas.map(citar).join(', ')}) ` +
      `values (${marcadores.join(', ')}) ` +
      `on conflict (${enConflicto.map(citar).join(', ')}) ${accion} returning *`,
    valores: columnas.map((columna) => prepararValor(tipoDe(tabla, columna), fila[columna])),
  };
}

/**
 * update … where clave: cambia algunas columnas de una fila existente.
 * @param tabla Esquema de la tabla.
 * @param clave Valores de la clave primaria completa.
 * @param cambios Columnas a cambiar (no puede incluir la clave).
 * @returns Consulta con parámetros; devuelve la fila cambiada (ninguna si RLS no la deja ver).
 */
export function construirUpdate(tabla: EsquemaTabla, clave: Fila, cambios: Fila): ConsultaSql {
  const columnas = Object.keys(cambios);
  if (columnas.length === 0) {
    throw new ErrorSync('FILA_VACIA', `No hay columnas para cambiar en ${tabla.nombre}`);
  }
  revisarColumnas(tabla, columnas);
  if (columnas.some((columna) => tabla.clave.includes(columna))) {
    throw new ErrorSync('DATOS_INVALIDOS', `La clave de ${tabla.nombre} no se puede cambiar`);
  }

  const asignaciones = columnas.map(
    (columna, i) => `${citar(columna)} = $${i + 1}::${tipoDe(tabla, columna)}`,
  );
  const condicion = condicionPorClave(tabla, clave, columnas.length + 1);
  return {
    sql:
      `update public.${citar(tabla.nombre)} set ${asignaciones.join(', ')} ` +
      `where ${condicion.sql} returning *`,
    valores: [
      ...columnas.map((columna) => prepararValor(tipoDe(tabla, columna), cambios[columna])),
      ...condicion.valores,
    ],
  };
}

/**
 * select de una fila por su clave primaria.
 * @param tabla Esquema de la tabla.
 * @param clave Valores de la clave primaria completa.
 * @returns Consulta con parámetros.
 */
export function construirConsultaFila(tabla: EsquemaTabla, clave: Fila): ConsultaSql {
  const condicion = condicionPorClave(tabla, clave, 1);
  return {
    sql: `select * from public.${citar(tabla.nombre)} where ${condicion.sql}`,
    valores: condicion.valores,
  };
}

/**
 * select de las filas que cambiaron, en orden de updated_at y clave, por páginas.
 * @param tabla Esquema de la tabla.
 * @param opciones Cursor, filtro de la primera descarga y página.
 * @returns Consulta con parámetros.
 */
export function construirConsultaCambios(
  tabla: EsquemaTabla,
  opciones: OpcionesCambios,
): ConsultaSql {
  revisarColumnas(tabla, [COLUMNA_ACTUALIZACION]);
  const valores: unknown[] = [];
  let filtro = '';
  if (opciones.desde !== undefined) {
    valores.push(opciones.desde);
    filtro = `where ${citar(COLUMNA_ACTUALIZACION)} > $1::timestamptz`;
  } else if (opciones.desdeFecha !== undefined && opciones.campoFecha !== undefined) {
    revisarColumnas(tabla, [opciones.campoFecha]);
    valores.push(opciones.desdeFecha);
    filtro = `where ${citar(opciones.campoFecha)} >= $1::date`;
  }
  const orden = [COLUMNA_ACTUALIZACION, ...tabla.clave].map(citar).join(', ');
  valores.push(opciones.limite, opciones.desplazamiento);
  const partes = [
    `select * from public.${citar(tabla.nombre)}`,
    filtro,
    `order by ${orden}`,
    `limit $${valores.length - 1} offset $${valores.length}`,
  ];
  return { sql: partes.filter((parte) => parte !== '').join(' '), valores };
}
