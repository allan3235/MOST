/**
 * @file cifrado.test.ts
 * @proyecto most.
 * @descripcion Pruebas del cifrado de la base local (RNF-05, CP-10): clave aleatoria de 256 bits
 *   guardada en el almacén seguro, aplicada con PRAGMA key, y sin intento cuando el binario no
 *   trae SQLCipher.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import {
  aplicarClave,
  BYTES_CLAVE,
  obtenerClaveBase,
  type AlmacenClave,
  type BaseConClave,
} from '@/comun/datos/cifrado';

// ===== Datos de prueba =====

const LARGO_HEX = BYTES_CLAVE * 2;

function almacen(inicial: string | null = null): AlmacenClave & { valor: string | null } {
  const a = {
    valor: inicial,
    leer: async () => a.valor,
    guardar: async (clave: string) => {
      a.valor = clave;
    },
  };
  return a;
}

function base(conSqlcipher: boolean, abre = true): BaseConClave & { ejecutadas: string[] } {
  const ejecutadas: string[] = [];
  return {
    ejecutadas,
    getFirstAsync: async <T>(sql: string) => {
      if (sql.startsWith('PRAGMA cipher_version')) {
        return (conSqlcipher ? { cipher_version: '4.6.1' } : null) as T | null;
      }
      if (!abre) throw new Error('file is not a database');
      return { n: 0 } as T;
    },
    execAsync: async (sql: string) => {
      ejecutadas.push(sql);
    },
  };
}

// ===== Pruebas =====

describe('CP-10: cifrado de la base local', () => {
  it('crea una clave aleatoria de 256 bits, la guarda en el almacén seguro y la reutiliza', async () => {
    const seguro = almacen();
    const bytes = new Uint8Array(BYTES_CLAVE).fill(171);
    const clave = await obtenerClaveBase(seguro, () => bytes);
    expect(clave).toMatch(new RegExp(`^[0-9a-f]{${LARGO_HEX}}$`));
    expect(seguro.valor).toBe(clave);
    const otraVez = await obtenerClaveBase(seguro, () => new Uint8Array(BYTES_CLAVE));
    expect(otraVez).toBe(clave);
  });

  it('con SQLCipher aplica la clave con PRAGMA key y la base queda cifrada', async () => {
    const db = base(true);
    await expect(aplicarClave(db, 'ab'.repeat(BYTES_CLAVE))).resolves.toBe('cifrada');
    expect(db.ejecutadas).toEqual([`PRAGMA key = '${'ab'.repeat(BYTES_CLAVE)}'`]);
  });

  it('si la clave no abre el archivo (base vieja sin cifrar) pide recrearla', async () => {
    await expect(aplicarClave(base(true, false), 'cd'.repeat(BYTES_CLAVE))).resolves.toBe(
      'no_abre',
    );
  });

  it('sin SQLCipher (Expo Go) no ejecuta PRAGMA key', async () => {
    const db = base(false);
    await expect(aplicarClave(db, 'ef'.repeat(BYTES_CLAVE))).resolves.toBe('sin_sqlcipher');
    expect(db.ejecutadas).toEqual([]);
  });
});
