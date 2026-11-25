import {
  areaDeObjetivo,
  disponibilidadIgual,
  MAX_AREAS_POR_PLAN,
  MAX_OBJETIVOS,
  MOMENTOS_CON_HORA,
  OBJETIVOS_POR_AREA,
  respuestasSchema,
  type Area,
  type Disponibilidad,
  type MomentoConHora,
  type Objetivo,
  type Obstaculo,
  type Respuestas,
} from '@/comun/modelo/esquemas/onboarding';

// Reglas del formulario de 7 pasos (SDD 5.3), separadas de las pantallas para poder probarlas.

export const TOTAL_PASOS = 7;
export type Paso = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Respuestas a medio llenar: las listas empiezan vacías y las preguntas únicas, sin valor. */
export type Borrador = {
  areas: Area[];
  objetivos: Objetivo[];
  historial?: Respuestas['historial'];
  tiempo?: Respuestas['tiempo'];
  /** P5: momentos libres de cada día (lunes a domingo). */
  disponibilidad: Disponibilidad;
  /** P6: varias respuestas. */
  obstaculos: Obstaculo[];
  acompanamiento?: Respuestas['acompanamiento'];
};

export const BORRADOR_VACIO: Borrador = {
  areas: [],
  objetivos: [],
  disponibilidad: disponibilidadIgual([]),
  obstaculos: [],
};

// ===== P5 y P6 (varias respuestas) =====

/** ¿El momento está libre todos los días? Así se ve marcado en los botones generales de la P5. */
export function momentoEnTodosLosDias(d: Disponibilidad, momento: MomentoConHora): boolean {
  return d.every((momentos) => momentos.includes(momento));
}

/** ¿Los 7 días tienen los mismos momentos? Si no, la cuadrícula por día queda abierta. */
export function esIgualTodosLosDias(d: Disponibilidad): boolean {
  const [primero = []] = d;
  return d.every(
    (momentos) => momentos.length === primero.length && momentos.every((m) => primero.includes(m)),
  );
}

function ordenar(momentos: readonly MomentoConHora[]): MomentoConHora[] {
  return MOMENTOS_CON_HORA.filter((m) => momentos.includes(m));
}

/** Botón general de la P5: lo marca en todos los días, o lo quita de todos si ya estaba. */
export function alternarMomento(d: Disponibilidad, momento: MomentoConHora): Disponibilidad {
  const quitar = momentoEnTodosLosDias(d, momento);
  return d.map((momentos) =>
    quitar ? momentos.filter((m) => m !== momento) : ordenar([...momentos, momento]),
  );
}

/** Una casilla de la cuadrícula: un momento en un día (índice 0 = lunes). */
export function alternarCelda(
  d: Disponibilidad,
  indiceDia: number,
  momento: MomentoConHora,
): Disponibilidad {
  return d.map((momentos, i) => {
    if (i !== indiceDia) return momentos;
    return momentos.includes(momento)
      ? momentos.filter((m) => m !== momento)
      : ordenar([...momentos, momento]);
  });
}

/** P6: marca o desmarca un obstáculo, sin tope (decisión del usuario). */
export function alternarObstaculo(lista: readonly Obstaculo[], obstaculo: Obstaculo): Obstaculo[] {
  return lista.includes(obstaculo) ? lista.filter((o) => o !== obstaculo) : [...lista, obstaculo];
}

/**
 * Marca o desmarca un valor en una pregunta de «hasta N». Si ya hay N elegidos, el nuevo entra y
 * sale el primero que se eligió (decisión del usuario: sin advertencia, la selección se recorre).
 */
export function alternarSeleccion<T>(lista: readonly T[], valor: T, max: number): T[] {
  if (lista.includes(valor)) return lista.filter((v) => v !== valor);
  return [...lista, valor].slice(-max);
}

/** Elige o quita un área y descarta los objetivos que ya no pertenecen a las áreas elegidas. */
export function alternarArea(
  borrador: Borrador,
  area: Area,
): { areas: Area[]; objetivos: Objetivo[] } {
  const areas = alternarSeleccion(borrador.areas, area, MAX_AREAS_POR_PLAN);
  const objetivos = borrador.objetivos.filter((o) => areas.includes(areaDeObjetivo(o)));
  return { areas, objetivos };
}

export function alternarObjetivo(borrador: Borrador, objetivo: Objetivo): Objetivo[] {
  return alternarSeleccion(borrador.objetivos, objetivo, MAX_OBJETIVOS);
}

/** Objetivos que se muestran en la pregunta 2, agrupados por las áreas elegidas. */
export function objetivosPorAreaElegida(
  areas: readonly Area[],
): { area: Area; objetivos: readonly Objetivo[] }[] {
  return areas.map((area) => ({ area, objetivos: OBJETIVOS_POR_AREA[area] }));
}

/**
 * Pasos del formulario: el primer plan pregunta las 7; los planes siguientes solo las del área
 * (P1 área, P2 objetivos y P3 historial) y reusan las globales (P4 a P7) ya guardadas.
 */
export const PASOS_PLAN_ADICIONAL = 3;

export function totalPasos(adicional: boolean): number {
  return adicional ? PASOS_PLAN_ADICIONAL : TOTAL_PASOS;
}

/** Verdadero si la respuesta del paso permite continuar. */
export function pasoCompleto(paso: Paso, b: Borrador): boolean {
  switch (paso) {
    case 1:
      return b.areas.length > 0;
    case 2:
      return b.objetivos.length > 0;
    case 3:
      return b.historial !== undefined;
    case 4:
      return b.tiempo !== undefined;
    case 5:
      return b.disponibilidad.some((momentos) => momentos.length > 0);
    case 6:
      return b.obstaculos.length > 0;
    case 7:
      return b.acompanamiento !== undefined;
  }
}

/** Convierte el borrador en respuestas válidas, o null si falta algo o no cumple las reglas. */
export function respuestasCompletas(b: Borrador): Respuestas | null {
  const resultado = respuestasSchema.safeParse(b);
  return resultado.success ? resultado.data : null;
}

/** Lee el número de paso de la ruta; cualquier valor raro vuelve al paso 1. */
export function leerPaso(valor: string | string[] | undefined): Paso {
  const n = Number(Array.isArray(valor) ? valor[0] : valor);
  return Number.isInteger(n) && n >= 1 && n <= TOTAL_PASOS ? (n as Paso) : 1;
}
