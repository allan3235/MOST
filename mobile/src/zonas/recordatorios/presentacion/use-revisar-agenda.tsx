/**
 * @file use-revisar-agenda.tsx
 * @proyecto most.
 * @descripcion Revisión de la agenda al elegir la hora de un recordatorio (RF-02, CP-04). Si la
 *   hora cae en un bloque ocupado, no se aplica: se avisa y se ofrece la primera hora libre en un
 *   toque («Usar las 11:00») o elegir otra. Sin choque, la hora se aplica directo.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación.
 */

import { useState, type ReactNode } from 'react';

import { Button } from '@/comun/presentacion/ui/button';
import { Dialog } from '@/comun/presentacion/ui/dialog';
import { leerBloques } from '@/zonas/recordatorios/logica/servicioAgenda';
import { useLocalQuery } from '@/comun/presentacion/use-local-query';
import { useSession } from '@/zonas/cuenta/presentacion/session-context';
import { es, formatear } from '@/comun/i18n/es';

import {
  bloqueQueChoca,
  primeraHoraLibre,
  type BloqueAgenda,
} from '@/zonas/recordatorios/logica/agenda';

// ===== Tipos =====

type Choque = {
  bloque: BloqueAgenda;
  /** Primera hora libre, o null si ya no cabe ese día. */
  sugerida: string | null;
  aplicar: (hora: string) => void;
  /** Para «Elegir otra hora»: vuelve a abrir el reloj. */
  elegirOtra?: () => void;
};

export type RevisarAgenda = {
  /**
   * Aplica la hora si está libre; si choca, muestra el aviso con la sugerencia.
   * @param hora Hora elegida "HH:MM".
   * @param dias Días del hábito.
   * @param duracionMin Minutos del hábito.
   * @param aplicar Qué hacer con la hora final.
   * @param elegirOtra Volver a abrir el reloj.
   */
  revisar: (
    hora: string,
    dias: readonly number[],
    duracionMin: number,
    aplicar: (hora: string) => void,
    elegirOtra?: () => void,
  ) => void;
  /** El aviso de choque; va en la pantalla junto a los demás diálogos. */
  dialogo: ReactNode;
};

// ===== Principal =====

/**
 * Revisión de la agenda para un formulario con hora de recordatorio.
 * @returns revisar y el diálogo a mostrar.
 */
export function useRevisarAgenda(): RevisarAgenda {
  const t = es.agenda;
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const bloques = useLocalQuery(`agenda-${userId}`, () => leerBloques(userId));
  const [choque, setChoque] = useState<Choque | null>(null);

  const revisar: RevisarAgenda['revisar'] = (hora, dias, duracionMin, aplicar, elegirOtra) => {
    const lista = bloques.data ?? [];
    const bloque = bloqueQueChoca(lista, dias, hora, duracionMin);
    if (!bloque) {
      aplicar(hora);
      return;
    }
    setChoque({
      bloque,
      sugerida: primeraHoraLibre(lista, dias, hora, duracionMin),
      aplicar,
      elegirOtra,
    });
  };

  const cerrar = () => setChoque(null);

  const dialogo = choque ? (
    <Dialog
      visible
      titulo={
        choque.sugerida
          ? formatear(t.choque, { bloque: choque.bloque.nombre, hora: choque.sugerida })
          : formatear(t.choqueSinHora, { bloque: choque.bloque.nombre })
      }
      onCerrar={cerrar}
    >
      {choque.sugerida ? (
        <Button
          label={formatear(t.usarHora, { hora: choque.sugerida })}
          onPress={() => {
            const { aplicar, sugerida } = choque;
            cerrar();
            if (sugerida) {
              aplicar(sugerida);
            }
          }}
        />
      ) : null}
      {choque.elegirOtra ? (
        <Button
          variant="secondary"
          label={t.otraHora}
          onPress={() => {
            const { elegirOtra } = choque;
            cerrar();
            elegirOtra?.();
          }}
        />
      ) : null}
      <Button
        variant="tertiary"
        label={choque.sugerida ? t.cancelar : t.entendido}
        onPress={cerrar}
      />
    </Dialog>
  ) : null;

  return { revisar, dialogo };
}
