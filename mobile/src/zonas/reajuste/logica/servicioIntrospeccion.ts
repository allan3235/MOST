/**
 * @file servicioIntrospeccion.ts
 * @proyecto most.
 * @descripcion Servicio de la introspección por valores (RF-04): cuándo toca la reflexión semanal
 *   y guardar las respuestas. Viven solo en la tabla local `introspecciones`: no entran a la cola
 *   de sincronización ni salen del teléfono (RR-04).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.1.0
 * @historial 1.0.0 (2026-11-23): creación.
 *   1.1.0 (2026-11-24): pasa a zonas/reajuste/logica; el SQL queda en repositorioIntrospeccion.
 */

import { fechaLocal } from '@/comun/util/dates';

import {
  insertarReflexion,
  leerPrimerHabitoCreado,
  leerUltimaReflexion,
} from '../datos/repositorioIntrospeccion';
import { tocaReflexion, type MotivoIntrospeccion, type Respuestas } from './introspeccion';

// ===== Principal =====

/**
 * Si hoy toca ofrecer la reflexión semanal: pasó una semana desde la última o desde que empezó a
 * usar la app (su primer hábito).
 * @param userId Usuario con sesión.
 * @returns true si toca.
 */
export async function leerTocaReflexion(userId: string): Promise<boolean> {
  const [ultima, primero] = await Promise.all([
    leerUltimaReflexion(userId),
    leerPrimerHabitoCreado(userId),
  ]);
  const primerUso = primero ? fechaLocal(new Date(primero)) : null;
  return tocaReflexion(ultima, primerUso, fechaLocal());
}

/**
 * Guarda una reflexión. Con respuestas null es «Ahora no»: cuenta como la de esta semana para no
 * volver a preguntar hasta dentro de 7 días.
 * @param userId Usuario con sesión.
 * @param motivo Semanal o después de pausar.
 * @param respuestas Respuestas 1–5 (o saltadas), o null si la pospuso.
 */
export async function guardarIntrospeccion(
  userId: string,
  motivo: MotivoIntrospeccion,
  respuestas: Respuestas | null,
): Promise<void> {
  await insertarReflexion({
    userId,
    fecha: fechaLocal(),
    motivo,
    respuestas: respuestas ? JSON.stringify(respuestas) : null,
  });
}
