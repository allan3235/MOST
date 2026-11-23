/**
 * @file constructorSql.spec.ts
 * @proyecto most.
 * @descripcion Pruebas del armado de consultas de sincronización.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import {
  construirConsultaCambios,
  construirConsultaFila,
  construirUpdate,
  construirUpsert,
  type EsquemaTabla,
} from './constructorSql.js';
import { ErrorSync } from './errorSync.js';

// ===== Datos de prueba =====

const HABITOS: EsquemaTabla = {
  nombre: 'habits',
  columnas: new Map([
    ['id', 'uuid'],
    ['user_id', 'uuid'],
    ['titulo', 'text'],
    ['activo', 'boolean'],
    ['updated_at', 'timestamp with time zone'],
  ]),
  clave: ['id'],
};

const REGISTROS: EsquemaTabla = {
  nombre: 'habit_logs',
  columnas: new Map([
    ['habit_id', 'uuid'],
    ['fecha', 'date'],
    ['updated_at', 'timestamp with time zone'],
  ]),
  clave: ['habit_id', 'fecha'],
};

const PLANES: EsquemaTabla = {
  nombre: 'plans',
  columnas: new Map([
    ['id', 'uuid'],
    ['json_plan', 'jsonb'],
  ]),
  clave: ['id'],
};

// ===== Pruebas =====

describe('construirUpsert', () => {
  it('inserta o actualiza las columnas que no son clave', () => {
    const consulta = construirUpsert(HABITOS, { id: 'h1', titulo: 'Caminar', activo: true });
    expect(consulta.sql).toBe(
      'insert into public."habits" ("id", "titulo", "activo") values ($1::uuid, $2::text, $3::boolean) ' +
        'on conflict ("id") do update set "titulo" = excluded."titulo", "activo" = excluded."activo" returning *',
    );
    expect(consulta.valores).toEqual(['h1', 'Caminar', true]);
  });

  it('usa otra columna de conflicto y no hace nada si solo viene la clave', () => {
    const consulta = construirUpsert(HABITOS, { user_id: 'u1' }, ['user_id']);
    expect(consulta.sql).toContain('on conflict ("user_id") do nothing');
  });

  it('envía los JSON como texto (también los arreglos)', () => {
    const consulta = construirUpsert(PLANES, { id: 'p1', json_plan: [1, 2] });
    expect(consulta.valores).toEqual(['p1', '[1,2]']);
  });

  it('rechaza columnas inexistentes (no se puede inyectar SQL por el nombre)', () => {
    expect(() => construirUpsert(HABITOS, { 'titulo"; drop table habits; --': 'x' })).toThrow(
      ErrorSync,
    );
    expect(() => construirUpsert(HABITOS, {})).toThrow(ErrorSync);
  });
});

describe('construirUpdate', () => {
  it('cambia columnas buscando por la clave completa', () => {
    const consulta = construirUpdate(
      REGISTROS,
      { habit_id: 'h1', fecha: '2026-11-22' },
      {
        updated_at: 'x',
      },
    );
    expect(consulta.sql).toBe(
      'update public."habit_logs" set "updated_at" = $1::timestamp with time zone ' +
        'where "habit_id" = $2::uuid and "fecha" = $3::date returning *',
    );
    expect(consulta.valores).toEqual(['x', 'h1', '2026-11-22']);
  });

  it('rechaza una clave incompleta o cambiar la clave', () => {
    expect(() => construirUpdate(REGISTROS, { habit_id: 'h1' }, { updated_at: 'x' })).toThrow(
      ErrorSync,
    );
    expect(() => construirUpdate(HABITOS, { id: 'h1' }, { id: 'h2' })).toThrow(ErrorSync);
  });
});

describe('construirConsultaFila', () => {
  it('busca por la clave primaria', () => {
    expect(construirConsultaFila(HABITOS, { id: 'h1' })).toEqual({
      sql: 'select * from public."habits" where "id" = $1::uuid',
      valores: ['h1'],
    });
  });
});

describe('construirConsultaCambios', () => {
  it('desde un cursor, ordenado por updated_at y clave', () => {
    const consulta = construirConsultaCambios(REGISTROS, {
      desde: '2026-11-22T10:00:00.123456+00:00',
      limite: 1000,
      desplazamiento: 0,
    });
    expect(consulta.sql).toBe(
      'select * from public."habit_logs" where "updated_at" > $1::timestamptz ' +
        'order by "updated_at", "habit_id", "fecha" limit $2 offset $3',
    );
    expect(consulta.valores).toEqual(['2026-11-22T10:00:00.123456+00:00', 1000, 0]);
  });

  it('primera descarga con filtro de fecha, o todo', () => {
    const conFecha = construirConsultaCambios(REGISTROS, {
      desdeFecha: '2025-11-22',
      campoFecha: 'fecha',
      limite: 10,
      desplazamiento: 20,
    });
    expect(conFecha.sql).toContain('where "fecha" >= $1::date');
    expect(conFecha.valores).toEqual(['2025-11-22', 10, 20]);

    const todo = construirConsultaCambios(HABITOS, { limite: 10, desplazamiento: 0 });
    expect(todo.sql).toBe(
      'select * from public."habits" order by "updated_at", "id" limit $1 offset $2',
    );
  });
});
