import { Plus, Sparkles } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { ActionSquare } from '@/comun/presentacion/ui/action-square';
import { Alert } from '@/comun/presentacion/ui/alert';
import { AppText } from '@/comun/presentacion/ui/app-text';
import { Button } from '@/comun/presentacion/ui/button';
import { Screen } from '@/comun/presentacion/ui/screen';
import { avisarCambioLocal } from '@/comun/logica/cambios-locales';
import { leerHabitos } from '@/zonas/habitos/logica/servicioHabitos';
import { useLocalQuery } from '@/comun/presentacion/use-local-query';
import { useSession } from '@/zonas/cuenta/presentacion/session-context';
import { ICONO_CATEGORIA } from './categoria-icono';
import { HabitCheckCard } from '@/zonas/habitos/presentacion/componentes/habit-check-card';
import { useAgregarHabito } from './use-agregar-habito';
import { useHabitActions } from './use-habit-actions';
import { es } from '@/comun/i18n/es';
import { AREAS } from '@/comun/modelo/esquemas/onboarding';
import { colors, tintes } from '@/comun/tema';

// Hábitos (SDD 9.4 y mockup «Hábitos #1»): una sección por categoría que tenga hábitos, con
// casilla para marcar los que tocan hoy y el menú ⋮ (editar, pausar o reanudar, eliminar). El
// título y el botón «+», única acción principal, quedan fijos y solo se desplaza la lista. Sin
// filtros por ahora (decisión del usuario).

export default function HabitosScreen() {
  const t = es.habitos;
  const areas = es.onboarding.formulario.areas;
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const habitos = useLocalQuery('habitos', leerHabitos);
  const acciones = useHabitActions(userId);
  const agregar = useAgregarHabito();

  const lista = habitos.data ?? [];
  const secciones = AREAS.map((area) => ({
    area,
    items: lista.filter((h) => h.categoria === area),
  })).filter((s) => s.items.length > 0);

  return (
    <>
      <Screen edges={['top']} contentClassName="gap-4 pt-6">
        <View className="flex-row items-center justify-between">
          <AppText variant="h1">{es.tabs.habitos}</AppText>
          <ActionSquare label={t.agregar} icon={Plus} onPress={() => void agregar.abrir()} />
        </View>

        {/* RF-03: escribir una meta y que la IA la divida en micro-pasos. */}
        <Button
          variant="secondary"
          label={es.crearMeta.abrir}
          icon={<Sparkles size={20} color={colors.ink} />}
          onPress={() => void agregar.abrirMeta()}
        />

        {/* Márgenes negativos: la sombra de las tarjetas no se corta en los bordes de la lista. */}
        <ScrollView
          className="-mx-8 flex-1"
          contentContainerClassName="gap-6 px-8 pb-6 pt-1"
          keyboardShouldPersistTaps="handled"
        >
          {habitos.cargando && !habitos.data ? (
            <ActivityIndicator color={colors.ink} accessibilityLabel={es.comun.cargando} />
          ) : habitos.error && !habitos.data ? (
            <View className="gap-4">
              <Alert variant="error" message={t.error} />
              <Button variant="secondary" label={es.comun.reintentar} onPress={avisarCambioLocal} />
            </View>
          ) : lista.length === 0 ? (
            <AppText tone="ink-soft" className="text-center">
              {t.vacio}
            </AppText>
          ) : (
            secciones.map(({ area, items }) => {
              const Icono = ICONO_CATEGORIA[area];
              return (
                <View key={area} className="gap-3">
                  <View className="flex-row items-center gap-2" accessibilityRole="header">
                    <View
                      style={{ backgroundColor: tintes[area] }}
                      className="h-9 w-9 items-center justify-center rounded-field"
                    >
                      <Icono size={20} color={colors.ink} />
                    </View>
                    <AppText variant="h3">{areas[area]}</AppText>
                  </View>
                  {items.map((item) => (
                    <HabitCheckCard key={item.habito.id} {...acciones.propsTarjeta(item)} />
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>

        {acciones.capas}
      </Screen>

      {acciones.aviso}
      {agregar.dialogo}
    </>
  );
}
