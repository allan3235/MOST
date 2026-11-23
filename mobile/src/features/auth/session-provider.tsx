/**
 * @file session-provider.tsx
 * @proyecto most.
 * @descripcion Proveedor de sesión: lee la sesión guardada al abrir la app, escucha cuando cambia
 *   (entrar, salir o caducar) y carga el perfil del usuario.
 * @autor Equipo most. (heredado de Habit Green; adaptado por Allan con Claude Code)
 * @fecha 2026-11-23
 * @version 2.0.0
 * @historial 1.0.0: con Supabase Auth y enlaces de correo. 2.0.0 (2026-11-23): sesión del backend
 *   de most. (token guardado en SecureStore).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { asegurarDuenoBaseLocal, vaciarBaseLocal } from '@/db/database';
import { getProfile, saveMode, type AppMode, type Profile } from '@/db/profile-repository';
import { cancelarAvisos } from '@/features/reminders/avisos';
import {
  cargarSesionGuardada,
  escucharSesion,
  establecerSesion,
  type Sesion,
} from '@/lib/sesionGuardada';
import { deviceTimeZone } from '@/lib/time-zone';
import { sincronizarAhora } from '@/sync/sync-engine';

import { caducoSinConexion } from './domain/sesion-caducada';
import { leerUltimaConexion, marcarConexion, marcarSesionCaducada } from './sesion-caducada-store';
import { SessionContext, type ProfileStatus, type SessionContextValue } from './session-context';

// ===== Tipos =====

// Perfil cargado para un usuario concreto. Si cambia el usuario, el estado anterior deja de
// valer sin tener que limpiarlo a mano.
type ProfileState = { userId: string; status: ProfileStatus; profile: Profile | null };

// ===== Principal =====

export function SessionProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<Sesion | null>(null);
  const [profileState, setProfileState] = useState<ProfileState | null>(null);
  const [profileRequest, setProfileRequest] = useState(0);
  // Cierre pedido por el usuario: no se explica como sesión caducada.
  const cerrandoAMano = useRef(false);

  // 1. Sesión guardada y cambios de sesión.
  useEffect(() => {
    let active = true;
    cargarSesionGuardada()
      .then(async (guardada) => {
        let sesion = guardada;
        if (sesion !== null) {
          // Más de 60 días sin conexión: la sesión caduca, pero los datos locales se quedan
          // (decisión del usuario). Sin registro previo, el conteo empieza ahora.
          const ultima = leerUltimaConexion();
          if (ultima === null) marcarConexion();
          else if (caducoSinConexion(ultima, Date.now())) {
            marcarSesionCaducada(true);
            await establecerSesion(null, 'caducada');
            sesion = null;
          }
        }
        if (active) setSession(sesion);
      })
      .finally(() => {
        if (active) setInitializing(false);
      });

    const dejarDeEscuchar = escucharSesion((nueva, motivo) => {
      setSession(nueva);
      if (motivo === 'entrada') {
        marcarConexion();
        marcarSesionCaducada(false);
      }
      // El servidor rechazó el token (venció): se explica al volver a entrar.
      if (motivo === 'caducada' && !cerrandoAMano.current) marcarSesionCaducada(true);
    });

    return () => {
      active = false;
      dejarDeEscuchar();
    };
  }, []);

  // 2. Perfil del usuario con sesión. Antes se revisa que la base local sea de esta cuenta: si era
  // de otra, se vacía (y se cancelan sus avisos) mientras sigue la pantalla de carga, para que
  // nunca se vean sus hábitos.
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (userId === null) return;
    let active = true;
    asegurarDuenoBaseLocal(userId)
      .then((vaciada) => (vaciada ? cancelarAvisos() : undefined))
      .catch(() => {
        // Si la revisión falla, la sincronización la repite antes de subir o bajar nada.
      })
      .then(() => getProfile(userId))
      .then((profile) => {
        if (active) setProfileState({ userId, status: 'ready', profile });
      })
      .catch(() => {
        if (active) setProfileState({ userId, status: 'error', profile: null });
      });
    return () => {
      active = false;
    };
  }, [userId, profileRequest]);

  const current = profileState !== null && profileState.userId === userId ? profileState : null;
  const profileStatus: ProfileStatus = userId === null ? 'idle' : (current?.status ?? 'loading');
  const profile = current?.profile ?? null;

  const reloadProfile = useCallback(() => {
    setProfileState(null);
    setProfileRequest((n) => n + 1);
  }, []);

  const chooseMode = useCallback(
    async (mode: AppMode) => {
      if (userId === null) return;
      const updated = await saveMode(userId, mode, deviceTimeZone());
      setProfileState({ userId, status: 'ready', profile: updated });
    },
    [userId],
  );

  const signOut = useCallback(async () => {
    // Antes de salir se intenta subir lo pendiente; después se borran los datos locales para que
    // la siguiente cuenta empiece limpia. El token solo vive en el teléfono: no hay que avisar al
    // servidor. El borrado va en finally: ocurre aunque falle la sincronización.
    cerrandoAMano.current = true;
    try {
      await sincronizarAhora().catch(() => {});
      await establecerSesion(null, 'salida');
    } finally {
      cerrandoAMano.current = false;
      await vaciarBaseLocal().catch(() => {});
      await cancelarAvisos().catch(() => {});
    }
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      initializing,
      session,
      profile,
      profileStatus,
      reloadProfile,
      chooseMode,
      signOut,
    }),
    [initializing, session, profile, profileStatus, reloadProfile, chooseMode, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
