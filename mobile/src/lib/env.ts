/**
 * @file env.ts
 * @proyecto most.
 * @descripcion Variables públicas de la app. Expo las incrusta al compilar: se leen con
 *   process.env.NOMBRE literal (no con process.env[nombre]) para que el reemplazo funcione.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 2.0.0
 * @historial 1.0.0: variables de Supabase (Habit Green). 2.0.0 (2026-11-23): API de most.
 */

// ===== Principal =====

const urlApi = process.env.EXPO_PUBLIC_API_URL;

if (!urlApi) {
  throw new Error(
    'Falta EXPO_PUBLIC_API_URL. Copia mobile/.env.example como mobile/.env y pon la IP de tu PC.',
  );
}

export const env = {
  /** Dirección del backend sin "/" al final, por ejemplo http://192.168.1.100:3001. */
  urlApi: urlApi.replace(/\/+$/, ''),
};
