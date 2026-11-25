import { CircleCheck } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText, type TextTone } from '@/comun/presentacion/ui/app-text';
import { es } from '@/comun/i18n/es';
import { useAccionUnica } from '@/comun/presentacion/use-accion-unica';
import type { BorradorPlan, HabitoPlan } from '@/schemas/plan';
import { cardShadow, colors } from '@/comun/tema';

import { textoHorario } from '../domain/plan-format';
import { ListaMicroPasos } from './ListaMicroPasos';

// Tarjeta de un hábito del plan (mockups «Tu plan está listo» y «Sugerencias de hábitos»): fondo
// claro, verificación verde, título, duración con días y hora, la etiqueta de su categoría y los
// enlaces de acción («Editar» y «Quitar», o «Agregar»). Los enlaces dicen su acción con texto.
// most.: si el hábito trae micro-pasos, se ve su secuencia antes de confirmar el plan (RF-03).

export type AccionTarjeta = {
  label: string;
  tone: Extract<TextTone, 'acento' | 'peligro' | 'confirmar'>;
  accessibilityLabel: string;
  onPress: () => void;
};

export type PlanHabitCardProps = {
  habito: HabitoPlan;
  ventana: BorradorPlan['ventana_flexible'];
  acciones: AccionTarjeta[];
  /** Línea gris bajo la descripción (p. ej. «Este empieza un poco más retador»). */
  nota?: string;
};

/** Un enlace de acción de la tarjeta; un toque doble rápido no lo manda dos veces. */
function EnlaceAccion({ accion }: { accion: AccionTarjeta }) {
  const unaVez = useAccionUnica(accion.onPress);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accion.accessibilityLabel}
      onPress={unaVez}
      className="min-h-12 justify-center px-2 active:opacity-60"
    >
      <AppText variant="small" weight="bold" tone={accion.tone}>
        {accion.label}
      </AppText>
    </Pressable>
  );
}

export function PlanHabitCard({ habito, ventana, acciones, nota }: PlanHabitCardProps) {
  const t = es.onboarding.revision;

  return (
    <View style={cardShadow} className="gap-2 rounded-card bg-campo px-4 pb-1 pt-4">
      <View className="flex-row items-start gap-2">
        <CircleCheck size={24} color={colors.campo} fill={colors.confirmar} strokeWidth={2.5} />
        <AppText weight="bold" className="flex-1">
          {habito.titulo}
        </AppText>
      </View>
      {habito.descripcion ? <AppText variant="small">{habito.descripcion}</AppText> : null}
      {nota ? (
        <AppText variant="small" weight="semibold" tone="ink-soft">
          {nota}
        </AppText>
      ) : null}
      <AppText variant="small" tone="ink-soft">
        {textoHorario(habito, ventana, t)}
      </AppText>
      {habito.micro_pasos && habito.micro_pasos.length > 0 ? (
        <View className="border-t border-divisor pt-2">
          <ListaMicroPasos pasos={habito.micro_pasos} pasoActual={habito.paso_actual} />
        </View>
      ) : null}

      <View className="flex-row items-center justify-between gap-2">
        <View className="rounded-field bg-accent-claro px-3 py-1">
          <AppText variant="small" weight="semibold">
            {es.onboarding.formulario.areas[habito.categoria]}
          </AppText>
        </View>
        <View className="flex-row">
          {acciones.map((accion) => (
            <EnlaceAccion key={accion.label} accion={accion} />
          ))}
        </View>
      </View>
    </View>
  );
}
