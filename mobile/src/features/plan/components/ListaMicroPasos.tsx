/**
 * @file ListaMicroPasos.tsx
 * @proyecto most.
 * @descripcion Secuencia ordenada de micro-pasos de un hábito (RF-03): los superados, en el que
 *   va y los que siguen. Cada estado lleva icono y texto (no solo color) y TalkBack lee cada paso
 *   como una frase («Paso 2 de 3: Leer 10 min. Vas aquí.»).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { Circle, CircleCheck, Footprints, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText, type TextTone } from '@/components/ui/app-text';
import { textoDuracion } from '@/features/habits/domain/formato';
import { es, formatear } from '@/i18n/es';
import { colors } from '@/theme';

// ===== Tipos =====

export type PasoDeLista = {
  orden: number;
  titulo: string;
  duracion_min: number;
};

type EstadoPaso = 'superado' | 'actual' | 'siguiente';

export type ListaMicroPasosProps = {
  pasos: readonly PasoDeLista[];
  /** Orden del paso en curso; sin él se toma el primero. */
  pasoActual: number | null | undefined;
};

// ===== Constantes =====

const TAMANO_ICONO = 20;

const ESTILO_POR_ESTADO: Record<
  EstadoPaso,
  { icono: LucideIcon; color: string; tono: TextTone; negritas: boolean }
> = {
  superado: { icono: CircleCheck, color: colors.confirmar, tono: 'ink-soft', negritas: false },
  actual: { icono: Footprints, color: colors.accent, tono: 'ink', negritas: true },
  siguiente: { icono: Circle, color: colors['ink-soft'], tono: 'ink-soft', negritas: false },
};

// ===== Funciones auxiliares =====

function estadoDe(orden: number, actual: number): EstadoPaso {
  if (orden < actual) {
    return 'superado';
  }
  return orden === actual ? 'actual' : 'siguiente';
}

// ===== Principal =====

/**
 * Lista de micro-pasos. No muestra nada si el hábito no tiene secuencia.
 * @param props Pasos y paso actual.
 * @returns La lista, o null.
 */
export function ListaMicroPasos({ pasos, pasoActual }: ListaMicroPasosProps) {
  const t = es.microPasos;
  if (pasos.length === 0) {
    return null;
  }
  const ordenados = [...pasos].sort((a, b) => a.orden - b.orden);
  const actual = pasoActual ?? ordenados[0].orden;

  return (
    <View className="gap-2">
      <AppText variant="small" weight="bold">
        {t.titulo}
      </AppText>
      {ordenados.map((paso) => {
        const estado = estadoDe(paso.orden, actual);
        const estilo = ESTILO_POR_ESTADO[estado];
        const Icono = estilo.icono;
        const duracion = paso.duracion_min > 0 ? textoDuracion(paso.duracion_min) : null;
        const etiqueta = t.estados[estado];
        return (
          <View
            key={paso.orden}
            accessible
            accessibilityLabel={formatear(t.a11y, {
              n: paso.orden,
              total: ordenados.length,
              titulo: paso.titulo,
              estado: etiqueta,
            })}
            className="min-h-12 flex-row items-center gap-3"
          >
            <Icono size={TAMANO_ICONO} color={estilo.color} />
            <View className="flex-1">
              <AppText
                variant="small"
                weight={estilo.negritas ? 'bold' : 'regular'}
                tone={estilo.tono}
              >
                {paso.titulo}
              </AppText>
              <AppText variant="small" tone="ink-soft">
                {[formatear(t.paso, { n: paso.orden }), duracion, etiqueta]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}
