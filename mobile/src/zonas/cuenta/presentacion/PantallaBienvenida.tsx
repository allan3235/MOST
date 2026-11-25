import { Image } from 'expo-image';
import { View } from 'react-native';

import { AppText } from '@/comun/presentacion/ui/app-text';
import { Button } from '@/comun/presentacion/ui/button';
import { Screen } from '@/comun/presentacion/ui/screen';
import { SessionExpiredNotice } from '@/zonas/cuenta/presentacion/componentes/session-expired-notice';
import { es } from '@/comun/i18n/es';
import { navegar } from '@/comun/presentacion/navegar';

// Pantalla «Inicio» del mockup: ilustración, lema y acceso a registro o inicio de sesión. Si la
// sesión caducó sola, lo explica arriba de los botones.

export default function BienvenidaScreen() {
  const t = es.bienvenida;

  return (
    <Screen scroll contentClassName="justify-between pt-12">
      <View className="items-center gap-6">
        <Image
          source={require('../../../../assets/illustrations/bienvenida.png')}
          accessibilityLabel={t.ilustracion}
          contentFit="contain"
          style={{ width: '100%', aspectRatio: 1589 / 1230 }}
        />
        <AppText variant="h1" weight="semibold" className="text-center">
          {t.titulo}
        </AppText>
        <AppText variant="body" className="text-center">
          {t.descripcion}
        </AppText>
      </View>

      <View className="mt-10 gap-2">
        <SessionExpiredNotice />
        <Button label={t.crearCuenta} onPress={() => navegar.push('/registro')} />
        <View className="flex-row flex-wrap items-center justify-center">
          <AppText variant="body">{t.yaTienesCuenta}</AppText>
          <Button
            variant="tertiary"
            label={t.iniciaSesion}
            onPress={() => navegar.push('/login')}
          />
        </View>
      </View>
    </Screen>
  );
}
