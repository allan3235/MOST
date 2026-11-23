/**
 * @file ia.e2e-spec.ts
 * @proyecto most.
 * @descripcion Prueba de punta a punta del módulo de IA con una IA simulada (no llama a Claude ni
 *   gasta): reglas aplicadas a lo que propone la IA, reintento, respaldo al catálogo, límite
 *   diario, metas no apropiadas, paso más ligero con el modelo pequeño y RLS de micro_pasos.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AplicacionModulo } from '../src/aplicacionModulo.js';
import { PrismaServicio } from '../src/baseDatos/prismaServicio.js';
import type { TareaIa } from '../src/ia/modelosIa.js';
import { PROVEEDOR_IA, type ProveedorIa, type ResultadoIa } from '../src/ia/proveedorIa.js';

// ===== Tipos =====

type Sesion = { token: string; id: string };

type Llamada = { tarea: TareaIa; mensaje: string };

// ===== IA simulada =====

/** Cola de respuestas: cada llamada toma la siguiente. Registra qué tarea se pidió. */
class IaSimulada implements ProveedorIa {
  respuestas: ResultadoIa<unknown>[] = [];
  llamadas: Llamada[] = [];

  async generar<T>(
    tarea: TareaIa,
    _instrucciones: string,
    mensaje: string,
  ): Promise<ResultadoIa<T>> {
    this.llamadas.push({ tarea, mensaje });
    const siguiente = this.respuestas.shift() ?? { estado: 'error', tokens: 0, modelo: 'simulada' };
    return siguiente as ResultadoIa<T>;
  }
}

function ok(datos: unknown): ResultadoIa<unknown> {
  return { estado: 'ok', datos, tokens: 100, modelo: 'simulada' };
}

function paso(duracion: number, titulo = `Leer ${duracion} min`) {
  return {
    titulo,
    descripcion: 'Un rato de lectura.',
    duracion_min: duracion,
    duracion_reducida_min: 1,
    dias_semana: [1, 3, 5],
  };
}

// ===== Constantes =====

const CONTRASENA = 'pasito-a-pasito';
const RESPUESTAS = {
  areas: ['trabajo'],
  objetivos: ['leer_mas'],
  historial: 'primera_vez',
  tiempo: '10_20',
  momento: 'noche',
  obstaculo: 'motivacion',
  acompanamiento: 'recordatorio_suave',
};

// ===== Pruebas =====

describe('IA (e2e, simulada)', () => {
  let app: INestApplication<App>;
  const ia = new IaSimulada();

  async function registrar(): Promise<Sesion> {
    const respuesta = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({ correo: `ia-${randomUUID()}@most.test`, contrasena: CONTRASENA })
      .expect(201);
    return { token: respuesta.body.token, id: respuesta.body.usuario.id };
  }

  function enviar(sesion: Sesion, ruta: string, cuerpo: object): request.Test {
    return request(app.getHttpServer())
      .post(ruta)
      .set('Authorization', `Bearer ${sesion.token}`)
      .send(cuerpo);
  }

  beforeAll(async () => {
    if (existsSync('.env')) {
      process.loadEnvFile('.env');
    }
    const modulo = await Test.createTestingModule({ imports: [AplicacionModulo] })
      .overrideProvider(PROVEEDOR_IA)
      .useValue(ia)
      .compile();
    app = modulo.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    ia.respuestas = [];
    ia.llamadas = [];
  });

  afterAll(async () => {
    await app.close();
  });

  it('plan con IA: aplica las reglas de MOST a lo que propone', async () => {
    const sesion = await registrar();
    ia.respuestas = [
      ok({
        resumen: 'Empezamos pequeño.',
        habitos: [
          {
            objetivo: 'leer_mas',
            titulo: 'Leer más',
            descripcion: 'Poco a poco.',
            micro_pasos: [paso(15), paso(30), paso(90)],
          },
        ],
      }),
    ];
    const respuesta = await enviar(sesion, '/ia/plan', { respuestas: RESPUESTAS }).expect(200);

    expect(respuesta.body.origen).toBe('ia');
    const [habito] = respuesta.body.habitos;
    // El hábito toma el título y la duración de su paso actual; la hora la pone el motor (noche).
    expect(habito).toMatchObject({
      objetivo: 'leer_mas',
      categoria: 'trabajo',
      paso_actual: 1,
      titulo: 'Leer 5 min',
      duracion_min: 5,
      hora: '20:30',
    });
    // 15 → 5 (primer paso), 30 → 15 (triple), 90 → 20 (tiempo diario "10_20").
    expect(habito.micro_pasos.map((p: { duracion_min: number }) => p.duracion_min)).toEqual([
      5, 15, 20,
    ]);
    // Trae todo lo que la app necesita para la revisión del plan.
    expect(respuesta.body).toMatchObject({
      resumen: 'Empezamos pequeño.',
      ajustes: { presupuesto_min: 20, estilo_notificaciones: 'recordatorio_suave' },
      ventana_flexible: { inicio: '17:00', fin: '20:00' },
    });
    expect(respuesta.body.sugerencias.length).toBeGreaterThan(0);
    expect(ia.llamadas.map((l) => l.tarea)).toEqual(['plan']);
    // A la IA solo le llegan claves de la encuesta, nunca el correo.
    expect(ia.llamadas[0].mensaje).not.toContain('@most.test');
  });

  it('reintenta una respuesta inválida y, si vuelve a fallar, usa el catálogo', async () => {
    const sesion = await registrar();
    const invalida = ok({
      resumen: 'x',
      habitos: [{ objetivo: 'leer_mas', titulo: 'x', descripcion: '', micro_pasos: [paso(5)] }],
    });
    ia.respuestas = [invalida, invalida];

    const respuesta = await enviar(sesion, '/ia/plan', {
      respuestas: { ...RESPUESTAS, areas: ['salud_fisica'], objetivos: ['mover_mas'] },
    }).expect(200);

    expect(ia.llamadas).toHaveLength(2);
    expect(respuesta.body.origen).toBe('catalogo');
    // Catálogo de "mover_mas": 5, 15 y 30 min, con el tope de 20 al día.
    expect(
      respuesta.body.habitos[0].micro_pasos.map((p: { duracion_min: number }) => p.duracion_min),
    ).toEqual([5, 15, 20]);

    const registros = await app
      .get(PrismaServicio)
      .ai_requests.findMany({ where: { user_id: sesion.id } });
    expect(registros.map((r) => r.estado)).toEqual(['invalida', 'invalida']);
  });

  it('al llegar al límite diario no llama a la IA y usa el catálogo', async () => {
    const sesion = await registrar();
    const prisma = app.get(PrismaServicio);
    await prisma.ai_requests.createMany({
      data: Array.from({ length: 50 }, () => ({
        user_id: sesion.id,
        funcion: 'plan',
        estado: 'ok',
      })),
    });

    const respuesta = await enviar(sesion, '/ia/plan', { respuestas: RESPUESTAS }).expect(200);
    expect(respuesta.body.origen).toBe('catalogo');
    expect(ia.llamadas).toHaveLength(0);
  });

  it('meta escrita: la descompone en micro-pasos; rechaza las no apropiadas', async () => {
    const sesion = await registrar();
    const habito = {
      objetivo: 'meta_libre',
      titulo: 'Leer novelas',
      descripcion: 'Por gusto.',
      micro_pasos: [paso(3), paso(6), paso(12)],
    };

    ia.respuestas = [ok({ es_apropiada: true, habito })];
    const buena = await enviar(sesion, '/ia/meta', {
      texto: 'Quiero leer más novelas',
      categoria: 'trabajo',
    }).expect(200);
    expect(buena.body).toMatchObject({
      origen: 'ia',
      habito: { categoria: 'trabajo', objetivo: null },
    });
    expect(buena.body.habito.micro_pasos).toHaveLength(3);

    ia.respuestas = [ok({ es_apropiada: false, habito })];
    const mala = await enviar(sesion, '/ia/meta', {
      texto: 'Algo peligroso',
      categoria: 'trabajo',
    }).expect(422);
    expect(mala.body.code).toBe('META_NO_APROPIADA');

    ia.respuestas = [];
    const sinIa = await enviar(sesion, '/ia/meta', {
      texto: 'Leer más',
      categoria: 'trabajo',
    }).expect(503);
    expect(sinIa.body.code).toBe('IA_NO_DISPONIBLE');

    await enviar(sesion, '/ia/meta', { texto: 'x', categoria: 'trabajo' }).expect(400);
  });

  it('paso más ligero: usa la tarea del modelo pequeño y respeta el candado mínimo', async () => {
    const sesion = await registrar();
    const categorias = await request(app.getHttpServer())
      .get('/sync/cambios?tabla=categories')
      .set('Authorization', `Bearer ${sesion.token}`);
    const categoriaId = categorias.body.filas.find(
      (c: { clave: string }) => c.clave === 'trabajo',
    ).id;
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
              titulo: 'Leer',
              duracion_min: 10,
              paso_actual: 2,
            },
          ],
        },
        {
          operacion: 'upsert',
          tabla: 'micro_pasos',
          filas: [5, 10, 20].map((duracion, i) => ({
            habit_id: habitId,
            user_id: sesion.id,
            orden: i + 1,
            titulo: `Leer ${duracion} min`,
            duracion_min: duracion,
            duracion_reducida_min: 1,
            dias_semana: [1, 3, 5],
          })),
        },
      ],
    }).expect(200);

    ia.respuestas = [ok({ paso: paso(30, 'Leer 7 min') })];
    const conIa = await enviar(sesion, '/ia/paso-ligero', { habit_id: habitId }).expect(200);
    expect(ia.llamadas.map((l) => l.tarea)).toEqual(['paso_ligero']);
    // Propuso 30 min; el paso actual dura 10, así que queda en 9 (siempre más ligero).
    expect(conIa.body).toMatchObject({ origen: 'ia', antes_de: 2, paso: { duracion_min: 9 } });

    ia.respuestas = [];
    const sinIa = await enviar(sesion, '/ia/paso-ligero', { habit_id: habitId }).expect(200);
    expect(sinIa.body).toMatchObject({ origen: 'catalogo', paso: { duracion_min: 5 } });

    const ajena = await registrar();
    await enviar(ajena, '/ia/paso-ligero', { habit_id: habitId }).expect(404);
  });

  it('RLS: nadie agrega micro-pasos a hábitos ajenos', async () => {
    const duena = await registrar();
    const otra = await registrar();
    const categorias = await request(app.getHttpServer())
      .get('/sync/cambios?tabla=categories')
      .set('Authorization', `Bearer ${duena.token}`);
    const categoriaId = categorias.body.filas[0].id;
    const habitId = randomUUID();
    await enviar(duena, '/sync/operacion', {
      operacion: 'upsert',
      tabla: 'habits',
      filas: [
        {
          id: habitId,
          user_id: duena.id,
          category_id: categoriaId,
          titulo: 'Leer',
          duracion_min: 5,
        },
      ],
    }).expect(200);

    const intento = await enviar(otra, '/sync/operacion', {
      operacion: 'upsert',
      tabla: 'micro_pasos',
      filas: [
        {
          habit_id: habitId,
          user_id: otra.id,
          orden: 1,
          titulo: 'x',
          duracion_min: 5,
          duracion_reducida_min: 1,
          dias_semana: [1],
        },
      ],
    }).expect(403);
    expect(intento.body.code).toBe('42501');
  });
});
