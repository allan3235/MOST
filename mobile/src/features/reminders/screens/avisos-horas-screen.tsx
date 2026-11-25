import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';

import { Alert } from '@/comun/presentacion/ui/alert';
import { AppText } from '@/comun/presentacion/ui/app-text';
import { BackButton } from '@/comun/presentacion/ui/back-button';
import { Button } from '@/comun/presentacion/ui/button';
import { Screen } from '@/comun/presentacion/ui/screen';
import { SettingsRow } from '@/comun/presentacion/ui/settings-row';
import { SwitchRow } from '@/comun/presentacion/ui/switch-row';
import { Snackbar } from '@/comun/presentacion/ui/snackbar';
import { guardarSonidoLogros, leerSonidoLogros } from '@/zonas/plantas/logica/servicioPlantas';
import { guardarAjustes, leerAjustesPerfil, type CambiosAjustes } from '@/db/settings-repository';
import { useLocalQuery } from '@/comun/presentacion/use-local-query';
import { useSession } from '@/features/auth/session-context';
import { SecondNoticeToggle } from '@/features/plan/components/second-notice-toggle';
import { fechaDesdeHora, horaDesdeFecha } from '@/features/plan/domain/plan-review';
import { es } from '@/comun/i18n/es';
import { cardShadow, colors } from '@/comun/tema';

import { StyleDialog } from '../components/style-dialog';
import type { MomentoAviso } from '../domain/planificar-avisos';
import { useAvisosActivos } from '../use-avisos-activos';

// «Avisos y horas» (Perfil → Avisos y horas; decisión del usuario, Perfil como índice): el estilo
// de avisos, el resumen nocturno (RF-18), el segundo aviso y las horas por momento. Cada cambio se guarda al momento en el
// teléfono y se sube con la cola (funciona sin conexión) y los avisos se recalculan solos. Las
// horas son las generales: cada hábito conserva la suya.

const MOMENTOS: Exclude<MomentoAviso, 'resumen_nocturno'>[] = [
  'manana',
  'mediodia',
  'tarde',
  'noche',
];

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <AppText variant="h3" accessibilityRole="header">
        {titulo}
      </AppText>
      {children}
    </View>
  );
}

function Grupo({ children }: { children: ReactNode }) {
  return (
    <View style={cardShadow} className="overflow-hidden rounded-card bg-campo">
      {children}
    </View>
  );
}

export default function AvisosHorasScreen() {
  const t = es.perfil;
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const perfil = useLocalQuery(`perfil-${userId}`, () => leerAjustesPerfil(userId));
  const sonido = useLocalQuery(`sonido-hitos-${userId}`, () => leerSonidoLogros(userId));
  const avisosActivos = useAvisosActivos();
  const [eligiendoEstilo, setEligiendoEstilo] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState(false);
  const ajustes = perfil.data?.ajustes ?? null;
  // La hora del resumen aparece con su estilo o con el interruptor encendido (RF-18).
  const conResumen = ajustes?.estilo === 'resumen_nocturno' || ajustes?.resumenNocturno === true;

  const guardar = (cambios: CambiosAjustes) => {
    setErrorGuardar(false);
    guardarAjustes(userId, cambios).catch(() => setErrorGuardar(true));
  };

  const elegirHora = (momento: MomentoAviso) => {
    if (!ajustes) return;
    DateTimePickerAndroid.open({
      value: fechaDesdeHora(ajustes.horas[momento]),
      mode: 'time',
      is24Hour: true,
      onValueChange: (_evento, fecha) =>
        guardar({ horas_por_momento: { ...ajustes.horas, [momento]: horaDesdeFecha(fecha) } }),
    });
  };

  return (
    <>
      <Screen scroll contentClassName="gap-6 pt-2 pb-8">
        <View className="-ml-4">
          <BackButton />
        </View>
        <AppText variant="h2" accessibilityRole="header">
          {t.indice.avisosHoras}
        </AppText>

        {perfil.cargando && !perfil.data ? (
          <ActivityIndicator color={colors.ink} accessibilityLabel={es.comun.cargando} />
        ) : ajustes === null ? (
          <Alert variant="info" message={t.sinAjustes} />
        ) : (
          <>
            <Seccion titulo={t.avisos}>
              {avisosActivos ? null : (
                <View className="gap-2">
                  <Alert variant="advertencia" message={t.avisosApagados} />
                  <Button
                    variant="secondary"
                    label={t.abrirAjustes}
                    onPress={() => void Linking.openSettings()}
                  />
                </View>
              )}
              <Grupo>
                <SettingsRow
                  label={t.estilo}
                  value={t.estilos[ajustes.estilo]}
                  onPress={() => setEligiendoEstilo(true)}
                />
                {/* RF-18: el resumen nocturno se suma a cualquier estilo. Con su propio estilo
                    ya llega siempre, así que el interruptor no hace falta. */}
                {ajustes.estilo === 'resumen_nocturno' ? null : (
                  <View className="px-4 py-2">
                    <SwitchRow
                      label={t.resumenInterruptor}
                      help={t.resumenInterruptorAyuda}
                      value={ajustes.resumenNocturno}
                      onChange={(activo) => guardar({ resumen_nocturno: activo })}
                    />
                  </View>
                )}
                {/* El segundo aviso solo existe con avisos por hábito (SDD 5.6). */}
                {ajustes.estilo === 'resumen_nocturno' ? null : (
                  <View className="px-4 py-2">
                    <SecondNoticeToggle
                      value={ajustes.segundoAviso}
                      onChange={(activo) => guardar({ segundo_aviso: activo })}
                    />
                  </View>
                )}
              </Grupo>
            </Seccion>

            <Seccion titulo={t.horas}>
              <Grupo>
                {MOMENTOS.map((momento, i) => (
                  <SettingsRow
                    key={momento}
                    label={es.onboarding.formulario.momento[momento]}
                    value={ajustes.horas[momento]}
                    onPress={() => elegirHora(momento)}
                    ultima={i === MOMENTOS.length - 1 && !conResumen}
                  />
                ))}
                {conResumen ? (
                  <SettingsRow
                    label={t.resumen}
                    value={ajustes.horas.resumen_nocturno}
                    onPress={() => elegirHora('resumen_nocturno')}
                    ultima
                  />
                ) : null}
              </Grupo>
              <AppText variant="small" tone="ink-soft">
                {t.horasNota}
              </AppText>
            </Seccion>

            {/* RI-03: el sonido de los hitos (RF-16) es opcional; se guarda en este teléfono. */}
            <Seccion titulo={es.hitos.seccion}>
              <Grupo>
                <View className="px-4 py-2">
                  <SwitchRow
                    label={es.hitos.sonido}
                    help={es.hitos.sonidoAyuda}
                    value={sonido.data ?? true}
                    onChange={(activo) => {
                      guardarSonidoLogros(userId, activo).catch(() => setErrorGuardar(true));
                    }}
                  />
                </View>
              </Grupo>
            </Seccion>
          </>
        )}

        {ajustes && eligiendoEstilo ? (
          <StyleDialog
            valor={ajustes.estilo}
            onElegir={(estilo) => guardar({ estilo_notificaciones: estilo })}
            onCerrar={() => setEligiendoEstilo(false)}
          />
        ) : null}
      </Screen>
      <Snackbar
        mensaje={errorGuardar ? t.errorGuardar : null}
        variant="error"
        onCerrar={() => setErrorGuardar(false)}
      />
    </>
  );
}
