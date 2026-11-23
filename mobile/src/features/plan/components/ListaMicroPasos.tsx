/**
 * @file ListaMicroPasos.tsx
 * @proyecto most.
 * @descripcion Secuencia ordenada de micro-pasos de un hábito (RF-03): los superados, en el que
 *   va y los que siguen. Cada estado lleva icono y texto (no solo color) y TalkBack lee cada paso
 *   como una frase («Paso 2 de 3: Leer 10 min. Vas aquí.»). Si el hábito está en una versión
 *   más ligera que su paso, el paso en curso muestra lo que de verdad toca hoy.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.1.0
 * @historial 1.0.0 (2026-11-23): creación. 1.1.0 (2026-11-23): versión ligera en el paso en
 *   curso y título opcional.
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
  /** Lo que el hábito pide hoy; si es más corto que el paso en curso, se muestra en su lugar. */
  enCurso?: { titulo: string; duracion_min: number };
  /** false cuando la pantalla ya pone el título «Tus micro-pasos». */
  conTitulo?: boolean;
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
export function ListaMicroPasos({
  pasos,
  pasoActual,
  enCurso,
  conTitulo = true,
}: ListaMicroPasosProps) {
  const t = es.microPasos;
  if (pasos.length === 0) {
    return null;
  }
  const ordenados = [...pasos].sort((a, b) => a.orden - b.orden);
  const actual = pasoActual ?? ordenados[0].orden;

  return (
    <View className="gap-2">
      {conTitulo ? (
        <AppText variant="small" weight="bold">
          {t.titulo}
        </AppText>
      ) : null}
      {ordenados.map((pasoBase) => {
        const estado = estadoDe(pasoBase.orden, actual);
        const esLigera =
          estado === 'actual' &&
          enCurso !== undefined &&
          enCurso.duracion_min > 0 &&
          enCurso.duracion_min < pasoBase.duracion_min;
        const paso = esLigera
          ? { orden: pasoBase.orden, titulo: enCurso.titulo, duracion_min: enCurso.duracion_min }
          : pasoBase;
        const estilo = ESTILO_POR_ESTADO[estado];
        const Icono = estilo.icono;
        const duracion = paso.duracion_min > 0 ? textoDuracion(paso.duracion_min) : null;
        const etiqueta = esLigera ? `${t.estados[estado]}, ${t.ligera}` : t.estados[estado];
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
