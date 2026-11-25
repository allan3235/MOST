// Decide a qué zona de la app va el usuario según su sesión y su perfil (SDD 9.1).
// Es una función pura para poder probar cada caso; el layout raíz la usa en sus guardas.

export type AppZone = 'loading' | 'auth' | 'profile-error' | 'onboarding' | 'tabs';

export type SessionRouteInput = {
  initializing: boolean;
  hasSession: boolean;
  profileStatus: 'idle' | 'loading' | 'error' | 'ready';
  mode: 'tradicional' | 'guiado' | null;
};

export function resolveAppZone(input: SessionRouteInput): AppZone {
  if (input.initializing) return 'loading';
  if (!input.hasSession) return 'auth';
  if (input.profileStatus === 'idle' || input.profileStatus === 'loading') return 'loading';
  if (input.profileStatus === 'error') return 'profile-error';
  // UC-01: sin la encuesta (modo «guiado», que se guarda al confirmar el plan) no hay perfil para
  // armar micro-pasos, así que se pide antes de entrar. Incluye cuentas viejas en «tradicional».
  return input.mode === 'guiado' ? 'tabs' : 'onboarding';
}
