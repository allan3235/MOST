/**
 * @file PantallaEnfoque.tsx
 * @proyecto most.
 * @descripcion Modo enfoque (RF-14, CP-15/16): elegir 15, 25 o 45 min y empezar; mientras dura se
 *   ve el contador y la guía para silenciar el teléfono a mano (Android: abre los ajustes de No
 *   Molestar; iOS: solo instrucciones, la app no intenta activarlo). Al terminar o cancelar, los
 *   avisos de most. vuelven solos y se recuerda quitar No Molestar.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/comun/presentacion/ui/app-text';
import { BackButton } from '@/comun/presentacion/ui/back-button';
import { Button } from '@/comun/presentacion/ui/button';
import { Card } from '@/comun/presentacion/ui/card';
import { OptionChip } from '@/comun/presentacion/ui/option-chip';
import { Screen } from '@/comun/presentacion/ui/screen';
import { Snackbar } from '@/comun/presentacion/ui/snackbar';
import { useLocalQuery } from '@/comun/presentacion/use-local-query';
import { useSession } from '@/zonas/cuenta/presentacion/session-context';

import { es, formatear } from '@/comun/i18n/es';

import {
  DURACIONES_ENFOQUE,
  estaEnEnfoque,
  finDeEnfoque,
  textoRestante,
} from '@/zonas/enfoque/logica/enfoque';
import {
  abrirGuiaNoMolestar,
  esAndroid,
  estadoNoMolestarActual,
  iniciarEnfoque,
  leerFinEnfoque,
  olvidarSesionVencida,
  pedirPermisoNoMolestar,
  restaurarTrasEnfoque,
  terminarEnfoque,
} from '../logica/servicioEnfoque';

// ===== Constantes =====

const MS_TICK = 1000;
const DURACION_POR_DEFECTO = 25;
const DIGITOS = 2;

// ===== Funciones auxiliares =====

function horaDe(fecha: Date): string {
  return `${String(fecha.getHours()).padStart(DIGITOS, '0')}:${String(fecha.getMinutes()).padStart(DIGITOS, '0')}`;
}

// ===== Principal =====

/**
 * Pantalla del modo enfoque.
 * @returns La pantalla.
 */
export default function PantallaEnfoque() {
  const t = es.enfoque;
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const guardado = useLocalQuery(`enfoque-${userId}`, () => leerFinEnfoque(userId));
  const [minutos, setMinutos] = useState(DURACION_POR_DEFECTO);
  const [ahora, setAhora] = useState(() => new Date());
  const [terminadaAMano, setTerminadaAMano] = useState(false);
  // CP-15/16: con permiso en Android lo activa solo; si no, guía a hacerlo a mano.
  const noMolestar = estadoNoMolestarActual();
  /**
   * Lo que se acaba de decidir, antes de que SQLite lo confirme: la pantalla cambia al momento
   * (RNF-01, ≤ 1.5 s). undefined = usar lo guardado.
   */
  const [optimista, setOptimista] = useState<Date | null | undefined>(undefined);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(false);

  const hasta = optimista !== undefined ? optimista : (guardado.data ?? null);
  const activo = estaEnEnfoque(hasta, ahora);

  // El contador avanza cada segundo mientras hay sesión.
  useEffect(() => {
    if (!hasta) {
      return;
    }
    const intervalo = setInterval(() => setAhora(new Date()), MS_TICK);
    return () => clearInterval(intervalo);
  }, [hasta]);

  // Al acabarse el tiempo no hay que hacer nada: los avisos de después ya estaban programados y el
  // de cierre llega solo. La sesión guardada se borra al empezar otra.
  const expirada = hasta !== null && !activo;

  useEffect(() => {
    if (expirada) {
      restaurarTrasEnfoque(userId).catch((causa: unknown) => {
        console.warn('No se pudo restaurar No Molestar', causa);
      });
    }
  }, [expirada, userId]);

  const accion = async (tarea: () => Promise<unknown>) => {
    setOcupado(true);
    setError(false);
    try {
      await tarea();
    } catch {
      setError(true);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <>
      <Screen scroll contentClassName="gap-6 pt-2 pb-8">
        <View className="-ml-4">
          <BackButton />
        </View>
        <AppText variant="h2" accessibilityRole="header">
          {t.titulo}
        </AppText>

        {activo && hasta ? (
          <>
            <Card className="items-center gap-2">
              <AppText variant="small" tone="ink-soft">
                {t.enCurso}
              </AppText>
              <AppText
                variant="h1"
                accessibilityRole="timer"
                accessibilityLabel={formatear(t.contadorA11y, {
                  tiempo: textoRestante(hasta, ahora),
                })}
              >
                {textoRestante(hasta, ahora)}
              </AppText>
              <AppText className="text-center" tone="ink-soft">
                {formatear(t.hasta, { hora: horaDe(hasta) })}
              </AppText>
            </Card>
            <Card className="gap-3">
              <AppText weight="bold" accessibilityRole="header">
                {t.silenciaTitulo}
              </AppText>
              {noMolestar === 'activado' ? (
                <AppText tone="ink-soft">{t.silenciaAuto}</AppText>
              ) : esAndroid() ? (
                <>
                  <AppText tone="ink-soft">{t.silenciaAndroid}</AppText>
                  <Button
                    variant="secondary"
                    label={t.abrirNoMolestar}
                    onPress={() => void abrirGuiaNoMolestar()}
                  />
                  {noMolestar === 'sin_permiso' ? (
                    <Button
                      variant="tertiary"
                      label={t.darPermiso}
                      onPress={pedirPermisoNoMolestar}
                    />
                  ) : null}
                </>
              ) : (
                <AppText tone="ink-soft">{t.silenciaIos}</AppText>
              )}
            </Card>
            <Button
              variant="secondary"
              label={t.terminar}
              disabled={ocupado}
              onPress={() =>
                void accion(async () => {
                  setOptimista(null);
                  setTerminadaAMano(true);
                  await terminarEnfoque(userId);
                })
              }
            />
          </>
        ) : terminadaAMano || expirada ? (
          <Card className="gap-3">
            <AppText variant="h3" accessibilityRole="header">
              {t.terminadaTitulo}
            </AppText>
            <AppText tone="ink-soft">{t.terminadaTexto}</AppText>
            {/* Si most. lo activó, ya lo regresó solo: no hay nada que quitar a mano. */}
            {esAndroid() && noMolestar !== 'activado' ? (
              <AppText tone="ink-soft">{t.recordatorioQuitar}</AppText>
            ) : null}
            <Button
              label={t.otraSesion}
              onPress={() =>
                void accion(async () => {
                  const habiaExpirado = expirada;
                  setOptimista(null);
                  setTerminadaAMano(false);
                  if (habiaExpirado) {
                    await olvidarSesionVencida(userId);
                  }
                })
              }
            />
          </Card>
        ) : (
          <>
            <AppText tone="ink-soft">{t.explicacion}</AppText>
            <View className="gap-2" accessibilityRole="radiogroup">
              <AppText weight="bold">{t.duracion}</AppText>
              {DURACIONES_ENFOQUE.map((n) => (
                <OptionChip
                  key={n}
                  label={formatear(t.minutos, { n })}
                  selected={minutos === n}
                  onPress={() => setMinutos(n)}
                />
              ))}
            </View>
            <Button
              label={t.empezar}
              loading={ocupado}
              onPress={() =>
                void accion(async () => {
                  // El reloj y el fin se toman antes de guardar: el contador nunca marca más de lo
                  // elegido y la pantalla cambia al momento.
                  const inicio = new Date();
                  const fin = finDeEnfoque(inicio, minutos);
                  setAhora(inicio);
                  setOptimista(fin);
                  await iniciarEnfoque(userId, fin);
                })
              }
            />
          </>
        )}
      </Screen>
      <Snackbar mensaje={error ? t.error : null} variant="error" onCerrar={() => setError(false)} />
    </>
  );
}
