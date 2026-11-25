import { Sprout } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/comun/presentacion/ui/app-text';
import { lineaDeRacha, pildoraDeRacha, type Racha } from '@/zonas/progreso/logica/rachas';
import { es, formatear } from '@/comun/i18n/es';
import { colors } from '@/comun/tema';

// Avance de un hábito (maqueta «Piezas», opción C con el verde rocío de A): un cuadro de 36 dp con
// el total de veces completado y un brote. El número nunca baja (most. no tiene rachas que se
// borren). TalkBack lee la frase completa («Veces completado: 5»).

export function textoRacha(racha: Racha, desanimo: boolean): string {
  const t = es.estadisticas;
  return lineaDeRacha(racha, desanimo)
    .map(({ texto, n }) => formatear(t[texto], { n }))
    .join('. ');
}

export function StreakPill({ racha, desanimo }: { racha: Racha; desanimo: boolean }) {
  const pildora = pildoraDeRacha(racha, desanimo);
  if (!pildora) return null;
  return (
    <View
      accessible
      accessibilityLabel={textoRacha(racha, desanimo)}
      style={{ minHeight: 36 }}
      className="flex-row items-center gap-1 self-start rounded-field bg-accent-claro px-2.5"
    >
      <AppText variant="small" weight="bold" tone="ink" maxFontSizeMultiplier={1.5}>
        {String(pildora.n)}
      </AppText>
      <Sprout size={18} strokeWidth={2} color={colors.accent} />
    </View>
  );
}
