/**
 * @file ruedas-hora.tsx
 * @proyecto most.
 * @descripcion Elegir una hora con dos ruedas (horas 00–23 y minutos 00–59) y «Cancelar» /
 *   «Aceptar». Es igual en Android y en iPhone (RNF-11): antes se usaba el reloj de Android, que en
 *   iPhone no abría. `RuedasHora` es solo el contenido (para usarlo dentro de otro diálogo);
 *   `DialogoHora` lo envuelve en su propio diálogo.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-25
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-25): creación (sustituye a DateTimePickerAndroid).
 */

import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { es } from '@/comun/i18n/es';

import { AppText } from './app-text';
import { Dialog } from './dialog';
import { WheelColumn } from './wheel-column';

// ===== Tipos =====

export type RuedasHoraProps = {
  /** Hora inicial "HH:MM". */
  valor: string;
  onAceptar: (hora: string) => void;
  onCancelar: () => void;
};

export type DialogoHoraProps = RuedasHoraProps & {
  /** Título del diálogo (por defecto, «Elegir hora»). */
  titulo?: string;
};

// ===== Constantes =====

const HORAS_DEL_DIA = 24;
const MINUTOS_POR_HORA = 60;
const DIGITOS = 2;

const HORAS = Array.from({ length: HORAS_DEL_DIA }, (_, i) => String(i).padStart(DIGITOS, '0'));
const MINUTOS = Array.from({ length: MINUTOS_POR_HORA }, (_, i) =>
  String(i).padStart(DIGITOS, '0'),
);

// ===== Funciones auxiliares =====

/**
 * Separa "HH:MM" en números; un valor raro queda en 0.
 * @param hora Hora "HH:MM".
 * @returns Hora y minuto.
 */
export function partesDeHora(hora: string): { hh: number; mm: number } {
  const [hh = 0, mm = 0] = hora.split(':').map((parte) => Number.parseInt(parte, 10));
  return {
    hh: Number.isInteger(hh) && hh >= 0 && hh < HORAS_DEL_DIA ? hh : 0,
    mm: Number.isInteger(mm) && mm >= 0 && mm < MINUTOS_POR_HORA ? mm : 0,
  };
}

/**
 * Arma "HH:MM".
 * @param hh Hora (0–23).
 * @param mm Minuto (0–59).
 * @returns La hora con dos dígitos en cada parte.
 */
export function formatearHora(hh: number, mm: number): string {
  return `${String(hh).padStart(DIGITOS, '0')}:${String(mm).padStart(DIGITOS, '0')}`;
}

// ===== Principal =====

/**
 * Ruedas de horas y minutos con sus botones (sin diálogo propio).
 * @param props Hora inicial y acciones.
 * @returns El contenido.
 */
export function RuedasHora({ valor, onAceptar, onCancelar }: RuedasHoraProps) {
  const t = es.reloj;
  const inicial = partesDeHora(valor);
  const [hh, setHh] = useState(inicial.hh);
  const [mm, setMm] = useState(inicial.mm);

  return (
    <>
      <View className="flex-row gap-2">
        <WheelColumn etiqueta={t.horas} opciones={HORAS} indice={hh} onCambiar={setHh} escribible />
        <WheelColumn
          etiqueta={t.minutos}
          opciones={MINUTOS}
          indice={mm}
          onCambiar={setMm}
          escribible
        />
      </View>

      <View className="flex-row gap-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.cancelar}
          onPress={onCancelar}
          className="h-12 flex-1 items-center justify-center rounded-field border-2 border-borde bg-campo active:bg-accent-claro"
        >
          <AppText weight="bold">{t.cancelar}</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.aceptar}
          onPress={() => onAceptar(formatearHora(hh, mm))}
          className="h-12 flex-1 items-center justify-center rounded-field bg-accent active:bg-accent-oscuro"
        >
          <AppText weight="bold" tone="blanco">
            {t.aceptar}
          </AppText>
        </Pressable>
      </View>
    </>
  );
}

/**
 * Diálogo para elegir una hora. Se monta solo mientras está abierto: siempre arranca en `valor`.
 * @param props Título, hora inicial y acciones.
 * @returns El diálogo.
 */
export function DialogoHora({ titulo, ...props }: DialogoHoraProps) {
  return (
    <Dialog visible titulo={titulo ?? es.reloj.titulo} onCerrar={props.onCancelar}>
      <RuedasHora {...props} />
    </Dialog>
  );
}
