/**
 * @file repositorioProgreso.ts
 * @proyecto most.
 * @descripcion Capa de datos de Progreso: lee de SQLite los hábitos, horarios, registros, pausas y
 *   ajustes que usan las estadísticas. Solo lee; las reglas están en la capa de lógica.
 * @autor Equipo most. (código heredado de Habit Green; reorganizado por Allan con Claude Code)
 * @fecha 2026-11-24
 * @version 1.1.0
 * @historial 1.1.0 (2026-11-24): pasa a zonas/progreso/datos (antes db/stats-repository.ts).
 */

import type { Habito, Horario, Ocurrencia, Registro } from '@/zonas/habitos/logica/habitos-del-dia';
import type { DatosEstadisticas, Pausa } from '@/zonas/progreso/logica/cumplimiento';

import { getDb, leerFilas } from '@/comun/datos/database';
import { categoriasPorId } from '@/zonas/habitos/datos/repositorioHabitos';
import { leerAjustesEn } from '@/zonas/cuenta/datos/repositorioAjustes';

// Progreso (SDD 8): todo sale de SQLite, así que funciona sin conexión. Se leen también los
// hábitos archivados, porque su historial sigue contando en los periodos pasados. La carga
// inicial baja los registros de los últimos 365 días.

export type DatosProgreso = DatosEstadisticas & {
  /** Con `desanimo` solo se muestra la mejor racha. */
  desanimo: boolean;
};

export async function leerDatosEstadisticas(userId: string): Promise<DatosProgreso> {
  const db = await getDb();
  const [habitos, horarios, ocurrencias, registros, categorias, ajustes, pausas] =
    await Promise.all([
      leerFilas<Habito>(db, 'habits', '1 = 1 ORDER BY created_at'),
      leerFilas<Horario>(db, 'habit_schedules'),
      leerFilas<Ocurrencia>(db, 'habit_occurrences'),
      leerFilas<Registro>(db, 'habit_logs', 'eliminado_en IS NULL'),
      categoriasPorId(db),
      leerAjustesEn(db, userId),
      leerFilas<Pausa>(db, 'habit_pausas'),
    ]);
  return {
    habitos,
    horarios,
    ocurrencias,
    registros,
    categorias,
    pausas,
    desanimo: ajustes?.estrategias.includes('desanimo') ?? false,
  };
}
