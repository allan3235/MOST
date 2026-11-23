/**
 * @file session-context.ts
 * @proyecto most.
 * @descripcion Contexto de sesión: la sesión, el perfil y las acciones de cuenta.
 * @autor Equipo most. (heredado de Habit Green; adaptado por Allan con Claude Code)
 * @fecha 2026-11-23
 * @version 2.0.0
 * @historial 1.0.0: con Supabase y recuperación por correo. 2.0.0 (2026-11-23): backend de most.;
 *   sin enlaces de correo ni recuperación de contraseña (fuera del MVP).
 */

import { createContext, useContext } from 'react';

import type { AppMode, Profile } from '@/db/profile-repository';
import type { Sesion } from '@/lib/sesionGuardada';

// ===== Tipos =====

export type ProfileStatus = 'idle' | 'loading' | 'error' | 'ready';

export type SessionContextValue = {
  initializing: boolean;
  session: Sesion | null;
  profile: Profile | null;
  profileStatus: ProfileStatus;
  reloadProfile: () => void;
  chooseMode: (mode: AppMode) => Promise<void>;
  signOut: () => Promise<void>;
};

// ===== Principal =====

export const SessionContext = createContext<SessionContextValue | null>(null);

/** Sesión actual. Solo funciona dentro de <SessionProvider>. */
export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value === null) {
    throw new Error('useSession debe usarse dentro de <SessionProvider>');
  }
  return value;
}
