/**
 * @file migrar.ts
 * @proyecto most.
 * @descripcion Aplica en orden las migraciones SQL de db/migraciones que falten en la base.
 *   Cada archivo corre en su propia transacción: si falla, no queda a medias.
 *   Uso: pnpm db:migrar  |  pnpm db:reiniciar (borra todo y vuelve a migrar; solo desarrollo).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

// ===== Constantes =====

const CARPETA_MIGRACIONES = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'db',
  'migraciones',
);
const BANDERA_REINICIAR = '--reiniciar';

// ===== Funciones auxiliares =====

/**
 * Borra los esquemas de la app para empezar desde cero. Solo para la base de desarrollo.
 * @param cliente Conexión abierta a la base.
 */
async function reiniciarBase(cliente: pg.Client): Promise<void> {
  await cliente.query(`
    drop schema if exists public cascade;
    drop schema if exists auth cascade;
    drop schema if exists sistema cascade;
    create schema public;
  `);
  console.log('[migrar] Base reiniciada.');
}

/**
 * Lee los nombres de las migraciones ya aplicadas (crea la tabla de control si no existe).
 * @param cliente Conexión abierta a la base.
 * @returns Nombres de archivo aplicados.
 */
async function leerAplicadas(cliente: pg.Client): Promise<Set<string>> {
  await cliente.query(`
    create schema if not exists sistema;
    create table if not exists sistema.migraciones (
      nombre text primary key,
      aplicada_en timestamptz not null default now()
    );
  `);
  const resultado = await cliente.query<{ nombre: string }>(
    'select nombre from sistema.migraciones',
  );
  return new Set(resultado.rows.map((fila) => fila.nombre));
}

// ===== Principal =====

/**
 * Aplica las migraciones pendientes en orden alfabético (por eso llevan prefijo 0001_, 0002_…).
 */
async function migrar(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Falta DATABASE_URL. Copia .env.example como .env y llénalo.');
  }

  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    if (process.argv.includes(BANDERA_REINICIAR)) {
      await reiniciarBase(cliente);
    }
    const aplicadas = await leerAplicadas(cliente);
    const archivos = readdirSync(CARPETA_MIGRACIONES)
      .filter((nombre) => nombre.endsWith('.sql'))
      .sort();

    let cuenta = 0;
    for (const archivo of archivos) {
      if (aplicadas.has(archivo)) {
        continue;
      }
      const sql = readFileSync(join(CARPETA_MIGRACIONES, archivo), 'utf8');
      await cliente.query('begin');
      try {
        await cliente.query(sql);
        await cliente.query('insert into sistema.migraciones (nombre) values ($1)', [archivo]);
        await cliente.query('commit');
      } catch (error) {
        await cliente.query('rollback');
        throw new Error(`Falló ${archivo}: ${(error as Error).message}`, { cause: error });
      }
      console.log(`[migrar] Aplicada ${archivo}`);
      cuenta++;
    }
    console.log(cuenta === 0 ? '[migrar] Todo al día.' : `[migrar] ${cuenta} migración(es).`);
  } finally {
    await cliente.end();
  }
}

await migrar();
