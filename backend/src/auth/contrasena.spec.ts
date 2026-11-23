/**
 * @file contrasena.spec.ts
 * @proyecto most.
 * @descripcion Pruebas del hash de contraseñas.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-22
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-22): creación.
 */

import { crearHashContrasena, esContrasenaCorrecta } from './contrasena.js';

describe('contrasena', () => {
  it('acepta la contraseña correcta y rechaza otra', async () => {
    const hash = await crearHashContrasena('pasito-a-pasito');
    expect(await esContrasenaCorrecta('pasito-a-pasito', hash)).toBe(true);
    expect(await esContrasenaCorrecta('otra-contrasena', hash)).toBe(false);
  });

  it('no guarda la contraseña y usa una sal distinta cada vez', async () => {
    const primero = await crearHashContrasena('pasito-a-pasito');
    const segundo = await crearHashContrasena('pasito-a-pasito');
    expect(primero).not.toContain('pasito');
    expect(primero).not.toBe(segundo);
  });

  it('rechaza un hash con formato desconocido', async () => {
    expect(await esContrasenaCorrecta('x', 'texto-plano')).toBe(false);
    expect(await esContrasenaCorrecta('x', 'bcrypt$a$b')).toBe(false);
  });
});
