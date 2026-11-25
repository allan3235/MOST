/**
 * @file use-reloj.tsx
 * @proyecto most.
 * @descripcion Abre el diálogo de hora (ruedas) desde cualquier pantalla, con la misma forma que
 *   tenía el reloj de Android: `abrirReloj(horaInicial, alElegir)`. La pantalla solo tiene que
 *   mostrar `reloj` (dentro de su diálogo, si está en uno).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-25
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-25): creación (sustituye a DateTimePickerAndroid.open).
 */

import { useState, type ReactNode } from 'react';

import { DialogoHora } from './ui/ruedas-hora';

// ===== Tipos =====

type Peticion = { hora: string; alElegir: (hora: string) => void; titulo?: string };

export type Reloj = {
  /**
   * Muestra las ruedas.
   * @param hora Hora inicial "HH:MM".
   * @param alElegir Recibe la hora al pulsar «Aceptar».
   * @param titulo Título del diálogo (opcional).
   */
  abrirReloj: (hora: string, alElegir: (hora: string) => void, titulo?: string) => void;
  /** El diálogo (null mientras está cerrado). */
  reloj: ReactNode;
};

// ===== Principal =====

/**
 * Estado del diálogo de hora.
 * @returns Cómo abrirlo y el elemento a mostrar.
 */
export function useReloj(): Reloj {
  const [peticion, setPeticion] = useState<Peticion | null>(null);
  const abrirReloj = (hora: string, alElegir: (hora: string) => void, titulo?: string) =>
    setPeticion({ hora, alElegir, titulo });
  const reloj = peticion ? (
    <DialogoHora
      titulo={peticion.titulo}
      valor={peticion.hora}
      onCancelar={() => setPeticion(null)}
      onAceptar={(hora) => {
        setPeticion(null);
        peticion.alElegir(hora);
      }}
    />
  ) : null;
  return { abrirReloj, reloj };
}
