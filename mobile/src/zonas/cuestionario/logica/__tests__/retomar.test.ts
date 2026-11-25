import { pilaParaRetomar } from '@/zonas/cuestionario/logica/retomar';

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

  it('en la revisión: las 5 preguntas del perfil y la revisión al final', () => {
    const pila = pilaParaRetomar({ pantalla: 'revision' });
    expect(pila).toHaveLength(7);
    expect(pila[5]).toEqual({ name: 'formulario/[paso]', params: { paso: '5' } });
    expect(pila[6]).toEqual({ name: 'revision' });
  });
});
