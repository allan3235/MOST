/**
 * @file TarjetaReflexion.tsx
 * @proyecto most.
 * @descripcion Invitación semanal a la introspección en Hoy (RF-04): corta, opcional y sin
 *   presión. Botones con borde para no competir con marcar los hábitos.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { Heart } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { es } from '@/i18n/es';
import { colors } from '@/theme';

// ===== Tipos =====

export type TarjetaReflexionProps = {
  onEmpezar: () => void;
  onAhoraNo: () => void;
};

// ===== Constantes =====

const TAMANO_ICONO = 22;

// ===== Principal =====

/**
 * Tarjeta «Un momento para ti».
 * @param props Acciones.
 * @returns La tarjeta.
 */
export function TarjetaReflexion({ onEmpezar, onAhoraNo }: TarjetaReflexionProps) {
  const t = es.introspeccion;
  return (
    <Card className="gap-4">
      <View className="flex-row gap-3">
        <View
          importantForAccessibility="no-hide-descendants"
          className="h-10 w-10 items-center justify-center rounded-chip bg-accent-claro"
        >
          <Heart size={TAMANO_ICONO} color={colors.accent} />
        </View>
        <View className="flex-1 gap-1">
          <AppText weight="bold" accessibilityRole="header">
            {t.tarjetaTitulo}
          </AppText>
          <AppText variant="small" tone="ink-soft">
            {t.tarjetaTexto}
          </AppText>
        </View>
      </View>
      <View className="gap-1">
        <Button variant="secondary" label={t.empezar} onPress={onEmpezar} />
        <Button variant="tertiary" label={t.ahoraNo} onPress={onAhoraNo} />
      </View>
    </Card>
  );
}
