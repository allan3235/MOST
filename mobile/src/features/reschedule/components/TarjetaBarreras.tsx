/**
 * @file TarjetaBarreras.tsx
 * @proyecto most.
 * @descripcion Lista de barreras en Hoy (RF-17 + RF-19, UC-10). Cuando un día de un hábito no
 *   salió, primero pregunta qué se atravesó (3 opciones de un toque o «Prefiero no decir») y luego
 *   ofrece la alternativa que más ayuda, la recomendada primero: una versión más ligera, otro día
 *   o elegir el día. Siempre se puede «Dejarlo así». Con barrera, ese día no cuenta en contra.
 *   Botones con borde (secundarios) para no competir con marcar los hábitos.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { MessageCircleQuestionMark } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { textoDuracion } from '@/features/habits/domain/formato';
import { es, formatear } from '@/i18n/es';
import { colors } from '@/theme';

import { BARRERAS, type Alternativa, type Barrera } from '../domain/barreras';
import type { Propuesta } from '../domain/reprogramar';
import { cuandoFue, destinoDia } from '../domain/texto-dia';

// ===== Tipos =====

export type TarjetaBarrerasProps = {
  propuesta: Propuesta;
  hoy: string;
  /** null: todavía pregunta qué se atravesó. */
  barrera: Barrera | null;
  alternativas: readonly Alternativa[];
  /** Posición entre las propuestas de hoy («1 de 2»); no se muestra si hay una sola. */
  indice: number;
  total: number;
  ocupado: boolean;
  /** Una barrera, o null para «Prefiero no decir». */
  onBarrera: (barrera: Barrera | null) => void;
  onLigero: () => void;
  onMover: (fecha: string) => void;
  onOtroDia: () => void;
  onDejar: () => void;
};

// ===== Constantes =====

const TAMANO_ICONO = 22;

// ===== Principal =====

/**
 * Tarjeta de la lista de barreras: la pregunta o, con la respuesta, las alternativas.
 * @param props Propuesta, respuesta y acciones.
 * @returns La tarjeta.
 */
export function TarjetaBarreras({
  propuesta,
  hoy,
  barrera,
  alternativas,
  indice,
  total,
  ocupado,
  onBarrera,
  onLigero,
  onMover,
  onOtroDia,
  onDejar,
}: TarjetaBarrerasProps) {
  const t = es.reprogramar;

  const botonDe = (alternativa: Alternativa) => {
    switch (alternativa.tipo) {
      case 'ligero': {
        const duracion = textoDuracion(alternativa.paso.duracion_min);
        return (
          <Button
            key="ligero"
            variant="secondary"
            label={formatear(t.probarLigero, { duracion })}
            accessibilityLabel={formatear(t.probarLigeroA11y, {
              titulo: alternativa.paso.titulo,
              duracion,
            })}
            disabled={ocupado}
            onPress={onLigero}
          />
        );
      }
      case 'mover':
        return (
          <Button
            key="mover"
            variant="secondary"
            label={formatear(t.moverA, { destino: destinoDia(alternativa.fecha, hoy) })}
            disabled={ocupado}
            onPress={() => onMover(alternativa.fecha)}
          />
        );
      case 'elegir':
        return (
          <Button
            key="elegir"
            variant="secondary"
            label={t.otroDia}
            disabled={ocupado}
            onPress={onOtroDia}
          />
        );
    }
  };

  return (
    <Card className="gap-4">
      <View className="flex-row gap-3">
        <View
          importantForAccessibility="no-hide-descendants"
          className="h-10 w-10 items-center justify-center rounded-chip bg-accent-claro"
        >
          <MessageCircleQuestionMark size={TAMANO_ICONO} color={colors.accent} />
        </View>
        <View className="flex-1 gap-1">
          {barrera === null ? (
            <AppText accessibilityRole="header">
              {formatear(t.barreraPregunta, {
                habito: propuesta.habito.titulo,
                cuando: cuandoFue(propuesta.fechaOriginal, hoy),
              })}
            </AppText>
          ) : (
            <>
              <AppText accessibilityRole="header">
                {`${t.empatia[barrera]} ${t.preguntaAlternativa[alternativas[0]?.tipo ?? 'ninguna']}`}
              </AppText>
              <AppText variant="small" tone="ink-soft">
                {t.sinContra}
              </AppText>
            </>
          )}
          {total > 1 ? (
            <AppText variant="small" tone="ink-soft">
              {formatear(t.contador, { n: indice, total })}
            </AppText>
          ) : null}
        </View>
      </View>

      {barrera === null ? (
        <View className="gap-2">
          {BARRERAS.map((opcion) => (
            <Button
              key={opcion}
              variant="secondary"
              label={t.barreras[opcion]}
              disabled={ocupado}
              onPress={() => onBarrera(opcion)}
            />
          ))}
          <Button
            variant="tertiary"
            label={t.prefieroNoDecir}
            disabled={ocupado}
            onPress={() => onBarrera(null)}
          />
        </View>
      ) : (
        <View className="gap-2">
          {alternativas.map(botonDe)}
          <Button variant="tertiary" label={t.dejarAsi} disabled={ocupado} onPress={onDejar} />
        </View>
      )}
    </Card>
  );
}
