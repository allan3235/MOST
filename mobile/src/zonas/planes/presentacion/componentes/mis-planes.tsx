import { ChevronRight } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '@/comun/presentacion/ui/app-text';
import { leerMisPlanes } from '@/zonas/planes/logica/servicioPlanes';
import { useLocalQuery } from '@/comun/presentacion/use-local-query';
import { ICONO_CATEGORIA } from '@/zonas/habitos/presentacion/categoria-icono';
import { es, formatear } from '@/comun/i18n/es';
import { useAccionUnica } from '@/comun/presentacion/use-accion-unica';
import { cardShadow, colors, tintes } from '@/comun/tema';
import { navegar } from '@/comun/presentacion/navegar';

// «Mis planes» en Perfil (varios planes por usuario, decisión del usuario): un plan por área, con
// sus hábitos. Tocar un plan abre su detalle (donde también se termina). Ya no se crean planes
// desde aquí (decisión del usuario): los hábitos nuevos se crean desde Hábitos, con micro-pasos o
// a su manera.

export type MisPlanesProps = {
  userId: string;
};

export function MisPlanes({ userId }: MisPlanesProps) {
  const t = es.perfil.planes;
  const areas = es.onboarding.formulario.areas;
  const planes = useLocalQuery(`mis-planes-${userId}`, () => leerMisPlanes(userId));

  const lista = planes.data ?? [];
  // Un toque doble rápido no abre el detalle dos veces.
  const abrirPlan = useAccionUnica((id: string) =>
    navegar.push({ pathname: '/detalle-plan/[id]', params: { id } }),
  );
  if (planes.cargando && !planes.data) {
    return <ActivityIndicator color={colors.ink} accessibilityLabel={es.comun.cargando} />;
  }

  return (
    <View className="gap-3">
      {lista.length === 0 ? <AppText tone="ink-soft">{t.vacio}</AppText> : null}

      {lista.map((plan) => {
        const Icono = ICONO_CATEGORIA[plan.area];
        const habitos = plan.habitos.map((h) =>
          h.activo ? h.titulo : formatear(t.enPausa, { titulo: h.titulo }),
        );
        return (
          <Pressable
            key={plan.id}
            accessibilityRole="button"
            accessibilityLabel={[
              formatear(t.verPlan, { area: areas[plan.area] }),
              habitos.length > 0 ? habitos.join(', ') : t.sinHabitos,
            ].join('. ')}
            onPress={() => abrirPlan(plan.id)}
            style={cardShadow}
            className="gap-3 rounded-card bg-campo p-4 active:bg-accent-claro"
          >
            <View className="flex-row items-center gap-3">
              <View
                style={{ backgroundColor: tintes[plan.area] }}
                className="h-10 w-10 items-center justify-center rounded-field"
              >
                <Icono size={22} color={colors.ink} />
              </View>
              {/* Solo el área: la pantalla ya se llama «Mis planes» (critique de Impeccable). */}
              <AppText weight="bold" className="flex-1">
                {areas[plan.area]}
              </AppText>
              <ChevronRight size={22} color={colors.ink} />
            </View>
            <AppText variant="small" tone="ink-soft">
              {habitos.length > 0 ? habitos.join(' · ') : t.sinHabitos}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
