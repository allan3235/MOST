import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/comun/presentacion/ui/app-text';
import { ICONO_CATEGORIA } from '@/features/habits/categoria-icono';
import { es } from '@/comun/i18n/es';
import type { Area } from '@/comun/logica/esquemas/onboarding';
import { colors, tintes } from '@/comun/tema';

// Sección de un área en Progreso, como en Hábitos: icono sobre el tinte del área y su nombre como
// encabezado, y debajo sus hábitos. Con el filtro por área (`AreaSelect`) queda solo la elegida.

export function AreaSection({ area, children }: { area: Area; children: ReactNode }) {
  const Icono = ICONO_CATEGORIA[area];
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2" accessibilityRole="header">
        <View
          style={{ backgroundColor: tintes[area] }}
          className="h-9 w-9 items-center justify-center rounded-field"
        >
          <Icono size={20} color={colors.ink} />
        </View>
        <AppText variant="h3">{es.onboarding.formulario.areas[area]}</AppText>
      </View>
      {children}
    </View>
  );
}
