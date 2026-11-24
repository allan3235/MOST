import { pilaParaRetomar } from '../retomar';

describe('retomar el formulario', () => {
  it('en el paso 3: Empezar y los pasos 1 a 3 (UC-01: ya no hay elección de modo)', () => {
    expect(pilaParaRetomar({ pantalla: 'formulario', paso: 3 }).map((r) => r.name)).toEqual([
      'empezar',
      'formulario/[paso]',
      'formulario/[paso]',
      'formulario/[paso]',
    ]);
    const ultimo = pilaParaRetomar({ pantalla: 'formulario', paso: 3 }).at(-1);
    expect(ultimo).toEqual({ name: 'formulario/[paso]', params: { paso: '3' } });
  });

  it('en la revisión del plan: los 7 pasos y la revisión al final', () => {
    const pila = pilaParaRetomar({ pantalla: 'revision' });
    expect(pila).toHaveLength(9);
    expect(pila[7]).toEqual({ name: 'formulario/[paso]', params: { paso: '7' } });
    expect(pila[8]).toEqual({ name: 'revision' });
  });
});
