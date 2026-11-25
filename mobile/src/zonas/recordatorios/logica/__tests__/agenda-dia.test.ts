/**
 * @file agenda-dia.test.ts
 * @proyecto most.
 * @descripcion Pruebas de la vista por día de «Mi agenda» (RF-02): bloques en orden, ratos libres
 *   entre ellos y cambios que aplican solo a un día de un bloque que se repite.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-25
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-25): creación.
 */

import {
  bloquesDelDia,
  cambioSoloUnDia,
  diaIso,
  franjasDelDia,
  type BloqueAgenda,
} from '@/zonas/recordatorios/logica/agenda';

// ===== Datos de prueba =====

const CLASE: BloqueAgenda = {
  id: 'b1',
  nombre: 'Clase',
  dias_semana: [1, 2, 3, 4, 5],
  hora_inicio: '10:00:00',
  hora_fin: '12:00:00',
};

const TRABAJO: BloqueAgenda = {
  id: 'b2',
  nombre: 'Trabajo',
  dias_semana: [1, 3],
  hora_inicio: '07:00:00',
  hora_fin: '09:00:00',
};

// ===== Pruebas =====

describe('diaIso', () => {
  it('lunes es 1 y domingo es 7', () => {
    expect(diaIso(new Date('2026-11-23T12:00:00'))).toBe(1);
    expect(diaIso(new Date('2026-11-29T12:00:00'))).toBe(7);
  });
});

describe('bloquesDelDia', () => {
  it('solo los de ese día y ordenados por hora, aunque se hayan creado en otro orden', () => {
    expect(bloquesDelDia([CLASE, TRABAJO], 1).map((b) => b.nombre)).toEqual(['Trabajo', 'Clase']);
    expect(bloquesDelDia([CLASE, TRABAJO], 2).map((b) => b.nombre)).toEqual(['Clase']);
    expect(bloquesDelDia([CLASE, TRABAJO], 6)).toEqual([]);
  });
});

describe('franjasDelDia', () => {
  it('muestra lo ocupado y los ratos libres entre bloques, de 06:00 a 23:00', () => {
    const franjas = franjasDelDia([CLASE, TRABAJO], 1).map((f) =>
      f.tipo === 'ocupado'
        ? `${f.bloque.nombre} ${f.inicio}-${f.fin}`
        : `libre ${f.inicio}-${f.fin}`,
    );
    expect(franjas).toEqual([
      'libre 06:00-07:00',
      'Trabajo 07:00-09:00',
      'libre 09:00-10:00',
      'Clase 10:00-12:00',
      'libre 12:00-23:00',
    ]);
  });

  it('un día sin bloques es un solo rato libre', () => {
    expect(franjasDelDia([CLASE], 7)).toEqual([{ tipo: 'libre', inicio: '06:00', fin: '23:00' }]);
  });

  it('bloques encimados no dejan un rato libre falso', () => {
    const encimado = { ...TRABAJO, id: 'b3', hora_inicio: '11:00:00', hora_fin: '13:00:00' };
    const libres = franjasDelDia([CLASE, encimado], 1).filter((f) => f.tipo === 'libre');
    expect(libres.map((f) => `${f.inicio}-${f.fin}`)).toEqual(['06:00-10:00', '13:00-23:00']);
  });
});

describe('cambioSoloUnDia', () => {
  const datos = {
    nombre: 'Clase',
    dias_semana: [1, 2, 3, 4, 5],
    hora_inicio: '16:00',
    hora_fin: '18:00',
  };

  it('en un bloque de lunes a viernes, cambiar el miércoles lo separa y deja los demás igual', () => {
    expect(cambioSoloUnDia(CLASE, 3, datos)).toEqual({
      tipo: 'separar',
      diasRestantes: [1, 2, 4, 5],
      nuevo: { ...datos, dias_semana: [3] },
    });
  });

  it('si el bloque solo ocurre ese día, simplemente se edita', () => {
    expect(cambioSoloUnDia({ ...CLASE, dias_semana: [3] }, 3, datos)).toEqual({
      tipo: 'editar',
      datos: { ...datos, dias_semana: [3] },
    });
  });
});
