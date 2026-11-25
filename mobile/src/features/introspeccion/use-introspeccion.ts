/**
 * @file use-introspeccion.ts
 * @proyecto most.
 * @descripcion Estado de la introspección por valores (RF-04): si toca la reflexión semanal, abrir
 *   el diálogo (semanal o al pausar, UC-11) y guardar lo respondido en el teléfono.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { useState } from 'react';

import { guardarIntrospeccion, leerTocaReflexion } from '@/db/introspeccion-repository';
import { useLocalQuery } from '@/comun/presentacion/use-local-query';
import { fechaLocal } from '@/comun/util/dates';

import type { MotivoIntrospeccion, Respuestas } from './domain/introspeccion';

// ===== Principal =====

/**
 * Introspección del usuario con sesión.
 * @param userId Usuario con sesión.
 * @returns Si toca la semanal, el motivo abierto y las acciones.
 */
export function useIntrospeccion(userId: string) {
  const consulta = useLocalQuery(`reflexion-${userId}-${fechaLocal()}`, () =>
    leerTocaReflexion(userId),
  );
  const [motivo, setMotivo] = useState<MotivoIntrospeccion | null>(null);

  const guardar = (m: MotivoIntrospeccion, respuestas: Respuestas | null) => {
    guardarIntrospeccion(userId, m, respuestas).catch((causa: unknown) => {
      console.warn('No se pudo guardar la introspección', causa);
    });
  };

  return {
    tocaSemanal: consulta.data === true,
    motivo,
    abrir: (m: MotivoIntrospeccion) => setMotivo(m),
    /** «Ahora no» en la tarjeta: no vuelve a preguntar hasta dentro de 7 días. */
    posponer: () => guardar('semanal', null),
    terminar: (respuestas: Respuestas | null) => {
      if (motivo) {
        guardar(motivo, respuestas);
      }
      setMotivo(null);
    },
  };
}
