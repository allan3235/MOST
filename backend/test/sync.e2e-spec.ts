/**
 * @file sync.e2e-spec.ts
 * @proyecto most.
 * @descripcion Prueba de punta a punta de la sincronización contra la base real: crear hábito y
 *   horario, completar y deshacer (monedas y XP), descarga incremental con cursor, rechazos de
 *   RLS y de validación, lotes atómicos y tienda.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AplicacionModulo } from '../src/aplicacionModulo.js';

// ===== Tipos =====

type Fila = Record<string, unknown>;

type Sesion = { token: string; id: string };

// ===== Constantes =====

const CONTRASENA = 'pasito-a-pasito';
const TODOS_LOS_DIAS = [1, 2, 3, 4, 5, 6, 7];
const MONEDAS_POR_HABITO = 10;
const XP_POR_HABITO = 2;

// ===== Pruebas =====

describe('Sincronización (e2e)', () => {
  let app: INestApplication<App>;
  let ana: Sesion;
  let beto: Sesion;
  let categoriaId: string;
  /** El perfil nace con zona UTC, así que "hoy" para el servidor es la fecha UTC. */
  const hoy = new Date().toISOString().slice(0, 10);

  /** Registra un usuario nuevo. */
  async function registrar(): Promise<Sesion> {
    const respuesta = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({ correo: `sync-${randomUUID()}@most.test`, contrasena: CONTRASENA })
      .expect(201);
    return { token: respuesta.body.token, id: respuesta.body.usuario.id };
  }

  /** POST con el token de la sesión. */
  function enviar(sesion: Sesion, ruta: string, cuerpo: object): request.Test {
    return request(app.getHttpServer())
      .post(ruta)
      .set('Authorization', `Bearer ${sesion.token}`)
      .send(cuerpo);
  }

  /** Descarga una tabla completa (o desde un cursor). */
  async function cambios(sesion: Sesion, tabla: string, desde?: string): Promise<Fila[]> {
    const respuesta = await request(app.getHttpServer())
      .get('/sync/cambios')
      .query(desde ? { tabla, desde } : { tabla })
      .set('Authorization', `Bearer ${sesion.token}`)
      .expect(200);
    return respuesta.body.filas;
  }

  /** Crea un hábito diario con su horario en un solo lote. */
  async function crearHabito(sesion: Sesion, titulo = 'Caminar 5 min'): Promise<string> {
    const habitId = randomUUID();
    await enviar(sesion, '/sync/lote', {
      operaciones: [
        {
          operacion: 'upsert',
          tabla: 'habits',
          filas: [
            {
              id: habitId,
              user_id: sesion.id,
              category_id: categoriaId,
              titulo,
              duracion_min: 5,
            },
          ],
        },
        {
          operacion: 'upsert',
          tabla: 'habit_schedules',
          filas: [
            {
              id: randomUUID(),
              habit_id: habitId,
              user_id: sesion.id,
              dias_semana: TODOS_LOS_DIAS,
              hora: '08:00',
              vigente_desde: hoy,
            },
          ],
        },
      ],
    }).expect(200);
    return habitId;
  }

  beforeAll(async () => {
    if (existsSync('.env')) {
      process.loadEnvFile('.env');
    }
    const modulo = await Test.createTestingModule({ imports: [AplicacionModulo] }).compile();
    app = modulo.createNestApplication();
    await app.init();

    ana = await registrar();
    beto = await registrar();
    const categorias = await cambios(ana, 'categories');
    categoriaId = String(categorias.find((c) => c.clave === 'salud_fisica')?.id);
  });

  afterAll(async () => {
    await app.close();
  });

  it('pide sesión', async () => {
    await request(app.getHttpServer()).get('/sync/cambios?tabla=habits').expect(401);
  });

  it('completar da monedas y XP una sola vez; deshacer las devuelve', async () => {
    const habitId = await crearHabito(ana);
    const completar = {
      operacion: 'complete',
      log_id: randomUUID(),
      habit_id: habitId,
      fecha: hoy,
    };

    const primera = await enviar(ana, '/sync/operacion', completar).expect(200);
    expect(primera.body.resultado).toMatchObject({ nuevo: true, monedas: true, xp: true });

    // La cola puede reenviar la misma operación: no paga dos veces.
    const repetida = await enviar(ana, '/sync/operacion', completar).expect(200);
    expect(repetida.body.resultado).toMatchObject({ nuevo: false });

    const [monedero] = await cambios(ana, 'wallets');
    expect(monedero.saldo).toBe(MONEDAS_POR_HABITO);
    const plantas = await cambios(ana, 'plant_progress');
    expect(plantas.find((p) => p.category_id === categoriaId)?.xp).toBe(XP_POR_HABITO);

    await enviar(ana, '/sync/operacion', {
      operacion: 'uncomplete',
      habit_id: habitId,
      fecha: hoy,
    }).expect(200);
    const [despues] = await cambios(ana, 'wallets');
    expect(despues.saldo).toBe(0);
  });

  it('la descarga con cursor solo trae lo nuevo (sin perder microsegundos)', async () => {
    const habitId = await crearHabito(ana, 'Estirarme 2 min');
    const habitos = await cambios(ana, 'habits');
    const cursor = String(habitos[habitos.length - 1].updated_at);
    expect(cursor).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+\+00:00$/);
    expect(await cambios(ana, 'habits', cursor)).toEqual([]);

    await enviar(ana, '/sync/operacion', {
      operacion: 'update',
      tabla: 'habits',
      clave: { id: habitId },
      cambios: { titulo: 'Estirarme 3 min' },
    }).expect(200);
    const nuevas = await cambios(ana, 'habits', cursor);
    expect(nuevas.map((h) => h.titulo)).toEqual(['Estirarme 3 min']);
  });

  it('RLS: nadie escribe ni ve los datos de otra persona', async () => {
    const habitId = await crearHabito(ana);

    const ajeno = await enviar(beto, '/sync/operacion', {
      operacion: 'upsert',
      tabla: 'habits',
      filas: [
        {
          id: randomUUID(),
          user_id: ana.id,
          category_id: categoriaId,
          titulo: 'x',
          duracion_min: 5,
        },
      ],
    }).expect(403);
    expect(ajeno.body.code).toBe('42501');

    const cambio = await enviar(beto, '/sync/operacion', {
      operacion: 'update',
      tabla: 'habits',
      clave: { id: habitId },
      cambios: { titulo: 'hackeado' },
    }).expect(200);
    expect(cambio.body.filas).toEqual([]);

    const fila = await enviar(beto, '/sync/fila', {
      tabla: 'habits',
      clave: { id: habitId },
    }).expect(200);
    expect(fila.body.fila).toBeNull();
    const propia = await enviar(ana, '/sync/fila', {
      tabla: 'habits',
      clave: { id: habitId },
    }).expect(200);
    expect(propia.body.fila.titulo).toBe('Caminar 5 min');
  });

  it('rechaza con código lo que no se arregla reintentando', async () => {
    const habitId = await crearHabito(ana);
    const casos: [object, number, string][] = [
      [{ operacion: 'upsert', tabla: 'wallets', filas: [{ saldo: 999 }] }, 400, 'DATOS_INVALIDOS'],
      [
        { operacion: 'upsert', tabla: 'habits', filas: [{ inventada: 1 }] },
        400,
        'COLUMNA_DESCONOCIDA',
      ],
      [
        { operacion: 'complete', log_id: randomUUID(), habit_id: habitId, fecha: '2999-01-01' },
        400,
        '22008',
      ],
      [
        { operacion: 'complete', log_id: randomUUID(), habit_id: randomUUID(), fecha: hoy },
        400,
        'P0002',
      ],
    ];
    for (const [operacion, estado, codigo] of casos) {
      const respuesta = await enviar(ana, '/sync/operacion', operacion).expect(estado);
      expect(respuesta.body.code).toBe(codigo);
    }
  });

  it('un lote es atómico: si una operación falla, no se guarda ninguna', async () => {
    const habitId = randomUUID();
    await enviar(ana, '/sync/lote', {
      operaciones: [
        {
          operacion: 'upsert',
          tabla: 'habits',
          filas: [
            {
              id: habitId,
              user_id: ana.id,
              category_id: categoriaId,
              titulo: 'Leer',
              duracion_min: 5,
            },
          ],
        },
        { operacion: 'upsert', tabla: 'habits', filas: [{ id: randomUUID(), user_id: beto.id }] },
      ],
    }).expect(403);
    const fila = await enviar(ana, '/sync/fila', {
      tabla: 'habits',
      clave: { id: habitId },
    }).expect(200);
    expect(fila.body.fila).toBeNull();
  });

  it('guarda JSON y usa otra columna de conflicto (respuestas por usuario)', async () => {
    const sesion = await registrar();
    const respuestas = (valor: string): object => ({
      operacion: 'upsert',
      tabla: 'onboarding_answers',
      enConflicto: ['user_id'],
      filas: [
        {
          id: randomUUID(),
          user_id: sesion.id,
          respuestas: { area: [valor] },
          version_formulario: 1,
        },
      ],
    });
    await enviar(sesion, '/sync/operacion', respuestas('trabajo')).expect(200);
    await enviar(sesion, '/sync/operacion', respuestas('social')).expect(200);

    const filas = await cambios(sesion, 'onboarding_answers');
    expect(filas).toHaveLength(1);
    expect(filas[0].respuestas).toEqual({ area: ['social'] });
  });

  it('la tienda rechaza comprar sin saldo', async () => {
    const [accesorio] = await cambios(ana, 'accessories');
    const respuesta = await enviar(ana, '/tienda/comprar', { accessory_id: accesorio.id }).expect(
      400,
    );
    expect(respuesta.body).toMatchObject({ code: 'P0001', message: 'saldo_insuficiente' });
  });
});
