/**
 * @file noMolestar.ts
 * @proyecto most.
 * @descripcion Servicios del dispositivo del modo enfoque (RF-14): el módulo nativo de No Molestar
 *   (solo en la build de Android; null en Expo Go e iOS), la plataforma y las pantallas del sistema
 *   para darle el permiso o activarlo a mano. Es la única parte de la zona que toca el sistema.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación (antes estaba repartido en la pantalla y los avisos).
 */

import { Linking, Platform } from 'react-native';

import type { ControlNoMolestar } from '../logica/no-molestar';
import { NoMolestar } from '../../../../modules/no-molestar';

// ===== Constantes =====

/** Ajustes de No Molestar de Android (CP-16: guía manual). */
const INTENT_NO_MOLESTAR = 'android.settings.ZEN_MODE_SETTINGS';

/** Módulo nativo, o null si el binario no lo trae (Expo Go, iOS). */
export const controlNoMolestar: ControlNoMolestar | null = NoMolestar;

/** Plataforma del teléfono (`android`, `ios`). */
export const plataforma: string = Platform.OS;

// ===== Principal =====

/** Abre la pantalla del sistema donde se otorga «Acceso a No molestar» (si existe el módulo). */
export function abrirPermisoNoMolestar(): void {
  NoMolestar?.abrirAjustePermiso();
}

/** Abre los ajustes de No Molestar para activarlo a mano; si no se puede, los ajustes de la app. */
export async function abrirAjustesNoMolestar(): Promise<void> {
  try {
    await Linking.sendIntent(INTENT_NO_MOLESTAR);
  } catch {
    await Linking.openSettings();
  }
}
