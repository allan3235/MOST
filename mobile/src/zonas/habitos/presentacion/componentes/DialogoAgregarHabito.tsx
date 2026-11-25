/**
 * @file DialogoAgregarHabito.tsx
 * @proyecto most.
 * @descripcion Lo que abre el «+» de Hábitos: dos formas de crear un hábito, cada una con una línea
 *   que explica la diferencia. «Con micro-pasos» (RF-03, recomendada) va primero; «A mi manera»
 *   abre el asistente para elegir nombre, días y hora. «Atrás» y tocar fuera cierran.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-25
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-25): creación (antes había un botón aparte para «Crear meta»).
 */

import { PencilLine, Sparkles, type LucideIcon } from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';

import { es } from '@/comun/i18n/es';
import { AppText } from '@/comun/presentacion/ui/app-text';
import { useAccionUnica } from '@/comun/presentacion/use-accion-unica';
import { colors } from '@/comun/tema';

// ===== Tipos =====

export type DialogoAgregarHabitoProps = {
  visible: boolean;
  onMicroPasos: () => void;
  onAMiManera: () => void;
  onCerrar: () => void;
};

type OpcionProps = {
  icono: LucideIcon;
  titulo: string;
  ayuda: string;
  etiqueta?: string;
  destacada?: boolean;
  onPress: () => void;
};

// ===== Constantes =====

const TAMANO_ICONO = 22;
const ALTO_MINIMO_OPCION = 72;

// ===== Funciones auxiliares =====

/**
 * Una opción del diálogo: icono, título, etiqueta opcional y una línea de ayuda.
 * @param props Datos de la opción.
 * @returns La opción.
 */
function Opcion({
  icono: Icono,
  titulo,
  ayuda,
  etiqueta,
  destacada = false,
  onPress,
}: OpcionProps) {
  const unaVez = useAccionUnica(onPress);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[titulo, etiqueta, ayuda].filter(Boolean).join('. ')}
      onPress={unaVez}
      style={{ minHeight: ALTO_MINIMO_OPCION }}
      className={`flex-row items-center gap-3 rounded-field border-2 p-4 active:opacity-80 ${
        destacada ? 'border-accent bg-accent-claro' : 'border-divisor bg-campo'
      }`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-chip bg-campo">
        <Icono size={TAMANO_ICONO} color={colors.accent} />
      </View>
      <View className="flex-1 gap-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <AppText weight="semibold">{titulo}</AppText>
          {etiqueta ? (
            <AppText variant="small" weight="semibold" tone="acento">
              {etiqueta}
            </AppText>
          ) : null}
        </View>
        <AppText variant="small" tone="ink-soft">
          {ayuda}
        </AppText>
      </View>
    </Pressable>
  );
}

// ===== Principal =====

/**
 * Diálogo para elegir cómo crear un hábito.
 * @param props Visibilidad y acciones.
 * @returns El diálogo.
 */
export function DialogoAgregarHabito({
  visible,
  onMicroPasos,
  onAMiManera,
  onCerrar,
}: DialogoAgregarHabitoProps) {
  const t = es.habitos.agregarOpciones;
  const cerrarUnaVez = useAccionUnica(onCerrar);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View className="flex-1 items-center justify-center px-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.cancelar}
          onPress={cerrarUnaVez}
          className="absolute inset-0 bg-ink/40"
        />
        <View accessibilityViewIsModal className="w-full gap-4 rounded-card bg-campo p-6">
          <AppText weight="bold" className="text-center" accessibilityRole="header">
            {t.titulo}
          </AppText>
          <Opcion
            icono={Sparkles}
            titulo={t.microPasos}
            etiqueta={t.recomendado}
            ayuda={t.microPasosAyuda}
            destacada
            onPress={onMicroPasos}
          />
          <Opcion
            icono={PencilLine}
            titulo={t.aMiManera}
            ayuda={t.aMiManeraAyuda}
            onPress={onAMiManera}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.cancelar}
            onPress={cerrarUnaVez}
            style={{ minHeight: 48 }}
            className="items-center justify-center px-4 active:opacity-70"
          >
            <AppText weight="semibold" className="underline">
              {t.cancelar}
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
