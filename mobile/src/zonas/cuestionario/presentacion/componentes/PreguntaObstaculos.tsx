/**
 * @file PreguntaObstaculos.tsx
 * @proyecto most.
 * @descripcion Pregunta 6 de la encuesta: qué se le complica para ser constante. Se pueden elegir
 *   todas las que se parezcan a la persona (decisión del usuario: sin tope).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación (antes era una sola respuesta).
 */

import { View } from 'react-native';

import { OptionChip } from '@/comun/presentacion/ui/option-chip';
import { es } from '@/comun/i18n/es';
import { OBSTACULOS } from '@/comun/modelo/esquemas/onboarding';

import { useOnboardingStore } from '@/zonas/cuestionario/logica/onboarding-store';

// ===== Principal =====

/**
 * Pregunta 6: varias respuestas.
 * @returns La pregunta.
 */
export function PreguntaObstaculos() {
  const t = es.onboarding.formulario;
  const elegidos = useOnboardingStore((s) => s.borrador.obstaculos);
  const alternar = useOnboardingStore((s) => s.alternarObstaculo);

  return (
    <View accessibilityRole="list" className="gap-3">
      {OBSTACULOS.map((obstaculo) => (
        <OptionChip
          key={obstaculo}
          kind="checkbox"
          label={t.obstaculo[obstaculo]}
          selected={elegidos.includes(obstaculo)}
          onPress={() => alternar(obstaculo)}
        />
      ))}
    </View>
  );
}
