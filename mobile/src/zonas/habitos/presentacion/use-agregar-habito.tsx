import { useState } from 'react';

import { leerCupoHabitos } from '@/zonas/habitos/logica/servicioHabitos';
import { useSession } from '@/zonas/cuenta/presentacion/session-context';
import type { Area } from '@/comun/modelo/esquemas/onboarding';
import { navegar } from '@/comun/presentacion/navegar';

import { DialogoAgregarHabito } from '@/zonas/habitos/presentacion/componentes/DialogoAgregarHabito';
import { LimiteHabitosDialog } from '@/zonas/habitos/presentacion/componentes/limite-habitos-dialog';

// «+» de Hábitos y «Agregar hábito» de los detalles de una planta. El «+» primero pregunta cómo
// crearlo: con micro-pasos («Crear meta», RF-03) o a su manera (asistente). Antes de abrir se
// revisa el límite de hábitos del usuario guiado (del plan y propios); si ya llegó, se explica con un diálogo.
// Si la revisión falla, se abre el asistente igual: el límite no debe bloquear por un error.

export function useAgregarHabito() {
  const { session, profile } = useSession();
  const [limite, setLimite] = useState<number | null>(null);
  const [eligiendo, setEligiendo] = useState(false);

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

  /** «Crear meta con micro-pasos» (RF-03), con el mismo límite de hábitos. */
  const abrirMeta = async () => {
    if (await hayLugar()) navegar.push('/crear-meta');
  };

  /** «+»: muestra las dos formas de crear un hábito. */
  const elegir = () => setEligiendo(true);

  const dialogo = (
    <>
      <DialogoAgregarHabito
        visible={eligiendo}
        onMicroPasos={() => {
          setEligiendo(false);
          void abrirMeta();
        }}
        onAMiManera={() => {
          setEligiendo(false);
          void abrir();
        }}
        onCerrar={() => setEligiendo(false)}
      />
      <LimiteHabitosDialog motivo="crear" limite={limite} onCerrar={() => setLimite(null)} />
    </>
  );

  return { abrir, abrirMeta, elegir, dialogo };
}
