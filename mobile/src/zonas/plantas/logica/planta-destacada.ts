// Planta que se muestra en Hoy (SDD 9.4): la que la persona eligió en el Jardín; si no eligió
// ninguna, la de fase más alta. Si hay empate, se prefiere una con hábitos y después la primera
// según el orden de las áreas.

export function plantaDestacada<T extends { fase: number; tieneHabitos: boolean; area?: string }>(
  plantas: readonly T[],
  elegida: string | null = null,
): T | null {
  const preferida = elegida === null ? undefined : plantas.find((p) => p.area === elegida);
  if (preferida) return preferida;
  let mejor: T | null = null;
  for (const planta of plantas) {
    if (
      mejor === null ||
      planta.fase > mejor.fase ||
      (planta.fase === mejor.fase && planta.tieneHabitos && !mejor.tieneHabitos)
    ) {
      mejor = planta;
    }
  }
  return mejor;
}
