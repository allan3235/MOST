/**
 * @file no-molestar.ts
 * @proyecto most.
 * @descripcion No Molestar automático del modo enfoque (RF-14, CP-15/16). Solo en Android, solo
 *   con el permiso especial «Acceso a No molestar» y solo si el binario trae el módulo nativo:
 *   guarda el filtro que tenía el teléfono, activa «solo prioridad» y al terminar o cancelar
 *   regresa exactamente al filtro anterior. En iOS, en Expo Go o sin permiso no toca nada (la
 *   pantalla guía a hacerlo a mano). Funciones puras con el módulo y el guardado inyectados.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

// ===== Tipos =====

/** Lo que se usa del módulo nativo (ver modules/no-molestar). */
export type ControlNoMolestar = {
  tienePermiso: () => boolean;
  filtroActual: () => number;
  ponerFiltro: (filtro: number) => boolean;
};

/** Dónde se guarda el filtro previo mientras dura la sesión (preferencias locales). */
export type GuardadoFiltro = {
  leer: () => Promise<number | null>;
  guardar: (filtro: number) => Promise<void>;
  borrar: () => Promise<void>;
};

/**
 * activado: el teléfono pasó a No Molestar.
 * sin_permiso: Android con el módulo, pero sin «Acceso a No molestar» (se guía a darlo).
 * no_disponible: iOS o binario sin el módulo (Expo Go): nunca se intenta.
 */
export type EstadoNoMolestar = 'activado' | 'sin_permiso' | 'no_disponible';

// ===== Constantes =====

/** NotificationManager.INTERRUPTION_FILTER_PRIORITY: solo llamadas y alarmas de prioridad. */
export const FILTRO_PRIORIDAD = 2;

// ===== Principal =====

/**
 * Qué puede hacer la app con No Molestar en este teléfono, sin cambiar nada.
 * @param control Módulo nativo, o null si no existe.
 * @param plataforma Platform.OS.
 * @returns El estado posible.
 */
export function estadoNoMolestar(
  control: ControlNoMolestar | null,
  plataforma: string,
): EstadoNoMolestar {
  if (plataforma !== 'android' || !control) {
    return 'no_disponible';
  }
  return control.tienePermiso() ? 'activado' : 'sin_permiso';
}

/**
 * Al empezar la sesión: guarda el filtro actual y activa No Molestar (si se puede).
 * @param control Módulo nativo, o null.
 * @param plataforma Platform.OS.
 * @param guardado Dónde guardar el filtro previo.
 * @returns Qué pasó.
 */
export async function activarNoMolestar(
  control: ControlNoMolestar | null,
  plataforma: string,
  guardado: GuardadoFiltro,
): Promise<EstadoNoMolestar> {
  const estado = estadoNoMolestar(control, plataforma);
  if (estado !== 'activado' || !control) {
    return estado;
  }
  // Si ya había una sesión (se reinició), se conserva el filtro de antes de la primera.
  if ((await guardado.leer()) === null) {
    await guardado.guardar(control.filtroActual());
  }
  return control.ponerFiltro(FILTRO_PRIORIDAD) ? 'activado' : 'sin_permiso';
}

/**
 * Al terminar, cancelar o vencer la sesión: regresa el filtro que tenía el teléfono.
 * @param control Módulo nativo, o null.
 * @param plataforma Platform.OS.
 * @param guardado Dónde quedó el filtro previo.
 * @returns true si restauró algo.
 */
export async function restaurarNoMolestar(
  control: ControlNoMolestar | null,
  plataforma: string,
  guardado: GuardadoFiltro,
): Promise<boolean> {
  const previo = await guardado.leer();
  if (previo === null) {
    return false;
  }
  await guardado.borrar();
  if (plataforma !== 'android' || !control) {
    return false;
  }
  return control.ponerFiltro(previo);
}
