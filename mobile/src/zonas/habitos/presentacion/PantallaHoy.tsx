import { Sun } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, useWindowDimensions, View } from 'react-native';

import { Alert } from '@/comun/presentacion/ui/alert';
import { AppText } from '@/comun/presentacion/ui/app-text';
import { Button } from '@/comun/presentacion/ui/button';
import { Screen } from '@/comun/presentacion/ui/screen';
import { Snackbar } from '@/comun/presentacion/ui/snackbar';
import { avisarCambioLocal } from '@/comun/logica/cambios-locales';
import { leerHoy } from '@/zonas/habitos/logica/servicioHabitos';
import { leerSemanaApoyo } from '@/zonas/recordatorios/logica/servicioAvisos';
import { leerMiJardin } from '@/zonas/plantas/logica/servicioPlantas';
import { leerAjustesLocales } from '@/zonas/cuenta/logica/servicioAjustes';
import { useLocalQuery } from '@/comun/presentacion/use-local-query';
import { useSession } from '@/zonas/cuenta/presentacion/session-context';
import { useOnboardingStore } from '@/zonas/cuestionario/logica/onboarding-store';
import { HabitCheckCard } from '@/zonas/habitos/presentacion/componentes/habit-check-card';
import { useAgregarHabito } from './use-agregar-habito';
import { useCheckIn } from './use-check-in';
import { CoinBalance } from '@/zonas/plantas/presentacion/componentes/coin-balance';
import { CoinBurst } from '@/zonas/plantas/presentacion/componentes/coin-burst';
import { PhaseCelebration } from '@/zonas/plantas/presentacion/componentes/phase-celebration';
import { DialogoIntrospeccion } from '@/zonas/reajuste/presentacion/componentes/DialogoIntrospeccion';
import { TarjetaReflexion } from '@/zonas/reajuste/presentacion/componentes/TarjetaReflexion';
import { useIntrospeccion } from '@/zonas/reajuste/presentacion/use-introspeccion';
import { CelebracionHito } from '@/zonas/plantas/presentacion/componentes/CelebracionHito';
import { ProgressionCard } from '@/zonas/reajuste/presentacion/componentes/progression-card';
import { useProgresion } from '@/zonas/reajuste/presentacion/use-progresion';
import { DayDialog } from '@/zonas/reajuste/presentacion/componentes/day-dialog';
import { RescheduleCard } from '@/zonas/reajuste/presentacion/componentes/reschedule-card';
import { TarjetaBarreras } from '@/zonas/reajuste/presentacion/componentes/TarjetaBarreras';
import { useReprogramacion } from '@/zonas/reajuste/presentacion/use-reprogramacion';
import {
  descripcionPlanta,
  PlantImage,
} from '@/zonas/plantas/presentacion/componentes/plant-image';
import { es, formatear } from '@/comun/i18n/es';
import { colors } from '@/comun/tema';
import { navegar } from '@/comun/presentacion/navegar';

// Hoy (SDD 9.4 y mockup «Pantalla Dashboard»): monedas, tu planta más avanzada, la barra de avance
// de los hábitos de hoy y sus tarjetas con casilla. De la barra hacia arriba queda fijo y solo se
// desplazan los hábitos. Todo sale de SQLite, así que funciona sin conexión; la sincronización sube
// los cambios después. Al completar: moneda animada, o un aviso flotante de por qué no dio monedas,
// y la celebración si la planta cambió de fase (SDD 6.1). En las semanas 3 y 4 del plan, quien suele
// soltar los hábitos ve un mensaje de apoyo arriba de la lista (SDD 7.1). Cada 7 días, las
// tarjetas de la progresión proponen subir de nivel o sumar un hábito (SDD 6.3). Un día sin hábitos
// programados muestra «Hoy no tienes pendientes» con un atajo a Hábitos.

// Con letra muy grande o una pantalla baja, la parte fija dejaría sin espacio a la lista: entonces
// se desplaza toda la pantalla (guía de UX/UI, sección 6).
const ESCALA_MAXIMA_FIJA = 1.5;
const ALTO_MINIMO_FIJO = 640;
// En pantallas de altura media, una planta más chica deja más tarjetas a la vista.
const ALTO_PLANTA_GRANDE = 760;
const PLANTA_GRANDE = 160;
const PLANTA_CHICA = 120;

export default function HoyScreen() {
  const t = es.hoy;
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const hoy = useLocalQuery('hoy', leerHoy);
  const ajustes = useLocalQuery(`ajustes-${userId}`, () => leerAjustesLocales(userId));
  const jardin = useLocalQuery(`jardin-${userId}`, () => leerMiJardin(userId));
  const semanaApoyo = useLocalQuery(`apoyo-${userId}`, () => leerSemanaApoyo(userId));
  const checkIn = useCheckIn(userId);
  const agregar = useAgregarHabito();
  const reprogramar = useReprogramacion(userId);
  const introspeccion = useIntrospeccion(userId);
  const progresion = useProgresion(userId);
  const { height, fontScale } = useWindowDimensions();
  const todoDesplazable = fontScale >= ESCALA_MAXIMA_FIJA || height < ALTO_MINIMO_FIJO;

  // UC-01 → UC-02: recién terminada la encuesta, se abre una vez «Crear meta» para su primer
  // hábito. Con «atrás» o «Lo hago después» se queda aquí.
  useEffect(() => {
    const store = useOnboardingStore.getState();
    if (!store.primerHabito) return;
    store.pedirPrimerHabito(false);
    navegar.push({ pathname: '/crear-meta', params: { primera: '1' } });
  }, []);

  const saldo = ajustes.data?.saldo ?? 0;
  const items = hoy.data?.items ?? [];
  const hechos = items.filter((i) => i.hecho).length;
  const avance = items.length === 0 ? 0 : (hechos / items.length) * 100;
  const todoHecho = items.length > 0 && hechos === items.length;
  // La que eligió en el Jardín o, si no eligió, la más avanzada.
  const planta = jardin.data?.plantas.find((p) => p.area === jardin.data?.plantaEnHoy) ?? null;
  const tamanoPlanta = height < ALTO_PLANTA_GRANDE ? PLANTA_CHICA : PLANTA_GRANDE;

  const encabezado = (
    <View className="flex-row items-center justify-between">
      <AppText variant="h1">{t.titulo}</AppText>
      <CoinBalance saldo={saldo}>
        {checkIn.premio ? (
          <CoinBurst key={checkIn.premio.clave} monedas={checkIn.premio.monedas} />
        ) : null}
      </CoinBalance>
    </View>
  );

  const parteFija = (
    <>
      <View className="items-center gap-3">
        {/* El espacio queda reservado para que nada salte mientras se lee la planta. */}
        <View
          accessible={planta !== null}
          accessibilityRole="image"
          accessibilityLabel={planta ? descripcionPlanta(planta.area, planta.fase) : undefined}
          style={{ width: tamanoPlanta, height: tamanoPlanta }}
          className="items-center justify-center rounded-chip bg-accent-claro p-3"
        >
          {planta ? (
            <PlantImage area={planta.area} fase={planta.fase} equipados={planta.equipados} />
          ) : null}
        </View>
        <AppText tone="ink-soft" className="text-center">
          {t.frase}
        </AppText>
      </View>

      {/* Sin hábitos hoy no hay avance que mostrar: el estado vacío de la lista lo explica. */}
      {items.length > 0 ? (
        <View className="gap-3">
          <View className="flex-row items-end justify-between">
            <AppText weight="bold">{todoHecho ? t.todoListo : t.pendientes}</AppText>
            {items.length > 0 ? (
              <AppText variant="small" weight="semibold" tone="acento">
                {formatear(t.progreso, { n: hechos, total: items.length })}
              </AppText>
            ) : null}
          </View>
          {items.length > 0 ? (
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={formatear(t.progreso, { n: hechos, total: items.length })}
              accessibilityValue={{ min: 0, max: items.length, now: hechos }}
              className="h-3 w-full overflow-hidden rounded-chip bg-divisor"
            >
              <View style={{ width: `${avance}%` }} className="h-full rounded-chip bg-accent" />
            </View>
          ) : null}
        </View>
      ) : null}
    </>
  );

  // Apoyo de las semanas 3 y 4 (SDD 7.1): arriba de la lista, para no mover la parte fija.
  const apoyo = semanaApoyo.data ? es.avisos.apoyo[semanaApoyo.data] : null;

  const lista = (
    <>
      {/* Reprogramación (SDD 6.2) con la lista de barreras (RF-17 + RF-19): una propuesta a la
          vez, arriba de los hábitos. Primero qué se atravesó; si prefiere no decir, la de siempre. */}
      {reprogramar.actual && reprogramar.paso !== 'clasica' ? (
        <TarjetaBarreras
          propuesta={reprogramar.actual}
          hoy={reprogramar.hoy}
          barrera={reprogramar.barrera}
          alternativas={reprogramar.alternativas}
          indice={reprogramar.indice}
          total={reprogramar.total}
          ocupado={reprogramar.ocupado}
          onBarrera={reprogramar.elegirBarrera}
          onLigero={reprogramar.probarLigero}
          onMover={reprogramar.elegirDia}
          onOtroDia={reprogramar.abrirDias}
          onDejar={reprogramar.dejar}
        />
      ) : null}
      {reprogramar.actual && reprogramar.paso === 'clasica' ? (
        <RescheduleCard
          propuesta={reprogramar.actual}
          hoy={reprogramar.hoy}
          indice={reprogramar.indice}
          total={reprogramar.total}
          ocupado={reprogramar.ocupado}
          onAceptar={reprogramar.aceptar}
          onOtroDia={reprogramar.abrirDias}
          onDejar={reprogramar.dejar}
        />
      ) : null}
      {/* Progresión (SDD 6.3): después de la reprogramación, nunca las dos a la vez. */}
      {!reprogramar.actual && progresion.actual ? (
        <ProgressionCard
          tarjeta={progresion.actual}
          indice={progresion.indice}
          total={progresion.total}
          ocupado={progresion.ocupado}
          onAceptar={progresion.aceptar}
          onCerrar={progresion.cerrar}
          onIrAPerfil={progresion.irAPerfil}
        />
      ) : null}
      {/* RF-04: la reflexión semanal, solo si no hay otra tarjeta arriba. */}
      {!reprogramar.actual && !progresion.actual && introspeccion.tocaSemanal ? (
        <TarjetaReflexion
          onEmpezar={() => introspeccion.abrir('semanal')}
          onAhoraNo={introspeccion.posponer}
        />
      ) : null}
      {apoyo ? <Alert variant="info" message={apoyo.mensaje} /> : null}
      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 py-6">
          <Sun size={32} color={colors.accent} strokeWidth={2} />
          <View className="gap-2">
            <AppText variant="h2" accessibilityRole="header" className="text-center">
              {t.vacio.titulo}
            </AppText>
            <AppText tone="ink-soft" className="text-center">
              {t.vacio.descripcion}
            </AppText>
          </View>
          <Button
            variant="secondary"
            label={t.vacio.verHabitos}
            onPress={() => navegar.navigate('/habitos')}
          />
        </View>
      ) : (
        items.map((item) => (
          <HabitCheckCard
            key={item.habito.id}
            titulo={item.habito.titulo}
            hora={item.horario.notificar ? item.horario.hora : null}
            duracionMin={item.habito.duracion_min}
            hecho={item.hecho}
            reprogramado={item.reprogramado}
            marcable
            ocupado={checkIn.ocupado === item.habito.id}
            onAlternar={() =>
              checkIn.alternar({ ...item.habito, categoria: item.categoria }, item.hecho)
            }
          />
        ))
      )}
    </>
  );

  const celebracion = (
    <>
      <PhaseCelebration celebracion={checkIn.celebracion} onCerrar={checkIn.cerrarCelebracion} />
      <CelebracionHito hito={checkIn.hito} onCerrar={checkIn.cerrarHito} />
      <DialogoIntrospeccion motivo={introspeccion.motivo} onTerminar={introspeccion.terminar} />
      {reprogramar.eligiendo && reprogramar.actual ? (
        <DayDialog
          dias={reprogramar.actual.diasLibres}
          hoy={reprogramar.hoy}
          onElegir={reprogramar.elegirDia}
          onCerrar={reprogramar.cerrarDias}
        />
      ) : null}
    </>
  );

  // Un solo aviso flotante para el check-in, la reprogramación y la progresión: los errores primero.
  const error = checkIn.error ?? reprogramar.error ?? progresion.error;
  const avisoFlotante = (
    <Snackbar
      mensaje={error ?? checkIn.aviso ?? reprogramar.aviso ?? progresion.aviso}
      variant={error ? 'error' : 'exito'}
      onCerrar={() => {
        checkIn.cerrarAvisos();
        reprogramar.cerrarAvisos();
        progresion.cerrarAvisos();
      }}
    />
  );

  if (hoy.cargando && !hoy.data) {
    return (
      <Screen edges={['top']} contentClassName="gap-6 pt-6">
        {encabezado}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink} accessibilityLabel={es.comun.cargando} />
        </View>
      </Screen>
    );
  }

  if (hoy.error && !hoy.data) {
    return (
      <Screen edges={['top']} scroll contentClassName="gap-6 pt-6">
        {encabezado}
        <View className="gap-4">
          <Alert variant="error" message={t.error} />
          <Button variant="secondary" label={es.comun.reintentar} onPress={avisarCambioLocal} />
        </View>
      </Screen>
    );
  }

  if (hoy.data && !hoy.data.tieneHabitos) {
    return (
      <Screen edges={['top']} scroll contentClassName="gap-6 pt-6">
        {encabezado}
        <View className="flex-1 justify-center gap-4 py-8">
          <AppText variant="h2" className="text-center">
            {t.sinHabitos.titulo}
          </AppText>
          <AppText tone="ink-soft" className="text-center">
            {t.sinHabitos.descripcion}
          </AppText>
          {/* Igual que el «+» de Hábitos: con micro-pasos o a su manera. */}
          <Button label={t.sinHabitos.crear} onPress={agregar.elegir} className="mt-2" />
        </View>
        {agregar.dialogo}
      </Screen>
    );
  }

  if (todoDesplazable) {
    return (
      <>
        <Screen edges={['top']} scroll contentClassName="gap-6 pt-6">
          {encabezado}
          {parteFija}
          <View className="gap-3">{lista}</View>
          {celebracion}
        </Screen>
        {avisoFlotante}
      </>
    );
  }

  return (
    <>
      <Screen edges={['top']} contentClassName="gap-4 pt-6">
        {encabezado}
        {parteFija}
        {/* Márgenes negativos: la sombra de las tarjetas no se corta en los bordes de la lista. */}
        <ScrollView
          className="-mx-8 flex-1"
          contentContainerClassName="grow gap-3 px-8 pb-6 pt-1"
          keyboardShouldPersistTaps="handled"
        >
          {lista}
        </ScrollView>
        {celebracion}
      </Screen>
      {avisoFlotante}
    </>
  );
}
