import { useState } from 'react';

import { leerCupoHabitos } from '@/db/habits-repository';
import { useSession } from '@/features/auth/session-context';
import type { Area } from '@/comun/modelo/esquemas/onboarding';
import { navegar } from '@/comun/presentacion/navegar';

import { LimiteHabitosDialog } from './components/limite-habitos-dialog';

// «+» de Hábitos y «Agregar hábito» de los detalles de una planta. Antes de abrir el asistente se
// revisa el límite de hábitos del usuario guiado (del plan y propios); si ya llegó, se explica con un diálogo.
// Si la revisión falla, se abre el asistente igual: el límite no debe bloquear por un error.

export function useAgregarHabito() {
  const { session, profile } = useSession();
  const [limite, setLimite] = useState<number | null>(null);

  /** true si todavía cabe un hábito (o si la revisión falla: el límite no bloquea por un error). */
  const hayLugar = async (): Promise<boolean> => {
    const userId = session?.user.id;
    if (!userId) return true;
    const cupo = await leerCupoHabitos(userId, profile?.modo ?? null).catch(() => null);
    if (cupo?.alcanzado) {
      setLimite(cupo.limite);
      return false;
    }
    return true;
  };

  const abrir = async (categoria?: Area) => {
    if (!(await hayLugar())) return;
    if (categoria) navegar.push({ pathname: '/habit/nuevo', params: { categoria } });
    else navegar.push('/habit/nuevo');
  };

  const dialogo = (
    <LimiteHabitosDialog motivo="crear" limite={limite} onCerrar={() => setLimite(null)} />
  );
  /** «Crear meta con micro-pasos» (RF-03), con el mismo límite de hábitos. */
  const abrirMeta = async () => {
    if (await hayLugar()) navegar.push('/crear-meta');
  };

  return { abrir, abrirMeta, dialogo };
}
