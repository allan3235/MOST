import { Image } from 'expo-image';
import { useNavigation } from 'expo-router';
import { CommonActions } from 'expo-router/react-navigation';
import { useEffect } from 'react';
import { Alert as AlertNativo, View } from 'react-native';

import { AppText } from '@/comun/presentacion/ui/app-text';
import { BackButton } from '@/comun/presentacion/ui/back-button';
import { Button } from '@/comun/presentacion/ui/button';
import { Screen } from '@/comun/presentacion/ui/screen';
import { useSession } from '@/zonas/cuenta/presentacion/session-context';
import { pilaParaRetomar } from '@/zonas/cuestionario/logica/retomar';
import { useOnboardingStore } from '@/zonas/cuestionario/logica/onboarding-store';
import { usePlanReviewStore } from '@/zonas/planes/logica/plan-review-store';
import { es } from '@/comun/i18n/es';
import { navegar } from '@/comun/presentacion/navegar';

// UC-01: «Empezar» lleva directo a la encuesta de 7 preguntas (ya no hay elección de modo): sin
// perfil no se pueden armar micro-pasos a la medida. Una cuenta que entró antes sin encuesta
// (modo «tradicional») ve un texto propio y conserva sus hábitos.
//
// Pantalla «Empezar» del mockup: se ve justo después de confirmar la cuenta. La sesión ya está
// iniciada, así que la flecha atrás pregunta si quiere salir de la cuenta y, al confirmar, cierra
// sesión: el layout raíz lleva entonces a la bienvenida. Si la app se cerró a mitad del formulario
// o de la revisión del plan, al abrirla se vuelve ahí.
// Solo se retoma cuando Empezar es la única pantalla de la pila, es decir, al abrir la app: después
// del salto queda debajo de las demás, y al volver a ella desde «Elegir modo» ya no hay a dónde
// retomar (esa pantalla lo borra). No se usa una variable de «ya se retomó», porque si Android
// conserva el proceso al cerrar la app desde Recientes, seguiría marcada y no se retomaría.

export default function EmpezarScreen() {
  const t = es.onboarding.empezar;
  const { signOut, session, profile } = useSession();
  const sinEncuesta = profile?.modo === 'tradicional';
  const navigation = useNavigation();

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (userId === null) return;
    // Se espera un cuadro para que la navegación termine de montarse antes del salto.
    const cuadro = requestAnimationFrame(() => {
      const actual = navigation.getState();
      if (actual?.routes.length !== 1) return;
      const { userId: dueno, retomar } = useOnboardingStore.getState();
      if (retomar === null || dueno !== userId) return;
      const rutas = pilaParaRetomar(retomar);
      // Expo Router solo acepta un reinicio con el estado completo de la pila: se copia el actual
      // (su clave, sus pantallas posibles y su contador) y solo se cambian las pantallas abiertas.
      // Las rutas nuevas reciben su clave al aplicarse.
      navigation.dispatch(
        CommonActions.reset({ ...actual, stale: false, index: rutas.length - 1, routes: rutas }),
      );
    });
    return () => cancelAnimationFrame(cuadro);
  }, [navigation, userId]);

  const empezarEncuesta = () => {
    if (session) {
      // Un plan en revisión de otra cuenta no se retoma; las respuestas de esta misma, sí.
      if (useOnboardingStore.getState().userId !== session.user.id) {
        usePlanReviewStore.getState().limpiar();
      }
      useOnboardingStore.getState().prepararPara(session.user.id);
    }
    navegar.push({ pathname: '/formulario/[paso]', params: { paso: '1' } });
  };

  const salir = () =>
    AlertNativo.alert(t.salirTitulo, t.salirMensaje, [
      { text: t.cancelar, style: 'cancel' },
      { text: t.salir, style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <Screen scroll contentClassName="justify-between pt-2">
      <View className="-ml-4 self-start">
        <BackButton onPress={salir} />
      </View>
      <View className="items-center gap-6">
        <Image
          source={require('../../../../assets/illustrations/empezar.png')}
          accessibilityLabel={t.ilustracion}
          contentFit="contain"
          style={{ width: '100%', aspectRatio: 1776 / 1354 }}
        />
        <AppText variant="h1" weight="semibold" className="text-center">
          {sinEncuesta ? t.tituloPerfil : t.titulo}
        </AppText>
        <AppText variant="body" className="text-center">
          {sinEncuesta ? t.descripcionPerfil : t.descripcion}
        </AppText>
      </View>

      <Button
        label={sinEncuesta ? t.botonPerfil : t.boton}
        onPress={empezarEncuesta}
        className="mt-10"
      />
    </Screen>
  );
}
