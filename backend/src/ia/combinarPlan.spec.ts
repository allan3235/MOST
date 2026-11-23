/**
 * @file combinarPlan.spec.ts
 * @proyecto most.
 * @descripcion Pruebas de la unión del hábito del motor con sus micro-pasos.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import type { HabitoPlan } from '@most/compartido/plan';

import { combinarConMicroPasos } from './combinarPlan.js';
import type { HabitoPropuesto } from './esquemasIa.js';

// ===== Datos de prueba =====

const HABITO: HabitoPlan = {
  objetivo: 'leer_mas',
  categoria: 'trabajo',
  nivel: 2,
  variante: 'base',
  titulo: 'Leer 10 min (catálogo)',
  descripcion: 'Del catálogo.',
  duracion_min: 10,
  usa_duracion_reducida: true,
  dias_semana: [1, 2, 3],
  hora: '20:30',
  flexible: false,
  notificar: true,
};

const PROPUESTO: HabitoPropuesto = {
  objetivo: 'leer_mas',
  categoria: 'trabajo',
  titulo: 'Leer más',
  descripcion: '',
  paso_inicial: 2,
  usa_duracion_reducida: true,
  micro_pasos: [
    {
      orden: 1,
      titulo: 'Leer 3 min',
      descripcion: '',
      duracion_min: 3,
      duracion_reducida_min: 1,
      dias_semana: [1, 4],
    },
    {
      orden: 2,
      titulo: 'Leer 8 min',
      descripcion: 'Con calma.',
      duracion_min: 8,
      duracion_reducida_min: 4,
      dias_semana: [1, 3, 5],
    },
    {
      orden: 3,
      titulo: 'Leer 15 min',
      descripcion: '',
      duracion_min: 15,
      duracion_reducida_min: 5,
      dias_semana: [1, 3, 5],
    },
  ],
};

// ===== Pruebas =====

describe('combinarConMicroPasos', () => {
  it('con micro-pasos de la IA, el hábito toma el paso actual y conserva hora y aviso', () => {
    const habito = combinarConMicroPasos(HABITO, PROPUESTO, true);
    expect(habito).toMatchObject({
      titulo: 'Leer 8 min',
      descripcion: 'Con calma.',
      duracion_min: 8,
      dias_semana: [1, 3, 5],
      hora: '20:30',
      nivel: 2,
      paso_actual: 2,
    });
    expect(habito.micro_pasos).toHaveLength(3);
  });

  it('con el catálogo conserva los textos del motor y solo agrega la secuencia', () => {
    const habito = combinarConMicroPasos(HABITO, PROPUESTO, false);
    expect(habito.titulo).toBe('Leer 10 min (catálogo)');
    expect(habito.micro_pasos).toHaveLength(3);
  });

  it('una descripción vacía queda como null, igual que en el catálogo', () => {
    const habito = combinarConMicroPasos(HABITO, { ...PROPUESTO, paso_inicial: 1 }, true);
    expect(habito.descripcion).toBeNull();
  });
});
