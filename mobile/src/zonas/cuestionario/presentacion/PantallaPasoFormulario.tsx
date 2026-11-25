import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Alert } from '@/comun/presentacion/ui/alert';
import { AppText } from '@/comun/presentacion/ui/app-text';
import { BackButton } from '@/comun/presentacion/ui/back-button';
import { Button } from '@/comun/presentacion/ui/button';
import { ProgressSteps } from '@/comun/presentacion/ui/progress-steps';
import { Screen } from '@/comun/presentacion/ui/screen';
import { useSession } from '@/zonas/cuenta/presentacion/session-context';
import { FormQuestion } from '@/zonas/cuestionario/presentacion/componentes/form-question';
import {
  campoDelPaso,
  leerPaso,
  pasoCompleto,
  perfilCompleto,
  totalPasos,
} from '@/zonas/cuestionario/logica/form-rules';
import { useOnboardingStore } from '@/zonas/cuestionario/logica/onboarding-store';
import { guardarPerfil } from '@/zonas/cuestionario/logica/servicioCuestionario';
import { useRutasPlan } from '@/zonas/planes/presentacion/use-rutas-plan';
import { es } from '@/comun/i18n/es';
import { navegar } from '@/comun/presentacion/navegar';

// Formulario (SDD 5.1): una pregunta por pantalla. Cada paso es una entrada de la pila de
// navegación, así que «atrás» regresa al paso anterior y las respuestas siguen en el almacén. En la
// bienvenida, el paso visible se guarda para volver a él si se cierra la app.
// La encuesta inicial (flujo «perfil», UC-01) solo pregunta datos generales y al final los guarda:
// no crea hábitos. En la bienvenida lleva después a crear el primer hábito; desde «Crear meta»
// regresa ahí. Un plan del catálogo (Perfil → Mis planes) pregunta área y objetivos y sigue a la
// generación del plan.

export default function FormularioPasoScreen() {
  const t = es.onboarding.formulario;
  const rutas = useRutasPlan();
  const { session, chooseMode } = useSession();
  const flujo = useOnboardingStore((s) => s.flujo);
  const total = totalPasos(flujo);
  const paso = leerPaso(useLocalSearchParams<{ paso: string }>().paso, total);
  const campo = campoDelPaso(flujo, paso);
  const borrador = useOnboardingStore((s) => s.borrador);
  const marcarRetomar = useOnboardingStore((s) => s.marcarRetomar);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (!rutas.enApp) marcarRetomar({ pantalla: 'formulario', paso });
    }, [marcarRetomar, paso, rutas.enApp]),
  );

  const pregunta =
    campo === 'areas' && flujo === 'plan' ? t.preguntas.areasNuevoPlan : t.preguntas[campo];
  const esUltimo = paso === total;
  const soloPerfil = flujo === 'perfil';

  const terminarPerfil = async () => {
    const perfil = perfilCompleto(borrador);
    if (session === null || perfil === null) return;
    setGuardando(true);
    setError(false);
    try {
      await guardarPerfil(session.user.id, perfil);
      const store = useOnboardingStore.getState();
      store.reiniciar();
      if (rutas.enApp) {
        // Vuelve a «Crear meta», que ya encuentra el perfil.
        navegar.dismissTo('/crear-meta');
        return;
      }
      // Marca el onboarding como completo: el layout lleva a Hoy y Hoy abre «Crear meta».
      store.pedirPrimerHabito(true);
      await chooseMode('guiado');
    } catch {
      setError(true);
      setGuardando(false);
    }
  };

  const continuar = () => {
    if (!esUltimo) {
      navegar.push(rutas.paso(paso + 1));
    } else if (soloPerfil) {
      void terminarPerfil();
    } else {
      navegar.push(rutas.generando);
    }
  };

  // Arriba (flecha y avance) y abajo («Siguiente») quedan fijos; solo se desplaza la pregunta
  // (SDD 9.4, decisión del usuario).
  return (
    <Screen contentClassName="gap-4 pt-2 pb-6">
      <View className="flex-row items-center gap-4">
        <View className="-ml-4">
          <BackButton />
        </View>
        <View className="flex-1">
          <ProgressSteps current={paso} total={total} />
        </View>
      </View>

      {/* Márgenes negativos: la sombra de las opciones no se corta en los bordes de la lista. */}
      <ScrollView
        className="-mx-8 flex-1"
        contentContainerClassName="gap-6 px-8 pb-4 pt-2"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <AppText variant="h2" accessibilityRole="header" className="text-center">
            {pregunta.titulo}
          </AppText>
          <AppText variant="small" tone="ink-soft" className="text-center">
            {pregunta.ayuda}
          </AppText>
        </View>

        <FormQuestion campo={campo} />
      </ScrollView>

      {error ? <Alert variant="error" message={t.errorPerfil} /> : null}
      <Button
        label={esUltimo ? (soloPerfil ? t.guardarPerfil : t.crearPlan) : t.continuar}
        disabled={!pasoCompleto(campo, borrador)}
        loading={guardando}
        onPress={continuar}
      />
    </Screen>
  );
}
