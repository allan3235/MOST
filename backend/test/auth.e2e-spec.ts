/**
 * @file auth.e2e-spec.ts
 * @proyecto most.
 * @descripcion Prueba de punta a punta de cuentas contra la base real (docker compose up -d y
 *   pnpm db:migrar antes). Comprueba registro, login, la guardia de sesión y que las políticas
 *   RLS solo dejan ver los datos propios.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación (reemplaza app.e2e-spec.ts de la plantilla).
 */

import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AplicacionModulo } from '../src/aplicacionModulo.js';
import { BaseDatosServicio } from '../src/baseDatos/baseDatosServicio.js';

// ===== Constantes =====

const CONTRASENA = 'pasito-a-pasito';
const CATEGORIAS_DEL_SISTEMA = 5;

// ===== Funciones auxiliares =====

/** Correo único para que la prueba se pueda repetir sin chocar con cuentas anteriores. */
function crearCorreo(): string {
  return `prueba-${randomUUID()}@most.test`;
}

// ===== Pruebas =====

describe('Cuentas (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    if (existsSync('.env')) {
      process.loadEnvFile('.env');
    }
    const modulo = await Test.createTestingModule({ imports: [AplicacionModulo] }).compile();
    app = modulo.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /salud responde con la base conectada', async () => {
    const respuesta = await request(app.getHttpServer()).get('/salud').expect(200);
    expect(respuesta.body).toEqual({ estado: 'ok', baseDatos: true });
  });

  it('registra, inicia sesión y lee el usuario con el token', async () => {
    const correo = crearCorreo();
    const registro = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({ correo: correo.toUpperCase(), contrasena: CONTRASENA })
      .expect(201);
    expect(registro.body.usuario.correo).toBe(correo);
    expect(registro.body.token).toEqual(expect.any(String));

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo, contrasena: CONTRASENA })
      .expect(200);

    const yo = await request(app.getHttpServer())
      .get('/auth/yo')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(200);
    expect(yo.body).toEqual({ id: registro.body.usuario.id, correo });
  });

  it('rechaza correo repetido, contraseña incorrecta, datos inválidos y token falso', async () => {
    const correo = crearCorreo();
    const servidor = app.getHttpServer();
    await request(servidor)
      .post('/auth/registro')
      .send({ correo, contrasena: CONTRASENA })
      .expect(201);
    await request(servidor)
      .post('/auth/registro')
      .send({ correo, contrasena: CONTRASENA })
      .expect(409);
    await request(servidor)
      .post('/auth/login')
      .send({ correo, contrasena: 'otra-cosa-1' })
      .expect(401);
    await request(servidor)
      .post('/auth/registro')
      .send({ correo: 'no-es-correo', contrasena: 'x' })
      .expect(400);
    await request(servidor).get('/auth/yo').set('Authorization', 'Bearer falso').expect(401);
    await request(servidor).get('/auth/yo').expect(401);
  });

  it('crea perfil, monedero y plantas, y RLS solo deja ver lo propio', async () => {
    const servidor = app.getHttpServer();
    const primero = await request(servidor)
      .post('/auth/registro')
      .send({ correo: crearCorreo(), contrasena: CONTRASENA });
    await request(servidor)
      .post('/auth/registro')
      .send({ correo: crearCorreo(), contrasena: CONTRASENA });

    const baseDatos = app.get(BaseDatosServicio);
    const visto = await baseDatos.comoUsuario(primero.body.usuario.id, async (cliente) => {
      const perfiles = await cliente.query('select id from public.profiles');
      const monederos = await cliente.query('select saldo from public.wallets');
      const plantas = await cliente.query('select category_id from public.plant_progress');
      return { perfiles: perfiles.rows, monederos: monederos.rows, plantas: plantas.rows };
    });

    expect(visto.perfiles).toEqual([{ id: primero.body.usuario.id }]);
    expect(visto.monederos).toEqual([{ saldo: 0 }]);
    expect(visto.plantas).toHaveLength(CATEGORIAS_DEL_SISTEMA);
  });

  it('RLS impide que el usuario se dé monedas', async () => {
    const servidor = app.getHttpServer();
    const registro = await request(servidor)
      .post('/auth/registro')
      .send({ correo: crearCorreo(), contrasena: CONTRASENA });
    const baseDatos = app.get(BaseDatosServicio);

    const filasCambiadas = await baseDatos.comoUsuario(
      registro.body.usuario.id,
      async (cliente) => {
        const resultado = await cliente.query('update public.wallets set saldo = 9999');
        return resultado.rowCount;
      },
    );
    expect(filasCambiadas).toBe(0);
  });
});
