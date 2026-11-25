/**
 * @file agenda.ts
 * @proyecto most.
 * @descripcion Agenda de bloques ocupados (RF-02, CP-04). La persona registra sus horarios fijos
 *   (ej. «Clases, L-M-V 10:00–11:00»); un recordatorio no puede quedar encima de uno: se rechaza
 *   y se sugiere la primera hora libre (10:00–11:00 ocupado → 11:00). El hábito ocupa su duración
 *   desde la hora del recordatorio, así que tampoco puede empezar justo antes y meterse al bloque.
 *   Funciones puras sobre minutos del día.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.1.0
 * @historial 1.0.0 (2026-11-24): creación.
 *   1.1.0 (2026-11-23): `recordatoriosQueChocan` para revisar los avisos al guardar un bloque (D-04).
 */

// ===== Tipos =====

export type BloqueAgenda = {
  id: string;
  nombre: string;
  /** Días ISO: 1 = lunes … 7 = domingo. */
  dias_semana: number[];
  /** "HH:MM" o "HH:MM:SS". */
  hora_inicio: string;
  hora_fin: string;
};

export type ErrorBloque = 'sin_nombre' | 'sin_dias' | 'horas';

// ===== Constantes =====

const MINUTOS_POR_HORA = 60;
const MINUTOS_DEL_DIA = 24 * MINUTOS_POR_HORA;
const DIGITOS = 2;
/** Largo de "HH:MM" (la base guarda "HH:MM:SS"). */
const LARGO_HORA = 5;
export const LARGO_MAXIMO_NOMBRE = 60;

// ===== Funciones auxiliares =====

/** "HH:MM[:SS]" → minutos desde la medianoche. */
export function aMinutos(hora: string): number {
  const [hh = 0, mm = 0] = hora.split(':').map(Number);
  return hh * MINUTOS_POR_HORA + mm;
}

/** Minutos desde la medianoche → "HH:MM". */
export function aHora(minutos: number): string {
  const hh = Math.floor(minutos / MINUTOS_POR_HORA);
  const mm = minutos % MINUTOS_POR_HORA;
  return `${String(hh).padStart(DIGITOS, '0')}:${String(mm).padStart(DIGITOS, '0')}`;
}

function compartenDia(a: readonly number[], b: readonly number[]): boolean {
  return a.some((d) => b.includes(d));
}

/** [inicio, inicio + duración) se cruza con el bloque. Sin duración cuenta como 1 minuto. */
function seCruza(inicio: number, duracionMin: number, bloque: BloqueAgenda): boolean {
  const fin = inicio + Math.max(duracionMin, 1);
  return inicio < aMinutos(bloque.hora_fin) && fin > aMinutos(bloque.hora_inicio);
}

// ===== Principal =====

/**
 * Bloque con el que choca un recordatorio, o null si cae en tiempo libre.
 * @param bloques Agenda de la persona.
 * @param dias Días del hábito.
 * @param hora Hora del recordatorio "HH:MM".
 * @param duracionMin Minutos del hábito.
 * @returns El primer bloque que se cruza, o null.
 */
export function bloqueQueChoca(
  bloques: readonly BloqueAgenda[],
  dias: readonly number[],
  hora: string,
  duracionMin: number,
): BloqueAgenda | null {
  const inicio = aMinutos(hora);
  return (
    bloques.find((b) => compartenDia(b.dias_semana, dias) && seCruza(inicio, duracionMin, b)) ??
    null
  );
}

/**
 * Primera hora libre desde `hora` en adelante, saltando al final de cada bloque con el que choca
 * (CP-04: 10:30 con 10:00–11:00 ocupado → 11:00). Null si ya no cabe ese día.
 * @param bloques Agenda de la persona.
 * @param dias Días del hábito.
 * @param hora Hora elegida "HH:MM".
 * @param duracionMin Minutos del hábito.
 * @returns "HH:MM" libre, o null.
 */
export function primeraHoraLibre(
  bloques: readonly BloqueAgenda[],
  dias: readonly number[],
  hora: string,
  duracionMin: number,
): string | null {
  let inicio = aMinutos(hora);
  for (let vuelta = 0; vuelta <= bloques.length; vuelta++) {
    const choque = bloqueQueChoca(bloques, dias, aHora(inicio), duracionMin);
    if (!choque) {
      return inicio + Math.max(duracionMin, 1) <= MINUTOS_DEL_DIA ? aHora(inicio) : null;
    }
    inicio = aMinutos(choque.hora_fin);
  }
  return null;
}

/**
 * Revisa un bloque antes de guardarlo.
 * @param bloque Nombre, días y horas.
 * @returns El primer problema, o null si está bien.
 */
export function validarBloque(
  bloque: Pick<BloqueAgenda, 'nombre' | 'dias_semana' | 'hora_inicio' | 'hora_fin'>,
): ErrorBloque | null {
  if (bloque.nombre.trim().length === 0) {
    return 'sin_nombre';
  }
  if (bloque.dias_semana.length === 0) {
    return 'sin_dias';
  }
  if (aMinutos(bloque.hora_fin) <= aMinutos(bloque.hora_inicio)) {
    return 'horas';
  }
  return null;
}

/** Recordatorio fijo de un hábito, lo mínimo para revisarlo contra la agenda. */
export type RecordatorioHabito = {
  habitId: string;
  titulo: string;
  dias: readonly number[];
  /** "HH:MM" o "HH:MM:SS". */
  hora: string;
  duracionMin: number;
};

/** Un recordatorio que quedó dentro de un bloque ocupado, con la hora libre sugerida. */
export type ChoqueRecordatorio = {
  recordatorio: RecordatorioHabito;
  bloque: BloqueAgenda;
  /** Primera hora libre, o null si ya no cabe ese día. */
  sugerida: string | null;
};

/**
 * Recordatorios que ya existían y ahora caen en un bloque ocupado (D-04: al agregar o editar un
 * bloque se revisan, para que ninguno quede encima de la agenda).
 * @param bloques Agenda de la persona, ya con el bloque nuevo.
 * @param recordatorios Recordatorios fijos de sus hábitos.
 * @returns Los que chocan, con su sugerencia.
 */
export function recordatoriosQueChocan(
  bloques: readonly BloqueAgenda[],
  recordatorios: readonly RecordatorioHabito[],
): ChoqueRecordatorio[] {
  return recordatorios.flatMap((recordatorio) => {
    const hora = recordatorio.hora.slice(0, LARGO_HORA);
    const bloque = bloqueQueChoca(bloques, recordatorio.dias, hora, recordatorio.duracionMin);
    if (!bloque) {
      return [];
    }
    const sugerida = primeraHoraLibre(bloques, recordatorio.dias, hora, recordatorio.duracionMin);
    return [{ recordatorio, bloque, sugerida }];
  });
}

// ===== Vista por día =====

/** Desde y hasta qué hora se muestra el día en «Mi agenda» (el tiempo libre se cuenta ahí). */
export const HORA_INICIO_DIA = '06:00';
export const HORA_FIN_DIA = '23:00';
/** Un rato libre más corto que esto no se muestra (no alcanza para un hábito). */
const MINUTOS_MINIMOS_LIBRE = 15;
/** Días ISO de la semana: 1 = lunes … 7 = domingo. */
const DIAS_SEMANA = 7;

/** Una franja del día: un bloque ocupado o un rato libre entre bloques. */
export type Franja =
  | { tipo: 'ocupado'; bloque: BloqueAgenda; inicio: string; fin: string }
  | { tipo: 'libre'; inicio: string; fin: string };

/** Datos de un bloque sin su id. */
export type DatosDeBloque = Pick<
  BloqueAgenda,
  'nombre' | 'dias_semana' | 'hora_inicio' | 'hora_fin'
>;

/** Cómo guardar un cambio que solo aplica a un día de un bloque que se repite. */
export type CambioUnDia =
  | { tipo: 'editar'; datos: DatosDeBloque }
  | { tipo: 'separar'; diasRestantes: number[]; nuevo: DatosDeBloque };

/**
 * Día ISO de una fecha (1 = lunes … 7 = domingo).
 * @param fecha Fecha.
 * @returns El día.
 */
export function diaIso(fecha: Date): number {
  return ((fecha.getDay() + DIAS_SEMANA - 1) % DIAS_SEMANA) + 1;
}

/**
 * Bloques de un día, ordenados por hora de inicio (y de fin).
 * @param bloques Agenda.
 * @param dia Día ISO.
 * @returns Los bloques de ese día.
 */
export function bloquesDelDia(bloques: readonly BloqueAgenda[], dia: number): BloqueAgenda[] {
  return bloques
    .filter((b) => b.dias_semana.includes(dia))
    .sort(
      (a, b) =>
        aMinutos(a.hora_inicio) - aMinutos(b.hora_inicio) ||
        aMinutos(a.hora_fin) - aMinutos(b.hora_fin),
    );
}

/**
 * El día en orden: bloques ocupados y, entre ellos, los ratos libres (de 06:00 a 23:00). Así se ve
 * de un vistazo qué está ocupado y qué no, sin revisar bloque por bloque.
 * @param bloques Agenda.
 * @param dia Día ISO.
 * @returns Las franjas en orden.
 */
export function franjasDelDia(bloques: readonly BloqueAgenda[], dia: number): Franja[] {
  const franjas: Franja[] = [];
  const finDia = aMinutos(HORA_FIN_DIA);
  let cursor = aMinutos(HORA_INICIO_DIA);
  const agregarLibre = (hasta: number) => {
    const fin = Math.min(hasta, finDia);
    if (fin - cursor >= MINUTOS_MINIMOS_LIBRE) {
      franjas.push({ tipo: 'libre', inicio: aHora(cursor), fin: aHora(fin) });
    }
  };
  for (const bloque of bloquesDelDia(bloques, dia)) {
    agregarLibre(aMinutos(bloque.hora_inicio));
    franjas.push({
      tipo: 'ocupado',
      bloque,
      inicio: bloque.hora_inicio.slice(0, LARGO_HORA),
      fin: bloque.hora_fin.slice(0, LARGO_HORA),
    });
    cursor = Math.max(cursor, aMinutos(bloque.hora_fin));
  }
  agregarLibre(finDia);
  return franjas;
}

/**
 * Cambiar un bloque solo en un día: si el bloque únicamente ocurre ese día, se edita; si se repite,
 * ese día se separa en un bloque propio y los demás días quedan como estaban.
 * @param bloque Bloque original.
 * @param dia Día ISO que se cambia.
 * @param datos Nombre y horas nuevos (los días se ignoran: queda solo `dia`).
 * @returns Qué guardar.
 */
export function cambioSoloUnDia(
  bloque: BloqueAgenda,
  dia: number,
  datos: DatosDeBloque,
): CambioUnDia {
  const nuevo = { ...datos, dias_semana: [dia] };
  const diasRestantes = bloque.dias_semana.filter((d) => d !== dia);
  return diasRestantes.length === 0
    ? { tipo: 'editar', datos: nuevo }
    : { tipo: 'separar', diasRestantes, nuevo };
}
