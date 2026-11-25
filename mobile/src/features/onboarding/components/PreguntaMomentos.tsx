/**
 * @file PreguntaMomentos.tsx
 * @proyecto most.
 * @descripcion Pregunta 5 de la encuesta: en qué momentos del día tiene un rato libre. Se pueden
 *   elegir varios (mañana, mediodía, tarde, noche) y aplican a todos los días. Si su semana cambia,
 *   «Cambia según el día» abre una cuadrícula días × momentos para marcar cada día por separado.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación (antes era una sola respuesta).
 */

import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/comun/presentacion/ui/app-text';
import { Button } from '@/comun/presentacion/ui/button';
import { OptionChip } from '@/comun/presentacion/ui/option-chip';
import { es, formatear } from '@/comun/i18n/es';
import { MOMENTOS_CON_HORA } from '@/comun/logica/esquemas/onboarding';

import {
  alternarCelda,
  alternarMomento,
  esIgualTodosLosDias,
  momentoEnTodosLosDias,
} from '../domain/form-rules';
import { useOnboardingStore } from '../onboarding-store';

// ===== Constantes =====

/** Ancho de la columna con el nombre del momento en la cuadrícula. */
const ANCHO_ETIQUETA = 76;

// ===== Principal =====

/**
 * Pregunta 5: momentos libres, iguales todos los días o por día.
 * @returns La pregunta.
 */
export function PreguntaMomentos() {
  const t = es.onboarding.formulario;
  const dias = es.habitForm;
  const disponibilidad = useOnboardingStore((s) => s.borrador.disponibilidad);
  const cambiar = useOnboardingStore((s) => s.cambiarDisponibilidad);
  // Si ya la había ajustado por día (al volver a este paso), la cuadrícula aparece abierta.
  const [porDia, setPorDia] = useState(() => !esIgualTodosLosDias(disponibilidad));

  return (
    <View className="gap-5">
      <View accessibilityRole="list" className="gap-3">
        {MOMENTOS_CON_HORA.map((momento) => (
          <OptionChip
            key={momento}
            kind="checkbox"
            label={t.momento[momento]}
            selected={momentoEnTodosLosDias(disponibilidad, momento)}
            onPress={() => cambiar(alternarMomento(disponibilidad, momento))}
          />
        ))}
      </View>

      <Button
        variant="tertiary"
        label={porDia ? t.momentosOcultarDias : t.momentosPorDia}
        onPress={() => setPorDia((abierto) => !abierto)}
      />

      {porDia ? (
        <View className="gap-2">
          <AppText variant="small" tone="ink-soft">
            {t.momentosAyudaDias}
          </AppText>
          <View className="flex-row items-center">
            <View style={{ width: ANCHO_ETIQUETA }} />
            {dias.iniciales.map((inicial, i) => (
              <AppText
                key={dias.dias[i]}
                variant="small"
                weight="semibold"
                className="flex-1 text-center"
                accessibilityElementsHidden
              >
                {inicial}
              </AppText>
            ))}
          </View>
          {MOMENTOS_CON_HORA.map((momento) => (
            <View key={momento} className="flex-row items-center">
              <AppText variant="small" style={{ width: ANCHO_ETIQUETA }}>
                {t.momento[momento]}
              </AppText>
              {disponibilidad.map((momentos, indiceDia) => {
                const libre = momentos.includes(momento);
                return (
                  <View key={dias.dias[indiceDia]} className="flex-1 items-center py-1">
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={formatear(t.momentosCeldaA11y, {
                        dia: dias.dias[indiceDia] ?? '',
                        momento: t.momento[momento],
                      })}
                      accessibilityState={{ checked: libre }}
                      onPress={() => cambiar(alternarCelda(disponibilidad, indiceDia, momento))}
                      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                      className={`h-9 w-9 rounded-field border-2 ${
                        libre ? 'border-accent bg-accent' : 'border-borde bg-campo'
                      }`}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
