/**
 * @file servicioProgreso.ts
 * @proyecto most.
 * @descripcion Servicio de la zona Progreso (UC-12): la puerta de la presentación a los datos de
 *   las estadísticas (cumplimiento, rachas, pausas). Las reglas viven en esta misma capa
 *   (cumplimiento, periodos, rachas); los datos, en repositorioProgreso.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación.
 */

import { leerDatosEstadisticas, type DatosProgreso } from '../datos/repositorioProgreso';

// ===== Principal =====

/**
 * Datos para las estadísticas de la persona (leídos de SQLite: funciona sin conexión).
 * @param userId Usuario con sesión.
 * @returns Hábitos, registros, pausas y ajustes que usan las reglas de Progreso.
 */
export function leerProgreso(userId: string): Promise<DatosProgreso> {
  return leerDatosEstadisticas(userId);
}
