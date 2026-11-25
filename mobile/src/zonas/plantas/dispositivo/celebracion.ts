/**
 * @file celebracion.ts
 * @proyecto most.
 * @descripcion Servicios del dispositivo para celebrar un hito (RF-16, RI-03): una vibración de
 *   éxito y un sonido corto. Antes vivían dentro del componente de la celebración; aquí la
 *   presentación no toca el audio ni la vibración del teléfono.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación.
 */

import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';

// ===== Constantes =====

// Metro necesita un require fijo por archivo.
const SONIDO_HITO = require('../../../../assets/sounds/hito.wav') as number;

/** Un solo reproductor para toda la app: se crea la primera vez que suena un hito. */
let reproductor: AudioPlayer | null = null;

// ===== Principal =====

/** Vibración corta de logro (si el teléfono no vibra, no pasa nada). */
export function vibrarLogro(): void {
  notificationAsync(NotificationFeedbackType.Success).catch(() => {});
}

/** Sonido corto del hito, desde el principio aunque ya hubiera sonado. */
export function reproducirSonidoHito(): void {
  reproductor ??= createAudioPlayer(SONIDO_HITO);
  const actual = reproductor;
  actual
    .seekTo(0)
    .then(() => actual.play())
    .catch(() => {});
}
