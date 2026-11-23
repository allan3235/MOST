/**
 * @file textos.ts
 * @proyecto most.
 * @descripcion Ayudas para los textos de los hábitos que comparten la app y el backend.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación (antes en backend/src/ia/reglasMicroPasos.ts).
 */

// ===== Principal =====

/**
 * Si un paso dura distinto de lo que dice su título, el título pasa a decir los minutos reales.
 * Ejemplos: "Caminar 15 min" recortado a 10 → "Caminar 10 min"; "Caminar 5 min" en su versión
 * reducida de 2 → "Caminar 2 min".
 * @param titulo Título original.
 * @param original Minutos que menciona el título.
 * @param nuevo Minutos reales.
 * @returns El título con los minutos reales (igual si no menciona minutos).
 */
export function ajustarMinutosEnTitulo(titulo: string, original: number, nuevo: number): string {
  if (original === nuevo) {
    return titulo;
  }
  return titulo.replace(new RegExp(`\\b${original}(\\s*)min`), `${nuevo}$1min`);
}
