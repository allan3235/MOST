/**
 * @file CelebracionHito.tsx
 * @proyecto most.
 * @descripcion Refuerzo en los hitos del micro-paso (RF-16, RI-03): al llegar a 5 de 10 y a 8 de
 *   10 aparece una tarjeta con la barra de avance, una vibración suave y, si está encendido, un
 *   sonido corto. Solo celebra: no habla de lo que falta como deuda.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { useAudioPlayer } from 'expo-audio';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useEffect } from 'react';
import { Modal, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import type { HitoAlcanzado } from '@/db/hitos-repository';
import { es, formatear } from '@/i18n/es';

// ===== Tipos =====

export type HitoParaCelebrar = HitoAlcanzado & { sonido: boolean };

export type CelebracionHitoProps = {
  hito: HitoParaCelebrar | null;
  onCerrar: () => void;
};

// ===== Constantes =====

// Metro necesita un require fijo por archivo.
const SONIDO_HITO = require('../../../../assets/sounds/hito.wav') as number;

const CIEN = 100;

// ===== Principal =====

/**
 * Tarjeta de celebración de un hito; no se ve sin hito.
 * @param props Hito y cierre.
 * @returns El modal.
 */
export function CelebracionHito({ hito, onCerrar }: CelebracionHitoProps) {
  const t = es.hitos;
  const reproductor = useAudioPlayer(SONIDO_HITO);

  useEffect(() => {
    if (!hito) {
      return;
    }
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    if (hito.sonido) {
      reproductor
        .seekTo(0)
        .then(() => reproductor.play())
        .catch(() => {});
    }
  }, [hito, reproductor]);

  const ancho = hito ? `${(hito.avance.hechos / hito.avance.meta) * CIEN}%` : '0%';

  return (
    <Modal visible={hito !== null} transparent animationType="fade" onRequestClose={onCerrar}>
      <View className="flex-1 items-center justify-center bg-ink/40 px-8">
        <View
          accessibilityViewIsModal
          className="w-full items-center gap-5 rounded-card bg-campo p-6"
        >
          {hito ? (
            <>
              <AppText variant="h1" accessibilityElementsHidden>
                {hito.porcentaje === 50 ? '🌿' : '🌳'}
              </AppText>
              <AppText variant="h3" className="text-center" accessibilityRole="header">
                {t.titulo[hito.porcentaje]}
              </AppText>
              <AppText className="text-center" tone="ink-soft">
                {formatear(t.cuerpo, { habito: hito.titulo })}
              </AppText>
              <View
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={formatear(t.a11y, {
                  n: hito.avance.hechos,
                  meta: hito.avance.meta,
                })}
                accessibilityValue={{ min: 0, max: hito.avance.meta, now: hito.avance.hechos }}
                className="w-full gap-2"
              >
                <View className="h-3 w-full overflow-hidden rounded-chip bg-accent-claro">
                  <View className="h-full rounded-chip bg-accent" style={{ width: ancho }} />
                </View>
                <AppText variant="small" weight="bold" className="text-center">
                  {formatear(t.contador, { n: hito.avance.hechos, meta: hito.avance.meta })}
                </AppText>
              </View>
            </>
          ) : null}
          <Button label={t.genial} onPress={onCerrar} className="self-stretch" />
        </View>
      </View>
    </Modal>
  );
}
