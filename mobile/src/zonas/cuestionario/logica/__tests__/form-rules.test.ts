import {
  disponibilidadIgual,
  MOMENTOS_CON_HORA,
  OBSTACULOS,
  type Obstaculo,
} from '@/comun/modelo/esquemas/onboarding';
import {
  alternarArea,
  alternarObjetivo,
  alternarSeleccion,
  BORRADOR_VACIO,
  leerPaso,
  pasoCompleto,
  respuestasCompletas,
  totalPasos,
  type Borrador,
  alternarCelda,
  alternarMomento,
  alternarObstaculo,
  esIgualTodosLosDias,
  momentoEnTodosLosDias,
} from '@/zonas/cuestionario/logica/form-rules';

describe('alternarSeleccion', () => {
  it('agrega y quita valores', () => {
    expect(alternarSeleccion(['a'], 'b', 2)).toEqual(['a', 'b']);
    expect(alternarSeleccion(['a', 'b'], 'a', 2)).toEqual(['b']);
  });

  it('con el máximo elegido, el nuevo reemplaza al primero que se eligió', () => {
    expect(alternarSeleccion(['a', 'b'], 'c', 2)).toEqual(['b', 'c']);
  });
});

describe('alternarArea', () => {
  it('al quitar un área descarta sus objetivos', () => {
    const borrador: Borrador = {
      ...BORRADOR_VACIO,
      areas: ['salud_fisica', 'social'],
      objetivos: ['mover_mas', 'tiempo_de_calidad'],
    };
    expect(alternarArea(borrador, 'salud_fisica')).toEqual({
      areas: ['social'],
      objetivos: ['tiempo_de_calidad'],
    });
  });

  it('un plan es de un área: elegir otra la reemplaza y descarta sus objetivos', () => {
    const borrador: Borrador = {
      ...BORRADOR_VACIO,
      areas: ['trabajo'],
      objetivos: ['aprender_algo'],
    };
    expect(alternarArea(borrador, 'finanzas')).toEqual({ areas: ['finanzas'], objetivos: [] });
  });

  it('el primer plan tiene 7 pasos y los siguientes, 3', () => {
    expect(totalPasos(false)).toBe(7);
    expect(totalPasos(true)).toBe(3);
  });
});

describe('alternarObjetivo', () => {
  it('un tercer objetivo reemplaza al primero elegido', () => {
    const borrador: Borrador = {
      ...BORRADOR_VACIO,
      areas: ['salud_fisica'],
      objetivos: ['mover_mas', 'tomar_agua'],
    };
    expect(alternarObjetivo(borrador, 'dormir_mejor')).toEqual(['tomar_agua', 'dormir_mejor']);
  });
});

describe('pasoCompleto y respuestasCompletas', () => {
  const completo: Borrador = {
    areas: ['finanzas'],
    objetivos: ['empezar_ahorrar'],
    historial: 'primera_vez',
    tiempo: 'menos_10',
    disponibilidad: disponibilidadIgual(MOMENTOS_CON_HORA),
    obstaculos: ['recursos'],
    acompanamiento: 'minimo',
  };

  it('cada paso pide su respuesta', () => {
    expect(pasoCompleto(1, BORRADOR_VACIO)).toBe(false);
    expect(pasoCompleto(1, completo)).toBe(true);
    expect(pasoCompleto(7, { ...completo, acompanamiento: undefined })).toBe(false);
  });

  it('devuelve las respuestas solo si todo está completo', () => {
    expect(respuestasCompletas(completo)).toEqual(completo);
    expect(respuestasCompletas({ ...completo, tiempo: undefined })).toBeNull();
  });
});

describe('leerPaso', () => {
  it('acepta 1 a 7 y regresa al 1 con valores raros', () => {
    expect(leerPaso('4')).toBe(4);
    expect(leerPaso(['7'])).toBe(7);
    expect(leerPaso('9')).toBe(1);
    expect(leerPaso('abc')).toBe(1);
    expect(leerPaso(undefined)).toBe(1);
  });
});

describe('P5 por día y P6 con varias respuestas', () => {
  const vacia = BORRADOR_VACIO.disponibilidad;

  it('un botón general marca el momento en los 7 días y, si ya estaba, lo quita de todos', () => {
    const conManana = alternarMomento(vacia, 'manana');
    expect(conManana.every((m) => m.includes('manana'))).toBe(true);
    expect(momentoEnTodosLosDias(conManana, 'manana')).toBe(true);
    expect(alternarMomento(conManana, 'manana')).toEqual(vacia);
  });

  it('se pueden elegir varios momentos y quedan en orden del día', () => {
    const d = alternarMomento(alternarMomento(vacia, 'noche'), 'manana');
    expect(d[0]).toEqual(['manana', 'noche']);
    expect(esIgualTodosLosDias(d)).toBe(true);
  });

  it('la cuadrícula cambia un solo día y entonces ya no es igual todos los días', () => {
    const d = alternarCelda(alternarMomento(vacia, 'tarde'), 5, 'manana');
    expect(d[5]).toEqual(['manana', 'tarde']);
    expect(d[0]).toEqual(['tarde']);
    expect(esIgualTodosLosDias(d)).toBe(false);
    expect(momentoEnTodosLosDias(d, 'manana')).toBe(false);
  });

  it('la P5 está completa con al menos un momento en algún día; la P6, con al menos uno', () => {
    expect(pasoCompleto(5, BORRADOR_VACIO)).toBe(false);
    expect(
      pasoCompleto(5, { ...BORRADOR_VACIO, disponibilidad: alternarCelda(vacia, 6, 'noche') }),
    ).toBe(true);
    expect(pasoCompleto(6, BORRADOR_VACIO)).toBe(false);
    expect(pasoCompleto(6, { ...BORRADOR_VACIO, obstaculos: ['olvido', 'recursos'] })).toBe(true);
  });

  it('la P6 no tiene tope: se pueden marcar los seis', () => {
    const todos = OBSTACULOS.reduce<Obstaculo[]>((lista, o) => alternarObstaculo(lista, o), []);
    expect(todos).toEqual([...OBSTACULOS]);
    expect(alternarObstaculo(todos, 'olvido')).not.toContain('olvido');
  });
});
