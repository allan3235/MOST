import {
  estaVisible,
  horarioVigente,
  type Habito,
  type Horario,
} from '@/features/habits/domain/habitos-del-dia';
import { alcanzoLimiteHabitos, limiteHabitos } from '@/features/habits/domain/limite-habitos';
import { minutosPorDia, type CargaHabito } from '@/features/habits/domain/presupuesto';
import {
  elegirFilaCatalogo,
  habitoParaNivel,
  type ConfigPlan,
  type FilaCatalogo,
} from '@/features/plan/domain/plan-engine';
import {
  contar,
  type Conteo,
  type OcurrenciaEstadistica,
} from '@/zonas/progreso/logica/cumplimiento';
import { ajustarMinutosEnTitulo } from '@most/compartido/textos';

import { diasEntre, sumarDias } from '@/comun/logica/dates';
import {
  areaDeObjetivo,
  OBJETIVOS,
  tieneObstaculo,
  type Objetivo,
  type Respuestas,
} from '@/comun/modelo/esquemas/onboarding';
import type { HabitoPlan, Nivel } from '@/schemas/plan';

// Progresión (SDD 6.3). Funciones puras: reciben lo que ya está en SQLite y deciden qué proponer.
// Solo entran los hábitos del plan (`objetivo` y `nivel`); los manuales nunca suben ni bajan.
//
// most. (Fase 3):
// - RF-15: con menos de 40 % de cumplimiento en los últimos 7 días se propone una meta intermedia
//   (el paso anterior de la secuencia, o la versión reducida), aplicable en un toque. Ya no baja
//   sola: la persona decide. Subir sigue con 85 % en 14 días.
// - Con micro-pasos (RF-03), subir y bajar se mueven por esa secuencia; sin ella, por los niveles
//   del catálogo (hábitos de antes de most.).
// - RR-03 candado mínimo: ningún reajuste deja un hábito con duración en menos de 1 minuto ni en
//   menos de 1 día por semana.
//
// Decisiones del usuario (Entrega 8):
// - El cumplimiento se mide desde el último cambio de nivel (`nivel_desde`), como mucho en la
//   ventana normal (14 días, o 28 si el hábito es de 1 o 2 días por semana), hasta ayer.
// - Bajar es automático (con «Mantenerlo como estaba»); subir y el hábito nuevo se proponen.
// - El hábito nuevo es uno solo: el primer objetivo que aún no tienes, primero de tus áreas.
// Detalles: como mucho una propuesta de hábito nuevo (o «sin espacio») por revisión; con el límite
// de hábitos del plan alcanzado no se propone ninguno; quien está en su versión corta primero
// vuelve a la duración normal (salvo con `poco_tiempo`, donde la corta es la normal).

export {
  DIAS_EVALUADOS,
  PROGRESION_POR_DEFECTO,
  UMBRAL_CUMPLIMIENTO,
  type ConfigProgresion,
} from '@/comun/modelo/configuracion';
import type { ConfigProgresion } from '@/comun/modelo/configuracion';
/**
 * RR-03 candado mínimo (decisión del 24-nov): ningún reajuste deja un hábito en menos de 1 día por
 * semana ni, si tiene duración, en menos de 2 minutos.
 */
export const DIAS_MINIMOS_POR_SEMANA = 1;
/** Día que queda si un reajuste dejara un hábito sin días (lunes). */
const DIA_POR_DEFECTO = 1;
export const MINUTOS_MINIMOS = 2;

/** Los valores de `app_config.progresion`, por si todavía no se descargan. */

/** Un micro-paso guardado en SQLite (tabla micro_pasos). */
export type MicroPasoLocal = {
  habit_id: string;
  orden: number;
  titulo: string;
  descripcion: string | null;
  duracion_min: number;
  duracion_reducida_min: number;
  dias_semana: number[];
};

/** Lo que cambia de un hábito al moverse de paso o de nivel. */
export type ValoresNivel = {
  nivel: Nivel;
  /** Micro-paso al que se mueve; null si el hábito no tiene secuencia (niveles del catálogo). */
  paso_actual: number | null;
  titulo: string;
  descripcion: string | null;
  duracion_min: number;
  usa_duracion_reducida: boolean;
  dias_semana: number[];
  nivel_desde: string | null;
};

export type Tarjeta =
  | {
      id: string;
      tipo: 'subir';
      habitId: string;
      objetivo: Objetivo;
      antes: ValoresNivel;
      despues: ValoresNivel;
    }
  | {
      id: string;
      tipo: 'bajar';
      habitId: string;
      objetivo: Objetivo;
      antes: ValoresNivel;
      despues: ValoresNivel;
    }
  | { id: string; tipo: 'apoyo'; habitId: string; titulo: string }
  | {
      /**
       * La secuencia ya no tiene un paso más ligero, pero todavía cabe uno sin pasar del candado
       * mínimo: se ofrece pedírselo a la IA (modelo pequeño, /ia/paso-ligero).
       */
      id: string;
      tipo: 'ligero_ia';
      habitId: string;
      titulo: string;
      antes: ValoresNivel;
    }
  | { id: string; tipo: 'nuevo'; habito: HabitoPlan }
  | { id: string; tipo: 'sin_espacio' };

export type EntradaProgresion = {
  hoy: string;
  /** Todos los hábitos (también manuales y archivados). */
  habitos: readonly Habito[];
  horarios: readonly Horario[];
  /** Ocurrencias de `historial` (reglas de 6.2). */
  ocurrencias: readonly OcurrenciaEstadistica[];
  /** Micro-pasos de los hábitos (RF-03). Sin ellos se usan los niveles del catálogo. */
  microPasos?: readonly MicroPasoLocal[];
  catalogo: readonly FilaCatalogo[];
  respuestas: Respuestas;
  /** Para la hora del hábito nuevo (`habitoParaNivel`). */
  configPlan: ConfigPlan;
  presupuestoMin: number;
  limiteDesbloqueado: boolean;
  /** Subidas de nivel aceptadas: cada una da 1 lugar más en el límite total de hábitos. */
  subidasPlan: number;
  /**
   * Plan que se revisa (varios planes por usuario, uno por área): solo se evalúan sus hábitos y el
   * hábito nuevo se busca solo en su área. Sin él se revisan todos los hábitos del plan juntos.
   */
  planId?: string;
  config: ConfigProgresion;
};

const NIVELES: readonly Nivel[] = [1, 2, 3];
const esNivel = (n: unknown): n is Nivel => NIVELES.includes(n as Nivel);
const esObjetivo = (o: unknown): o is Objetivo => (OBJETIVOS as readonly unknown[]).includes(o);

/** Hábito del plan con nivel válido. */
export function esDelPlan(h: Habito): h is Habito & { objetivo: Objetivo; nivel: Nivel } {
  return esObjetivo(h.objetivo) && esNivel(h.nivel);
}

/**
 * Límite total de hábitos activos (del plan y propios) del usuario guiado: si ya llegó, la
 * progresión no propone hábitos nuevos (decisión del usuario, pulidos antes del APK).
 */
export function llegoAlLimiteTotal(
  entrada: Pick<EntradaProgresion, 'habitos' | 'subidasPlan' | 'limiteDesbloqueado'>,
): boolean {
  const activos = entrada.habitos.filter((h) => h.activo && h.archivado_en === null).length;
  const limite = limiteHabitos({
    modo: 'guiado',
    subidas: entrada.subidasPlan,
    desbloqueado: entrada.limiteDesbloqueado,
  });
  return alcanzoLimiteHabitos(activos, limite);
}

/** Pasaron los días entre revisiones desde la última (o desde que empezó el plan). */
export function tocaEvaluar(
  hoy: string,
  ultimaEvaluacion: string | null,
  inicioPlan: string | null,
  config: ConfigProgresion,
): boolean {
  const desde = ultimaEvaluacion ?? inicioPlan;
  return desde !== null && diasEntre(desde, hoy) >= config.dias_entre_evaluaciones;
}

/**
 * Hechos y programados de un hábito en su ventana: desde el cambio de nivel, como mucho los
 * últimos 14 días para subir o 7 para bajar (28 con 1 o 2 días por semana), hasta ayer. Null si
 * hay muy pocas ocurrencias.
 */
export function cumplimientoDe(
  habito: Pick<Habito, 'id' | 'nivel_desde'>,
  diasPorSemana: number,
  ocurrencias: readonly OcurrenciaEstadistica[],
  hoy: string,
  config: ConfigProgresion,
  para: 'subir' | 'bajar' = 'subir',
): Conteo | null {
  const ventanaNormal = para === 'bajar' ? config.ventana_dias_bajar : config.ventana_dias;
  const dias =
    diasPorSemana <= config.dias_por_semana_baja_frecuencia
      ? config.ventana_dias_baja_frecuencia
      : ventanaNormal;
  const inicioVentana = sumarDias(hoy, -dias);
  const desde =
    habito.nivel_desde && habito.nivel_desde > inicioVentana ? habito.nivel_desde : inicioVentana;
  const hasta = sumarDias(hoy, -1);
  const conteo = contar(
    ocurrencias.filter((o) => o.habitId === habito.id && o.fecha >= desde && o.fecha <= hasta),
  );
  return conteo.total < config.minimo_ocurrencias ? null : conteo;
}

/** Valores de un nivel del catálogo, con o sin la versión corta. */
export function valoresDeNivel(
  catalogo: readonly FilaCatalogo[],
  respuestas: Respuestas,
  objetivo: Objetivo,
  nivel: Nivel,
  reducida: boolean,
  nivelDesde: string | null,
): ValoresNivel {
  const fila = elegirFilaCatalogo(
    catalogo,
    objetivo,
    nivel,
    tieneObstaculo(respuestas, 'recursos'),
  );
  const duracion = reducida ? fila.duracion_reducida_min : fila.duracion_min;
  return aplicarCandado({
    nivel,
    paso_actual: null,
    titulo: ajustarMinutosEnTitulo(fila.titulo, fila.duracion_min, duracion),
    descripcion: fila.descripcion,
    duracion_min: duracion,
    usa_duracion_reducida: reducida,
    dias_semana: [...fila.dias_semana],
    nivel_desde: nivelDesde,
  });
}

/**
 * Candado mínimo (RR-03): un hábito con duración nunca queda en menos de MINUTOS_MINIMOS minutos,
 * y nunca en menos de DIAS_MINIMOS_POR_SEMANA días por semana.
 * @param valores Valores propuestos.
 * @returns Los mismos valores, con el piso aplicado.
 */
export function aplicarCandado(valores: ValoresNivel): ValoresNivel {
  const dias =
    valores.dias_semana.length >= DIAS_MINIMOS_POR_SEMANA ? valores.dias_semana : [DIA_POR_DEFECTO];
  const duracion =
    valores.duracion_min > 0
      ? Math.max(valores.duracion_min, MINUTOS_MINIMOS)
      : valores.duracion_min;
  return { ...valores, dias_semana: dias, duracion_min: duracion };
}

/** Micro-pasos de un hábito, en orden. */
export function pasosDe(
  microPasos: readonly MicroPasoLocal[] | undefined,
  habitId: string,
): MicroPasoLocal[] {
  return (microPasos ?? [])
    .filter((paso) => paso.habit_id === habitId)
    .sort((a, b) => a.orden - b.orden);
}

/** Valores de un micro-paso, con o sin la versión reducida. El nivel del plan no cambia. */
export function valoresDePaso(
  paso: MicroPasoLocal,
  nivel: Nivel,
  reducida: boolean,
  nivelDesde: string | null,
): ValoresNivel {
  const usarReducida = reducida && paso.duracion_min > 0;
  const duracion = usarReducida ? paso.duracion_reducida_min : paso.duracion_min;
  return aplicarCandado({
    nivel,
    paso_actual: paso.orden,
    titulo: ajustarMinutosEnTitulo(paso.titulo, paso.duracion_min, duracion),
    descripcion: paso.descripcion,
    duracion_min: duracion,
    usa_duracion_reducida: usarReducida,
    dias_semana: [...paso.dias_semana],
    nivel_desde: nivelDesde,
  });
}

function valoresActuales(habito: Habito & { nivel: Nivel }, horario: Horario): ValoresNivel {
  return {
    nivel: habito.nivel,
    paso_actual: habito.paso_actual ?? null,
    titulo: habito.titulo,
    descripcion: habito.descripcion,
    duracion_min: habito.duracion_min,
    usa_duracion_reducida: habito.usa_duracion_reducida ?? false,
    dias_semana: [...horario.dias_semana],
    nivel_desde: habito.nivel_desde ?? null,
  };
}

/** Cabe en el presupuesto: ningún día pasa de `presupuesto_min` con esta carga. */
export function cabe(otros: readonly CargaHabito[], carga: CargaHabito, presupuesto: number) {
  return Math.max(0, ...minutosPorDia([...otros, carga])) <= presupuesto;
}

/**
 * El hábito nuevo que se propone: el nivel 1 del primer objetivo que el usuario no tiene en el
 * plan (sin contar los archivados), primero de sus áreas, que quepa en el presupuesto.
 */
export function sugerenciaNueva(
  entrada: Pick<EntradaProgresion, 'catalogo' | 'respuestas' | 'configPlan' | 'planId'>,
  ocupados: ReadonlySet<string>,
  entraEnPresupuesto: (h: HabitoPlan) => boolean,
): HabitoPlan | null {
  const { catalogo, respuestas, configPlan } = entrada;
  const objetivos = [...new Set(catalogo.map((f) => f.objetivo))].filter((o) => !ocupados.has(o));
  const deSusAreas = (o: Objetivo) => respuestas.areas.includes(areaDeObjetivo(o));
  // Con un plan por área, otra área es otro plan: solo se sugiere de la misma área.
  const ordenados = entrada.planId
    ? objetivos.filter(deSusAreas)
    : [...objetivos.filter(deSusAreas), ...objetivos.filter((o) => !deSusAreas(o))];
  for (const objetivo of ordenados) {
    try {
      const habito = habitoParaNivel(respuestas, catalogo, configPlan, objetivo, 1);
      if (entraEnPresupuesto(habito)) return habito;
    } catch {
      // Objetivo sin fila de nivel 1: se salta.
    }
  }
  return null;
}

/**
 * Siguiente paso hacia arriba: de la versión corta a la normal, o el siguiente micro-paso (o nivel
 * del catálogo si el hábito no tiene secuencia).
 */
function siguiente(
  habito: Habito & { objetivo: Objetivo; nivel: Nivel },
  entrada: EntradaProgresion,
): ValoresNivel | null {
  const pocoTiempo = tieneObstaculo(entrada.respuestas, 'poco_tiempo');
  const { catalogo, respuestas, hoy } = entrada;
  const pasos = pasosDe(entrada.microPasos, habito.id);
  if (pasos.length > 0) {
    const actual = pasos.find((p) => p.orden === (habito.paso_actual ?? 1)) ?? pasos[0];
    if (habito.usa_duracion_reducida && !pocoTiempo) {
      return valoresDePaso(actual, habito.nivel, false, hoy);
    }
    const proximo = pasos.find((p) => p.orden > actual.orden);
    return proximo ? valoresDePaso(proximo, habito.nivel, pocoTiempo, hoy) : null;
  }
  if (habito.usa_duracion_reducida && !pocoTiempo) {
    return valoresDeNivel(catalogo, respuestas, habito.objetivo, habito.nivel, false, hoy);
  }
  if (habito.nivel >= 3) return null;
  const nivel = (habito.nivel + 1) as Nivel;
  return valoresDeNivel(catalogo, respuestas, habito.objetivo, nivel, pocoTiempo, hoy);
}

/**
 * Paso hacia abajo (meta intermedia, RF-15): el micro-paso anterior (o nivel anterior) o, en el
 * primero, la versión corta. Null si ya no hay: el paso se hace más pequeño, nunca desaparece, y
 * nunca baja del candado mínimo. Lo usan la revisión y «Hacerlo más ligero» del detalle del plan.
 */
export function pasoHaciaAbajo(
  habito: Habito & { objetivo: Objetivo; nivel: Nivel },
  entrada: EntradaProgresion,
): ValoresNivel | null {
  const pocoTiempo = tieneObstaculo(entrada.respuestas, 'poco_tiempo');
  const { catalogo, respuestas, hoy } = entrada;
  const pasos = pasosDe(entrada.microPasos, habito.id);
  if (pasos.length > 0) {
    const actual = pasos.find((p) => p.orden === (habito.paso_actual ?? 1)) ?? pasos[0];
    const anterior = [...pasos].reverse().find((p) => p.orden < actual.orden);
    if (anterior) return valoresDePaso(anterior, habito.nivel, pocoTiempo, hoy);
    const tieneVersionCorta =
      actual.duracion_min > 0 &&
      actual.duracion_reducida_min < actual.duracion_min &&
      actual.duracion_reducida_min >= MINUTOS_MINIMOS;
    if (habito.usa_duracion_reducida || !tieneVersionCorta) return null;
    return valoresDePaso(actual, habito.nivel, true, hoy);
  }
  if (habito.nivel > 1) {
    const nivel = (habito.nivel - 1) as Nivel;
    return valoresDeNivel(catalogo, respuestas, habito.objetivo, nivel, pocoTiempo, hoy);
  }
  // Sin duración no hay versión corta: en el nivel 1 solo queda el apoyo.
  if (habito.usa_duracion_reducida || habito.duracion_min === 0) return null;
  return valoresDeNivel(catalogo, respuestas, habito.objetivo, 1, true, hoy);
}

/**
 * Todavía cabe una versión más ligera sin pasar del candado mínimo (RR-03): más de 2 minutos o, si
 * no tiene duración, más de 1 día por semana.
 * @param duracion Minutos actuales.
 * @param diasPorSemana Días actuales.
 * @returns true si se puede aligerar.
 */
export function puedeAligerarse(duracion: number, diasPorSemana: number): boolean {
  return duracion > MINUTOS_MINIMOS || (duracion === 0 && diasPorSemana > DIAS_MINIMOS_POR_SEMANA);
}

/** Las tarjetas de una revisión, en el orden de los hábitos. */
export function decidir(entrada: EntradaProgresion): Tarjeta[] {
  const { hoy, habitos, horarios, ocurrencias, config, presupuestoMin } = entrada;
  const conHorario = habitos.flatMap((habito) => {
    const horario = horarioVigente(
      horarios.filter((h) => h.habit_id === habito.id),
      hoy,
    );
    return horario && estaVisible(habito) ? [{ habito, horario }] : [];
  });
  const carga = (duracion: number, dias: readonly number[]): CargaHabito => ({
    duracion_min: duracion,
    dias_semana: dias,
  });
  const cargasSin = (id: string | null) =>
    conHorario
      .filter((c) => c.habito.id !== id)
      .map((c) => carga(c.habito.duracion_min ?? 0, c.horario.dias_semana));

  const delPlan = conHorario.filter(
    (c): c is { habito: Habito & { objetivo: Objetivo; nivel: Nivel }; horario: Horario } =>
      esDelPlan(c.habito) && (entrada.planId === undefined || c.habito.plan_id === entrada.planId),
  );

  const tarjetas: Tarjeta[] = [];
  let quiereNuevo = false;

  for (const { habito, horario } of delPlan) {
    const diasPorSemana = horario.dias_semana.length;
    // Primero se mira la semana (RF-15): si costó, se propone una meta intermedia.
    const semana = cumplimientoDe(habito, diasPorSemana, ocurrencias, hoy, config, 'bajar');
    const costo = semana !== null && semana.hechos / semana.total < config.umbral_bajar;
    const conteo = costo ? null : cumplimientoDe(habito, diasPorSemana, ocurrencias, hoy, config);
    const proporcion = conteo === null ? null : conteo.hechos / conteo.total;

    if (proporcion !== null && proporcion >= config.umbral_subir) {
      const despues = siguiente(habito, entrada);
      if (
        despues &&
        cabe(cargasSin(habito.id), carga(despues.duracion_min, despues.dias_semana), presupuestoMin)
      ) {
        tarjetas.push({
          id: `subir-${habito.id}`,
          tipo: 'subir',
          habitId: habito.id,
          objetivo: habito.objetivo,
          antes: valoresActuales(habito, horario),
          despues,
        });
      } else {
        quiereNuevo = true;
      }
    } else if (costo) {
      const despues = pasoHaciaAbajo(habito, entrada);
      tarjetas.push(
        despues
          ? {
              id: `bajar-${habito.id}`,
              tipo: 'bajar',
              habitId: habito.id,
              objetivo: habito.objetivo,
              antes: valoresActuales(habito, horario),
              despues,
            }
          : pasosDe(entrada.microPasos, habito.id).length > 0 &&
              puedeAligerarse(habito.duracion_min, horario.dias_semana.length)
            ? {
                id: `ligero_ia-${habito.id}`,
                tipo: 'ligero_ia',
                habitId: habito.id,
                titulo: habito.titulo,
                antes: valoresActuales(habito, horario),
              }
            : {
                id: `apoyo-${habito.id}`,
                tipo: 'apoyo',
                habitId: habito.id,
                titulo: habito.titulo,
              },
      );
    }
  }

  if (quiereNuevo) {
    const activosDelPlan = delPlan.length;
    const hayLugar =
      (entrada.limiteDesbloqueado || activosDelPlan < config.limite_habitos_plan) &&
      !llegoAlLimiteTotal(entrada);
    if (hayLugar) {
      // No se repite un objetivo que ya está en el plan (aunque esté en pausa).
      const ocupados = new Set(
        habitos
          .filter((h) => esDelPlan(h) && h.archivado_en === null)
          .map((h) => String(h.objetivo)),
      );
      const otros = cargasSin(null);
      const nuevo = sugerenciaNueva(entrada, ocupados, (h) =>
        cabe(otros, carga(h.duracion_min, h.dias_semana), presupuestoMin),
      );
      tarjetas.push(
        nuevo
          ? { id: `nuevo-${nuevo.objetivo}`, tipo: 'nuevo', habito: nuevo }
          : { id: 'sin_espacio', tipo: 'sin_espacio' },
      );
    }
  }
  return tarjetas;
}

/**
 * Desbloqueo del límite de hábitos del plan: a los 90 días del plan, con 85 % o más de
 * cumplimiento de los hábitos del plan en los últimos 28 días.
 */
export function tocaDesbloquear(
  hoy: string,
  inicioPlan: string | null,
  yaDesbloqueado: boolean,
  habitos: readonly Habito[],
  ocurrencias: readonly OcurrenciaEstadistica[],
  config: ConfigProgresion,
): boolean {
  if (yaDesbloqueado || inicioPlan === null) return false;
  if (diasEntre(inicioPlan, hoy) < config.dias_para_desbloqueo) return false;
  const delPlan = new Set(habitos.filter(esDelPlan).map((h) => h.id));
  const desde = sumarDias(hoy, -config.ventana_desbloqueo_dias);
  const hasta = sumarDias(hoy, -1);
  const conteo = contar(
    ocurrencias.filter((o) => delPlan.has(o.habitId) && o.fecha >= desde && o.fecha <= hasta),
  );
  return conteo.total > 0 && conteo.hechos / conteo.total >= config.umbral_subir;
}
