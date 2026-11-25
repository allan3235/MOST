import { plantaDestacada } from '@/zonas/plantas/logica/planta-destacada';

const planta = (id: string, fase: number, tieneHabitos: boolean) => ({ id, fase, tieneHabitos });

describe('planta destacada de Hoy (SDD 9.4)', () => {
  it('elige la de fase más alta, aunque no tenga hábitos', () => {
    const plantas = [planta('A', 1, true), planta('B', 3, false), planta('C', 2, true)];
    expect(plantaDestacada(plantas)?.id).toBe('B');
  });

  it('en un empate prefiere una con hábitos', () => {
    const plantas = [planta('A', 1, false), planta('B', 1, true), planta('C', 1, true)];
    expect(plantaDestacada(plantas)?.id).toBe('B');
  });

  it('si el empate sigue, usa la primera según el orden de las áreas', () => {
    const plantas = [planta('A', 1, false), planta('B', 1, false)];
    expect(plantaDestacada(plantas)?.id).toBe('A');
  });

  it('sin plantas devuelve null', () => {
    expect(plantaDestacada([])).toBeNull();
  });

  it('la que eligió en el Jardín gana aunque otra esté más avanzada', () => {
    const plantas = [
      { id: 'A', area: 'finanzas', fase: 1, tieneHabitos: true },
      { id: 'B', area: 'trabajo', fase: 3, tieneHabitos: true },
    ];
    expect(plantaDestacada(plantas, 'finanzas')?.id).toBe('A');
    // Si la elegida ya no está, vuelve a la más avanzada.
    expect(plantaDestacada(plantas, 'salud_fisica')?.id).toBe('B');
  });
});
