/**
 * @file cambios-locales.ts
 * @proyecto most.
 * @descripcion Fachada de la capa de lógica para que la presentación se entere de que cambiaron
 *   los datos locales (una escritura o una sincronización) y vuelva a consultar. El contador vive
 *   en la capa de datos; la presentación no la usa directo (arquitectura en capas del SRS).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación.
 */

export { avisarCambioLocal, useDbVersion } from '@/comun/datos/db-version-store';
