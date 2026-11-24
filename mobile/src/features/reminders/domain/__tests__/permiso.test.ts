import { debePedirAlarmasExactas, siguientePaso } from '../permiso';

describe('siguientePaso', () => {
  it('con el permiso dado no hay nada que hacer', () => {
    expect(siguientePaso({ concedido: true, puedePreguntar: true })).toBe('listo');
    expect(siguientePaso({ concedido: true, puedePreguntar: false })).toBe('listo');
  });

  it('sin permiso, se pregunta si Android lo deja', () => {
    expect(siguientePaso({ concedido: false, puedePreguntar: true })).toBe('preguntar');
  });

  it('si Android ya no deja preguntar, se manda a Ajustes', () => {
    expect(siguientePaso({ concedido: false, puedePreguntar: false })).toBe('ajustes');
  });
});

describe('alarmas exactas (RF-01: el aviso llega a su hora)', () => {
  it('en Android sin el permiso se explica una vez por sesión', () => {
    const base = { plataforma: 'android', permitidas: false, yaPreguntado: false };
    expect(debePedirAlarmasExactas(base)).toBe(true);
    expect(debePedirAlarmasExactas({ ...base, yaPreguntado: true })).toBe(false);
  });

  it('con el permiso, o en iOS, no se pregunta nada', () => {
    expect(
      debePedirAlarmasExactas({ plataforma: 'android', permitidas: true, yaPreguntado: false }),
    ).toBe(false);
    expect(
      debePedirAlarmasExactas({ plataforma: 'ios', permitidas: false, yaPreguntado: false }),
    ).toBe(false);
  });
});
