/**
 * @file index.ts
 * @proyecto most.
 * @descripcion Puente JS del módulo nativo «No molestar» (RF-14, CP-15). Solo existe en la build
 *   de Android; en Expo Go y en iOS vale null y el modo enfoque solo guía a hacerlo a mano.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { requireOptionalNativeModule } from 'expo';

// ===== Tipos =====

export type ModuloNoMolestar = {
  tienePermiso: () => boolean;
  filtroActual: () => number;
  ponerFiltro: (filtro: number) => boolean;
  abrirAjustePermiso: () => void;
};

// ===== Principal =====

/** El módulo nativo, o null si este binario no lo trae (Expo Go, iOS). */
export const NoMolestar = requireOptionalNativeModule<ModuloNoMolestar>('NoMolestar');
