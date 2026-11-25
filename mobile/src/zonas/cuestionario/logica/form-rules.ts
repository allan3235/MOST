import {
  areaDeObjetivo,
  disponibilidadIgual,
  MAX_AREAS_POR_PLAN,
  MAX_OBJETIVOS,
  MOMENTOS_CON_HORA,
  OBJETIVOS_POR_AREA,
  perfilSchema,
  respuestasSchema,
  type Area,
  type Disponibilidad,
  type MomentoConHora,
  type Objetivo,
  type Obstaculo,
  type Perfil,
  type Respuestas,
} from '@/comun/modelo/esquemas/onboarding';

// Reglas del formulario (SDD 5.3), separadas de las pantallas para poder probarlas. Las mismas
// preguntas arman tres recorridos:
// - «perfil»: la encuesta inicial (UC-01). Solo datos generales de la persona; no crea hábitos.
// - «plan»: un plan del catálogo (Perfil → Mis planes) con el perfil ya guardado: área y objetivos.
// - «perfil_y_plan»: un plan del catálogo sin perfil: las 7 preguntas.

/** Una pregunta del formulario. */
export type Campo =
  'areas' | 'objetivos' | 'historial' | 'tiempo' | 'momento' | 'obstaculo' | 'acompanamiento';

export type Flujo = 'perfil' | 'plan' | 'perfil_y_plan';

/** Número de paso en la ruta (1 = primera pregunta del recorrido). */
export type Paso = number;

const CAMPOS_PERFIL: readonly Campo[] = [
  'historial',
  'tiempo',
  'momento',
  'obstaculo',
  'acompanamiento',
];
const CAMPOS_PLAN: readonly Campo[] = ['areas', 'objetivos'];

/** Preguntas de cada recorrido, en orden. */
export const CAMPOS_POR_FLUJO: Record<Flujo, readonly Campo[]> = {
  perfil: CAMPOS_PERFIL,
  plan: CAMPOS_PLAN,
  perfil_y_plan: [...CAMPOS_PLAN, ...CAMPOS_PERFIL],
};

/** Las 7 preguntas: el recorrido más largo. */
export const TOTAL_PASOS = CAMPOS_POR_FLUJO.perfil_y_plan.length;

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

/** Cuántas preguntas tiene el recorrido. */
export function totalPasos(flujo: Flujo): number {
  return CAMPOS_POR_FLUJO[flujo].length;
}

/** La pregunta de un paso del recorrido (un paso fuera de rango se acota). */
export function campoDelPaso(flujo: Flujo, paso: Paso): Campo {
  const campos = CAMPOS_POR_FLUJO[flujo];
  return campos[Math.min(Math.max(paso, 1), campos.length) - 1] ?? 'historial';
}

/** Verdadero si la respuesta de la pregunta permite continuar. */
export function pasoCompleto(campo: Campo, b: Borrador): boolean {
  switch (campo) {
    case 'areas':
      return b.areas.length > 0;
    case 'objetivos':
      return b.objetivos.length > 0;
    case 'historial':
      return b.historial !== undefined;
    case 'tiempo':
      return b.tiempo !== undefined;
    case 'momento':
      return b.disponibilidad.some((momentos) => momentos.length > 0);
    case 'obstaculo':
      return b.obstaculos.length > 0;
    case 'acompanamiento':
      return b.acompanamiento !== undefined;
  }
}

/** El perfil de la encuesta inicial, o null si falta alguna respuesta. */
export function perfilCompleto(b: Borrador): Perfil | null {
  const resultado = perfilSchema.safeParse(b);
  return resultado.success ? resultado.data : null;
}

/** Convierte el borrador en respuestas válidas, o null si falta algo o no cumple las reglas. */
export function respuestasCompletas(b: Borrador): Respuestas | null {
  const resultado = respuestasSchema.safeParse(b);
  return resultado.success ? resultado.data : null;
}

/**
 * Lee el número de paso de la ruta; cualquier valor raro vuelve al paso 1.
 * @param valor Parámetro `paso` de la ruta.
 * @param total Preguntas del recorrido (por defecto, las 7).
 */
export function leerPaso(valor: string | string[] | undefined, total = TOTAL_PASOS): Paso {
  const n = Number(Array.isArray(valor) ? valor[0] : valor);
  return Number.isInteger(n) && n >= 1 && n <= total ? n : 1;
}
