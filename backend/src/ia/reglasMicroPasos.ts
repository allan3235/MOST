/**
 * @file reglasMicroPasos.ts
 * @proyecto most.
 * @descripcion Reglas de MOST que la IA no puede romper. Se aplican a todo lo que propone la IA
 *   (y al catálogo): si un número se sale de los límites se corrige; si la estructura no sirve
 *   (menos de 3 pasos, sin días válidos) se rechaza y se usa el respaldo. Funciones puras.
 *   Reglas: primer paso de 5 min o menos (RF-03), de 3 a 5 pasos de menor a mayor esfuerzo, cada
 *   paso a lo mucho el triple del anterior, nunca más del tiempo diario por hábito (P4), y versión
 *   reducida de al menos 1 min (candado mínimo, RR-03).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import type { Area } from '@most/compartido/encuesta';

import type { HabitoIa, HabitoPropuesto, MicroPaso, PasoIa } from './esquemasIa.js';

// ===== Tipos =====

export type LimitesHabito = {
  /** Minutos máximos al día para este hábito (presupuesto / hábitos con duración). */
  minutosMaximos: number;
  categoria: Area;
  objetivo: string | null;
  pasoInicial: number;
  usaDuracionReducida: boolean;
};

// ===== Constantes =====

export const DURACION_MAXIMA_PRIMER_PASO = 5;
export const FACTOR_MAXIMO_ENTRE_PASOS = 3;
export const MICRO_PASOS_MINIMO = 3;
export const MICRO_PASOS_MAXIMO = 5;
/** Candado mínimo (RR-03): ningún ajuste baja de 1 minuto. */
export const META_MINIMA = 1;
const DIAS_VALIDOS = [1, 2, 3, 4, 5, 6, 7];
const LARGO_MAXIMO_TITULO = 80;
const LARGO_MAXIMO_DESCRIPCION = 200;

// ===== Funciones auxiliares =====

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(Math.round(valor), minimo), maximo);
}

function recortar(texto: string, largo: number): string {
  return texto.trim().slice(0, largo);
}

/** Días ISO válidos, sin repetir y en orden; lista vacía si no queda ninguno. */
export function limpiarDias(dias: readonly number[]): number[] {
  return [...new Set(dias)].filter((dia) => DIAS_VALIDOS.includes(dia)).sort((a, b) => a - b);
}

/**
 * Duración y versión reducida de un paso con duración, dentro de sus límites.
 * @param paso Paso propuesto.
 * @param minimo Duración mínima (la del paso anterior: el esfuerzo no baja).
 * @param maximo Duración máxima permitida para este paso.
 * @returns Duraciones corregidas.
 */
function corregirDuracion(
  paso: PasoIa,
  minimo: number,
  maximo: number,
): { duracion: number; reducida: number } {
  const duracion = acotar(paso.duracion_min, Math.min(minimo, maximo), maximo);
  // Si se recortó la duración, la reducida baja en la misma proporción (30/10 → 10/3).
  const proporcion = paso.duracion_min > 0 ? duracion / paso.duracion_min : 1;
  return {
    duracion,
    reducida: corregirReducida(paso.duracion_reducida_min * proporcion, duracion),
  };
}

/**
 * Versión reducida: siempre menor que la normal y nunca menos de 1 min (candado mínimo). Solo en
 * un paso de 1 minuto puede ser igual. Sin propuesta válida, la mitad.
 */
function corregirReducida(propuesta: number, duracion: number): number {
  const valor = propuesta > 0 ? propuesta : duracion / 2;
  return acotar(valor, META_MINIMA, Math.max(duracion - 1, META_MINIMA));
}

/**
 * Si se cambiaron los minutos de un paso, el título deja de decir los minutos viejos
 * ("Caminar 15 min" recortado a 10 → "Caminar 10 min").
 * @param titulo Título propuesto.
 * @param original Minutos propuestos.
 * @param nuevo Minutos después de aplicar las reglas.
 * @returns Título con los minutos reales.
 */
export function ajustarMinutosEnTitulo(titulo: string, original: number, nuevo: number): string {
  if (original === nuevo) {
    return titulo;
  }
  return titulo.replace(new RegExp(`\\b${original}(\\s*)min`), `${nuevo}$1min`);
}

// ===== Principal =====

/**
 * Aplica las reglas de MOST a un hábito propuesto.
 * @param habito Hábito que propuso la IA o que salió del catálogo.
 * @param limites Tiempo diario disponible y datos del plan.
 * @returns El hábito corregido, o null si no se puede usar.
 */
export function corregirHabito(habito: HabitoIa, limites: LimitesHabito): HabitoPropuesto | null {
  if (habito.micro_pasos.length < MICRO_PASOS_MINIMO || habito.titulo.trim() === '') {
    return null;
  }
  const pasos = habito.micro_pasos.slice(0, MICRO_PASOS_MAXIMO);
  const tieneDuracion = pasos[0].duracion_min > 0;
  const maximoHabito = Math.max(limites.minutosMaximos, META_MINIMA);

  const corregidos: MicroPaso[] = [];
  let anterior = 0;
  for (const [indice, paso] of pasos.entries()) {
    const dias = limpiarDias(paso.dias_semana);
    if (dias.length === 0 || paso.titulo.trim() === '') {
      return null;
    }
    let duracion = 0;
    let reducida = 0;
    if (tieneDuracion) {
      const maximo =
        indice === 0
          ? Math.min(DURACION_MAXIMA_PRIMER_PASO, maximoHabito)
          : Math.min(anterior * FACTOR_MAXIMO_ENTRE_PASOS, maximoHabito);
      ({ duracion, reducida } = corregirDuracion(paso, Math.max(anterior, META_MINIMA), maximo));
      anterior = duracion;
    }
    const titulo = tieneDuracion
      ? ajustarMinutosEnTitulo(paso.titulo, paso.duracion_min, duracion)
      : paso.titulo;
    corregidos.push({
      orden: indice + 1,
      titulo: recortar(titulo, LARGO_MAXIMO_TITULO),
      descripcion: recortar(paso.descripcion, LARGO_MAXIMO_DESCRIPCION),
      duracion_min: duracion,
      duracion_reducida_min: reducida,
      dias_semana: dias,
    });
  }

  return {
    objetivo: limites.objetivo,
    categoria: limites.categoria,
    titulo: recortar(habito.titulo, LARGO_MAXIMO_TITULO),
    descripcion: recortar(habito.descripcion, LARGO_MAXIMO_DESCRIPCION),
    paso_inicial: Math.min(limites.pasoInicial, corregidos.length),
    usa_duracion_reducida: tieneDuracion && limites.usaDuracionReducida,
    micro_pasos: corregidos,
  };
}

/**
 * Corrige un paso intermedio más ligero que el actual (meta intermedia, RF-15).
 * @param paso Paso que propuso el modelo pequeño.
 * @param actual Micro-paso en curso.
 * @returns Un paso más ligero que respeta el candado mínimo, o null si no sirve.
 */
export function corregirPasoLigero(
  paso: PasoIa,
  actual: MicroPaso,
): Omit<MicroPaso, 'orden'> | null {
  const dias = limpiarDias(paso.dias_semana);
  if (paso.titulo.trim() === '' || dias.length === 0) {
    return null;
  }
  if (actual.duracion_min === 0) {
    // Recordatorio: lo más ligero es hacerlo menos días, nunca menos de uno.
    const menosDias =
      dias.length < actual.dias_semana.length ? dias : actual.dias_semana.slice(0, 1);
    return {
      titulo: recortar(paso.titulo, LARGO_MAXIMO_TITULO),
      descripcion: recortar(paso.descripcion, LARGO_MAXIMO_DESCRIPCION),
      duracion_min: 0,
      duracion_reducida_min: 0,
      dias_semana: menosDias,
    };
  }
  const maximo = Math.max(actual.duracion_min - 1, META_MINIMA);
  const duracion = acotar(paso.duracion_min, META_MINIMA, maximo);
  return {
    titulo: recortar(
      ajustarMinutosEnTitulo(paso.titulo, paso.duracion_min, duracion),
      LARGO_MAXIMO_TITULO,
    ),
    descripcion: recortar(paso.descripcion, LARGO_MAXIMO_DESCRIPCION),
    duracion_min: duracion,
    duracion_reducida_min: corregirReducida(paso.duracion_reducida_min, duracion),
    dias_semana: dias,
  };
}

/**
 * Paso más ligero sin IA (si el modelo falla): la mitad del tiempo, con el candado mínimo.
 * @param actual Micro-paso en curso.
 * @returns Paso más ligero.
 */
export function crearPasoLigeroSinIa(actual: MicroPaso): Omit<MicroPaso, 'orden'> {
  const descripcion = 'Una versión más ligera para retomar el ritmo, sin presión.';
  if (actual.duracion_min === 0) {
    return {
      titulo: actual.titulo,
      descripcion,
      duracion_min: 0,
      duracion_reducida_min: 0,
      dias_semana: actual.dias_semana.slice(0, 1),
    };
  }
  const duracion = Math.max(Math.ceil(actual.duracion_min / 2), META_MINIMA);
  return {
    titulo: ajustarMinutosEnTitulo(actual.titulo, actual.duracion_min, duracion),
    descripcion,
    duracion_min: duracion,
    duracion_reducida_min: corregirReducida(0, duracion),
    dias_semana: actual.dias_semana,
  };
}
