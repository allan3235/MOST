import { View } from 'react-native';

import { AppText } from '@/comun/presentacion/ui/app-text';
import { BackButton } from '@/comun/presentacion/ui/back-button';
import { Screen } from '@/comun/presentacion/ui/screen';
import { useSession } from '@/zonas/cuenta/presentacion/session-context';
import { es } from '@/comun/i18n/es';

import { MisPlanes } from '@/zonas/planes/presentacion/componentes/mis-planes';

// «Mis planes» (Perfil → Mis planes; decisión del usuario, Perfil como índice): la lista de planes
// con su detalle y «Crear plan», en su propia pantalla para que Perfil quede corto.

export default function MisPlanesScreen() {
  const { session } = useSession();
  return (
    <Screen scroll contentClassName="gap-6 pt-2 pb-8">
      <View className="-ml-4">
        <BackButton />
      </View>
      <AppText variant="h2" accessibilityRole="header">
        {es.perfil.planes.titulo}
      </AppText>
      <MisPlanes userId={session?.user.id ?? ''} />
    </Screen>
  );
}
