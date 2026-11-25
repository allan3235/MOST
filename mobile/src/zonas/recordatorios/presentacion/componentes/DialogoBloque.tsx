/**
 * @file DialogoBloque.tsx
 * @proyecto most.
 * @descripcion Crear o editar un bloque ocupado de la agenda (RF-02): nombre corto, días y horas
 *   de inicio y fin (reloj de Android, como el resto de la app). Valida antes de guardar.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación.
 */

import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/comun/presentacion/ui/app-text';
import { Button } from '@/comun/presentacion/ui/button';
import { DaySquares } from '@/comun/presentacion/ui/day-squares';
import { Dialog } from '@/comun/presentacion/ui/dialog';
import { Field } from '@/comun/presentacion/ui/field';
import { useReloj } from '@/comun/presentacion/use-reloj';
import type { DatosBloque } from '@/zonas/recordatorios/logica/servicioAgenda';
import { es, formatear } from '@/comun/i18n/es';

import {
  LARGO_MAXIMO_NOMBRE,
  validarBloque,
  type BloqueAgenda,
} from '@/zonas/recordatorios/logica/agenda';

// ===== Tipos =====

export type DialogoBloqueProps = {
  /** Bloque a editar; sin él se crea uno nuevo. */
  bloque: BloqueAgenda | null;
  onGuardar: (datos: DatosBloque) => void;
  onEliminar: () => void;
  onCerrar: () => void;
};

// ===== Constantes =====

const INICIO_POR_DEFECTO = '10:00';
const FIN_POR_DEFECTO = '11:00';
const LARGO_HORA = 5;

// ===== Principal =====

/**
 * Diálogo de un bloque ocupado.
 * @param props Bloque y acciones.
 * @returns El diálogo.
 */
export function DialogoBloque({ bloque, onGuardar, onEliminar, onCerrar }: DialogoBloqueProps) {
  const t = es.agenda;
  const [nombre, setNombre] = useState(bloque?.nombre ?? '');
  const [dias, setDias] = useState<number[]>(bloque?.dias_semana ?? []);
  const [inicio, setInicio] = useState(
    bloque?.hora_inicio.slice(0, LARGO_HORA) ?? INICIO_POR_DEFECTO,
  );
  const [fin, setFin] = useState(bloque?.hora_fin.slice(0, LARGO_HORA) ?? FIN_POR_DEFECTO);
  const [intentado, setIntentado] = useState(false);

  const error = validarBloque({ nombre, dias_semana: dias, hora_inicio: inicio, hora_fin: fin });

  const { abrirReloj, reloj } = useReloj();
  const elegirHora = (actual: string, cambiar: (hora: string) => void) => {
    abrirReloj(actual, cambiar);
  };

  const guardar = () => {
    setIntentado(true);
    if (error) {
      return;
    }
    onGuardar({ nombre, dias_semana: dias, hora_inicio: inicio, hora_fin: fin });
  };

  return (
    <Dialog visible titulo={bloque ? t.editar : t.nuevo} onCerrar={onCerrar}>
      <Field
        label={t.nombre}
        placeholder={t.nombrePlaceholder}
        value={nombre}
        onChangeText={setNombre}
        maxLength={LARGO_MAXIMO_NOMBRE}
        invalido={intentado && error === 'sin_nombre'}
      />
      <View className="gap-2">
        <AppText weight="bold">{t.dias}</AppText>
        <DaySquares
          value={dias}
          onChange={setDias}
          iniciales={es.habitForm.iniciales}
          nombres={es.habitForm.dias}
        />
      </View>
      {/* Uno debajo del otro: en dos columnas el texto no cabe en el botón. */}
      <View className="gap-2">
        <Button
          variant="secondary"
          label={formatear(t.horaBoton, { cual: t.inicio, hora: inicio })}
          onPress={() => elegirHora(inicio, setInicio)}
        />
        <Button
          variant="secondary"
          label={formatear(t.horaBoton, { cual: t.fin, hora: fin })}
          onPress={() => elegirHora(fin, setFin)}
        />
      </View>
      {intentado && error ? (
        <AppText variant="small" tone="peligro" accessibilityLiveRegion="polite">
          {t.errores[error]}
        </AppText>
      ) : null}
      <Button label={t.guardar} onPress={guardar} />
      {bloque ? <Button variant="tertiary" label={t.eliminar} onPress={onEliminar} /> : null}
      <Button variant="tertiary" label={t.cancelar} onPress={onCerrar} />
      {reloj}
    </Dialog>
  );
}
