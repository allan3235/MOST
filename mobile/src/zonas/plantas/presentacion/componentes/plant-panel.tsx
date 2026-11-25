import { Pressable, View } from 'react-native';

import { AppText } from '@/comun/presentacion/ui/app-text';
import type { PlantaJardin } from '@/zonas/plantas/datos/repositorioPlantas';
import { es, formatear } from '@/comun/i18n/es';
import { tintes } from '@/comun/tema';

import { descripcionPlanta, PlantImage } from './plant-image';

// Tarjeta de una planta del Jardín (mockup «Plantas #1»): el tinte de su área, la planta con sus
// accesorios y el nombre de la categoría. Nunca muestra XP ni niveles; lo que lleva puesto se
// le dice también al lector de pantalla.

export type PlantPanelProps = {
  planta: PlantaJardin;
  onPress: () => void;
  /** Es la planta que se muestra en Hoy. */
  enHoy?: boolean;
};

export function PlantPanel({ planta, onPress, enHoy = false }: PlantPanelProps) {
  const t = es.jardin;
  const categoria = es.onboarding.formulario.areas[planta.area];
  const lleva = planta.equipados.map((a) => a.nombre).join(', ');

  const etiqueta = [
    descripcionPlanta(planta.area, planta.fase),
    enHoy ? t.enHoy : null,
    lleva ? formatear(t.lleva, { lista: lleva }) : null,
    planta.tieneHabitos ? null : t.sinHabitos,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint={formatear(t.abrir, { categoria })}
      onPress={onPress}
      style={{ backgroundColor: tintes[planta.area] }}
      className="grow gap-2 rounded-card p-3 active:opacity-80"
    >
      {enHoy ? (
        <View className="self-start rounded-chip bg-campo px-2 py-0.5">
          <AppText variant="small" weight="semibold" tone="acento">
            {t.enHoy}
          </AppText>
        </View>
      ) : null}
      <PlantImage area={planta.area} fase={planta.fase} equipados={planta.equipados} />
      <View className="gap-1">
        <AppText weight="medium" className="text-center">
          {categoria}
        </AppText>
        {planta.tieneHabitos ? null : (
          <AppText variant="small" tone="ink-soft" className="text-center">
            {t.sinHabitosCorto}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}
