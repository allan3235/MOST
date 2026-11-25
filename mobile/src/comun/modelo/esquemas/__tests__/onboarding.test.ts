import {
  areaDeObjetivo,
  OBJETIVOS,
  OBJETIVOS_POR_AREA,
  respuestasSchema,
  disponibilidadIgual,
  diasDisponibles,
  momentoPrincipal,
  momentosComunes,
  normalizarRespuestas,
  type Disponibilidad,
} from '@/comun/modelo/esquemas/onboarding';

const validas = {
  areas: ['salud_fisica', 'social'],
  objetivos: ['mover_mas', 'tiempo_de_calidad'],
  historial: 'empieza_y_deja',
  tiempo: '10_20',
  disponibilidad: disponibilidadIgual(['noche']),
  obstaculos: ['olvido'],
  acompanamiento: 'recordatorio_suave',
};

describe('claves del formulario', () => {
  it('cada objetivo pertenece a un área y no hay objetivos sueltos', () => {
    const agrupados = Object.values(OBJETIVOS_POR_AREA).flat();
    const orden = (a: string, b: string) => a.localeCompare(b);
    expect([...agrupados].sort(orden)).toEqual([...OBJETIVOS].sort(orden));
    expect(areaDeObjetivo('tiempo_de_calidad')).toBe('social');
  });
});

describe('respuestasSchema', () => {
  it('acepta el ejemplo del SDD 4', () => {
    expect(respuestasSchema.safeParse(validas).success).toBe(true);
  });

  it('exige de 1 a 2 áreas y objetivos', () => {
    expect(respuestasSchema.safeParse({ ...validas, areas: [] }).success).toBe(false);
    expect(
      respuestasSchema.safeParse({
        ...validas,
        areas: ['salud_fisica', 'social', 'finanzas'],
      }).success,
    ).toBe(false);
    expect(
      respuestasSchema.safeParse({
        ...validas,
        objetivos: ['mover_mas', 'dormir_mejor', 'tiempo_de_calidad'],
      }).success,
    ).toBe(false);
  });

  it('rechaza objetivos de un área no elegida', () => {
    const resultado = respuestasSchema.safeParse({
      ...validas,
      objetivos: ['mover_mas', 'empezar_ahorrar'],
    });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(['objetivos']);
  });

  it('rechaza repetidos y claves desconocidas', () => {
    expect(
      respuestasSchema.safeParse({ ...validas, objetivos: ['mover_mas', 'mover_mas'] }).success,
    ).toBe(false);
    expect(respuestasSchema.safeParse({ ...validas, tiempo: '5_min' }).success).toBe(false);
  });
});

describe('versión 4: P5 por día y P6 con varias respuestas', () => {
  it('las respuestas de la versión 3 se convierten al validarlas', () => {
    const v3 = { ...validas, momento: 'noche', obstaculo: 'olvido' } as Record<string, unknown>;
    delete v3.disponibilidad;
    delete v3.obstaculos;
    const r = respuestasSchema.parse(v3);
    expect(r.disponibilidad).toEqual(disponibilidadIgual(['noche']));
    expect(r.obstaculos).toEqual(['olvido']);
  });

  it('«varía» de la versión 3 queda como cualquier momento: el aviso sigue siendo flexible', () => {
    const r = normalizarRespuestas({ momento: 'varia' }) as { disponibilidad: Disponibilidad };
    expect(momentoPrincipal(r.disponibilidad)).toBe('varia');
  });

  it('el momento principal es el primero que se repite en todos los días libres', () => {
    const d: Disponibilidad = [['tarde', 'noche'], ['noche'], [], ['noche'], [], [], []];
    expect(diasDisponibles(d)).toEqual([1, 2, 4]);
    expect(momentosComunes(d, [1, 2, 4])).toEqual(['noche']);
    expect(momentoPrincipal(d)).toBe('noche');
    expect(momentoPrincipal([['manana'], ['tarde'], [], [], [], [], []])).toBe('varia');
  });

  it('pide al menos un momento en la semana y al menos un obstáculo', () => {
    expect(
      respuestasSchema.safeParse({ ...validas, disponibilidad: disponibilidadIgual([]) }).success,
    ).toBe(false);
    expect(respuestasSchema.safeParse({ ...validas, obstaculos: [] }).success).toBe(false);
  });
});
