/**
 * @file agenda.test.ts
 * @proyecto most.
 * @descripcion Pruebas de la agenda de bloques ocupados (RF-02, CP-04).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación.
 */

import { bloqueQueChoca, primeraHoraLibre, validarBloque, type BloqueAgenda } from '../agenda';

const CLASES: BloqueAgenda = {
  id: 'b1',
  nombre: 'Clases',
  dias_semana: [1, 3, 5],
  hora_inicio: '10:00:00',
  hora_fin: '11:00:00',
};
const TRABAJO: BloqueAgenda = {
  id: 'b2',
  nombre: 'Trabajo',
  dias_semana: [1],
  hora_inicio: '11:00',
  hora_fin: '13:00',
};

describe('agenda de bloques ocupados', () => {
  it('CP-04: 10:00 en la franja 10:00–11:00 se rechaza y se sugiere 11:00', () => {
    expect(bloqueQueChoca([CLASES], [1, 3, 5], '10:00', 5)?.nombre).toBe('Clases');
    expect(primeraHoraLibre([CLASES], [1, 3, 5], '10:00', 5)).toBe('11:00');
  });

  it('no choca en otro día ni fuera del bloque', () => {
    expect(bloqueQueChoca([CLASES], [2, 4], '10:30', 5)).toBeNull();
    expect(bloqueQueChoca([CLASES], [1], '11:00', 5)).toBeNull();
    expect(bloqueQueChoca([CLASES], [1], '09:00', 30)).toBeNull();
  });

  it('el hábito no puede empezar justo antes y meterse al bloque', () => {
    expect(bloqueQueChoca([CLASES], [1], '09:55', 10)?.nombre).toBe('Clases');
  });

  it('salta bloques seguidos hasta la primera hora libre', () => {
    expect(primeraHoraLibre([CLASES, TRABAJO], [1], '10:15', 5)).toBe('13:00');
  });

  it('si ya no cabe ese día no sugiere nada', () => {
    const noche = { ...CLASES, hora_inicio: '22:00', hora_fin: '23:59' };
    expect(primeraHoraLibre([noche], [1], '22:30', 15)).toBeNull();
  });

  it('valida nombre, días y que el fin sea después del inicio', () => {
    expect(validarBloque({ ...CLASES, nombre: '  ' })).toBe('sin_nombre');
    expect(validarBloque({ ...CLASES, dias_semana: [] })).toBe('sin_dias');
    expect(validarBloque({ ...CLASES, hora_fin: '09:00' })).toBe('horas');
    expect(validarBloque(CLASES)).toBeNull();
  });
});
