import { pedirApi } from '@/comun/datos/clienteApi';

import { getDb, guardarFilas } from '@/comun/datos/database';

// Repositorio del perfil. Se lee del backend y se guarda una copia en SQLite: si no hay conexión
// al abrir la app, se usa la copia local para llegar a las pestañas (SDD 3.4). El modo y el
// onboarding se guardan con conexión, porque crear el plan ya la necesita.

export type AppMode = 'tradicional' | 'guiado';

export type Profile = {
  id: string;
  nombre: string | null;
  zonaHoraria: string;
  modo: AppMode | null;
  onboardingCompleto: boolean;
};

type ProfileRow = {
  id: string;
  nombre: string | null;
  zona_horaria: string;
  modo: AppMode | null;
  onboarding_completo: boolean;
  updated_at?: string;
};

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    nombre: row.nombre,
    zonaHoraria: row.zona_horaria,
    modo: row.modo,
    onboardingCompleto: row.onboarding_completo,
  };
}

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { fila } = await pedirApi<{ fila: ProfileRow | null }>('/sync/fila', {
    metodo: 'POST',
    cuerpo: { tabla: 'profiles', clave: { id: userId } },
  });
  return fila;
}

async function guardarCopia(row: ProfileRow): Promise<void> {
  await guardarFilas(await getDb(), 'profiles', [row]);
}

async function leerCopia(userId: string): Promise<Profile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<
    Omit<ProfileRow, 'onboarding_completo'> & { onboarding_completo: number }
  >('SELECT id, nombre, zona_horaria, modo, onboarding_completo FROM profiles WHERE id = ?', [
    userId,
  ]);
  return row ? toProfile({ ...row, onboarding_completo: row.onboarding_completo === 1 }) : null;
}

export async function getProfile(userId: string): Promise<Profile> {
  let row: ProfileRow | null;
  try {
    row = await fetchProfile(userId);
  } catch (error) {
    // Sin conexión (o el servidor no respondió): se usa la copia local si existe.
    const copia = await leerCopia(userId).catch(() => null);
    if (copia) return copia;
    throw error;
  }
  if (row) {
    await guardarCopia(row);
    return toProfile(row);
  }

  // El backend crea el perfil al registrar la cuenta; si no está, algo se borró a mano.
  throw new Error('No se encontró el perfil de esta cuenta');
}

/** Guarda el modo y cierra la bienvenida: es el último paso del onboarding en los dos modos. */
export async function saveMode(
  userId: string,
  modo: AppMode,
  zonaHoraria: string,
): Promise<Profile> {
  const { filas } = await pedirApi<{ filas: ProfileRow[] }>('/sync/operacion', {
    metodo: 'POST',
    cuerpo: {
      operacion: 'update',
      tabla: 'profiles',
      clave: { id: userId },
      cambios: { modo, zona_horaria: zonaHoraria, onboarding_completo: true },
    },
  });
  const [data] = filas;
  if (!data) throw new Error('No se pudo guardar el modo');
  await guardarCopia(data);
  return toProfile(data);
}
