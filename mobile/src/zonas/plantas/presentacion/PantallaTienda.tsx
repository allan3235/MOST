import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, useWindowDimensions, View } from 'react-native';

import { Alert, type AlertVariant } from '@/comun/presentacion/ui/alert';
import { AppText } from '@/comun/presentacion/ui/app-text';
import { BackButton } from '@/comun/presentacion/ui/back-button';
import { Button } from '@/comun/presentacion/ui/button';
import { Screen } from '@/comun/presentacion/ui/screen';
import { avisarCambioLocal } from '@/comun/logica/cambios-locales';
import { comprarAccesorio, equiparDesdeTienda, leerMiJardin } from '../logica/servicioPlantas';
import { useLocalQuery } from '@/comun/presentacion/use-local-query';
import { useSession } from '@/zonas/cuenta/presentacion/session-context';
import { AccessoryCard } from '@/zonas/plantas/presentacion/componentes/accessory-card';
import { CoinBalance } from '@/zonas/plantas/presentacion/componentes/coin-balance';
import { PurchaseSheet } from '@/zonas/plantas/presentacion/componentes/purchase-sheet';
import type { TipoAccesorio } from '@/zonas/plantas/logica/equipar';
import { es } from '@/comun/i18n/es';
import { AREAS, type Area } from '@/comun/modelo/esquemas/onboarding';
import { colors } from '@/comun/tema';
import { navegar } from '@/comun/presentacion/navegar';

// Tienda (SDD 6.4 y 9.4, mockups «Tienda #1–#3»): los 15 accesorios con su precio. Regresar, título
// y monedero quedan fijos y solo se desplaza la lista. Tocar un objeto abre la hoja de compra.
// Comprar necesita conexión, porque el servidor revisa el saldo real. «Equipar ahora» lleva a
// Detalles → Objetos con el objeto ya puesto.

const TIPOS: TipoAccesorio[] = ['sombrero', 'lentes', 'maceta'];

// Los márgenes de la lista (`px-8`): en NativeWind, 1rem son 14 dp.
const MARGEN_LISTA = 56;
const SEPARACION = 12;
// Con letra grande, 3 columnas cortarían los nombres.
const ESCALA_DOS_COLUMNAS = 1.5;

type Aviso = { tipo: AlertVariant; texto: string };

export default function TiendaScreen() {
  const t = es.tienda;
  const { desde } = useLocalSearchParams<{ desde?: string }>();
  const origen = (AREAS as readonly string[]).includes(desde ?? '') ? (desde as Area) : null;
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const tienda = useLocalQuery(`jardin-${userId}`, () => leerMiJardin(userId));
  const { width, fontScale } = useWindowDimensions();
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  /** Saldo justo después de comprar: vale aunque la compra aún no llegue al teléfono. */
  const [saldoTrasCompra, setSaldoTrasCompra] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const saldo = tienda.data?.saldo ?? 0;
  const elegido = tienda.data?.accesorios.find((a) => a.id === elegidoId) ?? null;
  const columnas = fontScale >= ESCALA_DOS_COLUMNAS ? 2 : 3;
  const anchoTarjeta = Math.floor((width - MARGEN_LISTA - SEPARACION * (columnas - 1)) / columnas);

  const cerrar = () => {
    setElegidoId(null);
    setSaldoTrasCompra(null);
    setAviso(null);
  };

  const comprar = async () => {
    if (!elegido) return;
    setOcupado(true);
    setAviso(null);
    const resultado = await comprarAccesorio(elegido.id);
    setOcupado(false);
    if (resultado === 'comprado') setSaldoTrasCompra(saldo - elegido.precio);
    else if (resultado === 'sin_conexion') setAviso({ tipo: 'info', texto: t.sinConexion });
    else setAviso({ tipo: 'error', texto: t.errorComprar });
  };

  const equipar = async () => {
    if (!elegido) return;
    setOcupado(true);
    setAviso(null);
    try {
      const destino = await equiparDesdeTienda(userId, elegido.id, origen);
      if (destino === null) {
        setAviso({ tipo: 'info', texto: t.noLlega });
        return;
      }
      const ruta = {
        pathname: '/planta/[categoria]',
        params: {
          categoria: destino.area,
          pestana: 'objetos',
          tipo: destino.tipo,
          // Para el aviso «Le pusimos … en lugar de …» si reemplazó a otro objeto.
          ...(destino.quitado ? { puesto: destino.puesto, quitado: destino.quitado } : {}),
          // Distingue cada llegada, aunque se repitan la pestaña y el tipo.
          llegada: String(Date.now()),
        },
      } as const;
      cerrar();
      // Desde Detalles se regresa a esa pantalla; desde Jardín, «atrás» debe volver a Jardín.
      if (origen) navegar.dismissTo(ruta);
      else navegar.replace(ruta);
    } catch {
      setAviso({ tipo: 'error', texto: t.errorEquipar });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Screen contentClassName="gap-4 pt-2">
      <View className="flex-row items-center gap-4">
        <View className="-ml-4">
          <BackButton />
        </View>
        <AppText variant="h2" className="flex-1">
          {t.titulo}
        </AppText>
        <CoinBalance saldo={saldo} />
      </View>

      {/* Márgenes negativos: la sombra de las tarjetas no se corta en los bordes de la lista. */}
      <ScrollView
        className="-mx-8 flex-1"
        contentContainerClassName="gap-6 px-8 pb-6 pt-1"
        keyboardShouldPersistTaps="handled"
      >
        {tienda.cargando && !tienda.data ? (
          <ActivityIndicator color={colors.ink} accessibilityLabel={es.comun.cargando} />
        ) : tienda.error && !tienda.data ? (
          <View className="gap-4">
            <Alert variant="error" message={t.error} />
            <Button variant="secondary" label={es.comun.reintentar} onPress={avisarCambioLocal} />
          </View>
        ) : tienda.data ? (
          TIPOS.map((tipo) => (
            <View key={tipo} className="gap-3">
              <AppText variant="h3" accessibilityRole="header">
                {t.tipos[tipo]}
              </AppText>
              <View style={{ gap: SEPARACION }} className="flex-row flex-wrap">
                {tienda.data?.accesorios
                  .filter((a) => a.tipo === tipo)
                  .map((a) => (
                    <View key={a.id} style={{ width: anchoTarjeta }}>
                      <AccessoryCard
                        accesorio={a}
                        saldo={saldo}
                        onPress={() => {
                          setAviso(null);
                          setElegidoId(a.id);
                        }}
                      />
                    </View>
                  ))}
              </View>
            </View>
          ))
        ) : null}
      </ScrollView>

      {elegido ? (
        <PurchaseSheet
          accesorio={elegido}
          saldo={saldoTrasCompra ?? saldo}
          recienComprado={saldoTrasCompra !== null}
          ocupado={ocupado}
          aviso={aviso}
          onComprar={() => void comprar()}
          onEquipar={() => void equipar()}
          onCerrar={cerrar}
        />
      ) : null}
    </Screen>
  );
}
