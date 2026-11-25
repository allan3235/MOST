import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Alert } from '@/comun/presentacion/ui/alert';
import { AppText } from '@/comun/presentacion/ui/app-text';
import { Button } from '@/comun/presentacion/ui/button';
import { Screen } from '@/comun/presentacion/ui/screen';
import { SegmentedControl } from '@/comun/presentacion/ui/segmented-control';
import { avisarCambioLocal } from '@/comun/logica/cambios-locales';
import { leerHabitos } from '@/zonas/habitos/logica/servicioHabitos';
import { useLocalQuery } from '@/comun/presentacion/use-local-query';
import { useSession } from '@/zonas/cuenta/presentacion/session-context';
import { HabitCheckCard } from '@/zonas/habitos/presentacion/componentes/habit-check-card';
import { useHabitActions } from '@/zonas/habitos/presentacion/use-habit-actions';
import { AreaSection } from '@/zonas/progreso/presentacion/componentes/area-section';
import { AreaSelect } from '@/zonas/progreso/presentacion/componentes/area-select';
import { ComplianceCard } from '@/zonas/progreso/presentacion/componentes/compliance-card';
import { DayHabitRow } from '@/zonas/progreso/presentacion/componentes/day-habit-row';
import { DayStrip } from '@/zonas/progreso/presentacion/componentes/day-strip';
import { DaySummaryCard } from '@/zonas/progreso/presentacion/componentes/day-summary-card';
import { MonthHabitCard } from '@/zonas/progreso/presentacion/componentes/month-habit-card';
import { PeriodNav } from '@/zonas/progreso/presentacion/componentes/period-nav';
import { StatusLegend } from '@/zonas/progreso/presentacion/componentes/status-legend';
import { StreakPill } from '@/zonas/progreso/presentacion/componentes/streak-pill';
import { TodayButton } from '@/zonas/progreso/presentacion/componentes/today-button';
import { WeekHabitCard } from '@/zonas/progreso/presentacion/componentes/week-habit-card';
import { YearHabitCard } from '@/zonas/progreso/presentacion/componentes/year-habit-card';
import { semanasDeCalendario } from '@/zonas/progreso/logica/periodos';
import type { Racha } from '@/zonas/progreso/logica/rachas';
import {
  detalleGrafica,
  encabezadosSemana,
  etiquetaPeriodo,
  etiquetaRango,
  etiquetasDivisiones,
  fraseDia,
  fraseResumen,
} from '@/zonas/progreso/logica/texto-periodo';
import { useEstadisticas, type Escala, type Pestana } from './use-estadisticas';
import { es } from '@/comun/i18n/es';
import { colors } from '@/comun/tema';

// Progreso (SDD 8 y 9.4): diseño del usuario a partir de la pantalla vieja «Calendario» de Figma y
// de las maquetas que eligió. Pestañas Diario / Semanal / Mensual (con Mes / Año) como estado de la
// pantalla, sin deslizar, porque la barra principal ya se desliza. Diario: tira de días, resumen y
// los hábitos del día (hoy se marcan aquí mismo). Semanal y Mensual: frase con su gráfica y los
// hábitos agrupados por área con su cuadrícula y su racha, con un filtro por área (hoja inferior)
// entre las flechas y el resumen. El título y las pestañas quedan fijos.

const PESTANAS: readonly Pestana[] = ['dia', 'semana', 'mes'];
const ESCALAS: readonly Escala[] = ['mes', 'anio'];
const SIN_RACHA: Racha = { actual: 0, mejor: 0 };

export default function EstadisticasScreen() {
  const t = es.estadisticas;
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const s = useEstadisticas(userId);
  const habitos = useLocalQuery('habitos', leerHabitos);
  const acciones = useHabitActions(userId);

  const racha = (id: string) => (
    <StreakPill racha={s.rachas.get(id) ?? SIN_RACHA} desanimo={s.desanimo} />
  );

  const diario = () => {
    const esHoy = s.diaElegido === s.hoy;
    // Hoy sale de la misma lista que Hábitos para poder marcar; los demás días, de las estadísticas.
    const deHoy = (habitos.data ?? [])
      .filter((i) => i.programadoHoy)
      .sort((a, b) => (a.horario?.hora ?? '99').localeCompare(b.horario?.hora ?? '99'));
    const reprogramados = new Set(s.delDia.filter((i) => i.reprogramado).map((i) => i.habito.id));
    const conteo = esHoy
      ? { hechos: deHoy.filter((i) => i.hecho).length, total: deHoy.length }
      : { hechos: s.delDia.filter((i) => i.estado === 'hecho').length, total: s.delDia.length };

    return (
      <>
        <View>
          <PeriodNav
            etiqueta={
              s.semanaVisible.length === 7
                ? etiquetaRango({ desde: s.semanaVisible[0], hasta: s.semanaVisible[6] })
                : ''
            }
            anteriorLabel={t.anterior.semana}
            siguienteLabel={t.siguiente.semana}
            puedeAnterior={s.puedeSemanaAnterior}
            puedeSiguiente={s.puedeSemanaSiguiente}
            onAnterior={s.semanaAnterior}
            onSiguiente={s.semanaSiguiente}
          />
          <DayStrip
            semana={s.semanaVisible}
            hoy={s.hoy}
            elegido={s.diaElegido}
            onElegir={s.elegirDia}
          />
        </View>
        <DaySummaryCard
          frase={fraseDia(s.diaElegido, s.hoy, conteo)}
          hechos={conteo.hechos}
          total={conteo.total}
          conBarra={s.diaElegido <= s.hoy}
        />
        <View className="gap-3">
          {esHoy
            ? deHoy.map((item) => (
                <HabitCheckCard
                  key={item.habito.id}
                  {...acciones.propsTarjeta(item)}
                  reprogramado={reprogramados.has(item.habito.id)}
                  accesorio={racha(item.habito.id)}
                />
              ))
            : s.delDia.map((item) => (
                <DayHabitRow
                  key={item.habito.id}
                  titulo={item.habito.titulo}
                  estado={item.estado}
                  reprogramado={item.reprogramado}
                  racha={racha(item.habito.id)}
                />
              ))}
        </View>
      </>
    );
  };

  const periodos = () => {
    if (!s.resumen) return null;
    const etiquetas = etiquetasDivisiones(s.periodo, s.hoy);
    const frase = fraseResumen(s.periodo, s.resumen.total);
    const etiqueta = etiquetaPeriodo(s.periodo);
    const dias = encabezadosSemana(s.periodo, s.hoy).map((d, i) => ({
      ...d,
      fecha: s.periodo.divisiones[i].desde,
    }));
    const semanas = s.pestana === 'mes' ? semanasDeCalendario(s.periodo) : [];

    return (
      <>
        <PeriodNav
          etiqueta={etiqueta}
          anteriorLabel={t.anterior[s.periodo.vista]}
          siguienteLabel={t.siguiente[s.periodo.vista]}
          puedeAnterior={s.puedeAnterior}
          puedeSiguiente={s.puedeSiguiente}
          onAnterior={s.anterior}
          onSiguiente={s.siguiente}
          extra={
            s.pestana === 'mes' ? (
              <SegmentedControl
                compacto
                accessibilityLabel={t.escalasA11y}
                options={ESCALAS.map((e) => ({ value: e, label: t.escalas[e] }))}
                value={s.escala}
                onChange={s.cambiarEscala}
              />
            ) : null
          }
        />
        {/* Con una sola área no hay nada que filtrar. */}
        {s.areasDisponibles.length > 1 ? (
          <AreaSelect areas={s.areasDisponibles} valor={s.area} onCambiar={s.cambiarArea} />
        ) : null}
        <ComplianceCard
          vista={s.periodo.vista}
          frase={frase}
          detalle={`${frase}. ${detalleGrafica(etiquetas, s.resumen.divisiones)}`}
          etiquetas={etiquetas}
          conteos={s.resumen.divisiones}
        />
        {s.periodo.vista === 'anio' ? null : <StatusLegend />}
        {s.resumen.secciones.map(({ area, filas }) => (
          <AreaSection key={area} area={area}>
            {filas.map((fila) => {
              const props = {
                titulo: fila.habito.titulo,
                etiquetaPeriodo: etiqueta,
                conteo: fila.conteo,
                racha: fila.estado === 'archivado' ? SIN_RACHA : fila.racha,
                desanimo: s.desanimo,
                celdas: s.estados.get(fila.habito.id),
              };
              if (s.periodo.vista === 'semana') {
                return <WeekHabitCard key={fila.habito.id} {...props} dias={dias} />;
              }
              if (s.periodo.vista === 'mes') {
                return <MonthHabitCard key={fila.habito.id} {...props} semanas={semanas} />;
              }
              return (
                <YearHabitCard
                  key={fila.habito.id}
                  {...props}
                  semanas={semanasDeCalendario(s.periodo)}
                />
              );
            })}
          </AreaSection>
        ))}
      </>
    );
  };

  const contenido = () => {
    if (s.cargando) {
      return <ActivityIndicator color={colors.ink} accessibilityLabel={es.comun.cargando} />;
    }
    if (s.error || !s.resumen) {
      return (
        <View className="gap-4">
          <Alert variant="error" message={t.error} />
          <Button variant="secondary" label={es.comun.reintentar} onPress={avisarCambioLocal} />
        </View>
      );
    }
    if (s.sinHabitos) {
      return (
        <AppText tone="ink-soft" className="pt-8 text-center">
          {t.vacio}
        </AppText>
      );
    }
    return s.pestana === 'dia' ? diario() : periodos();
  };

  return (
    <>
      <Screen edges={['top']} contentClassName="gap-4 pt-6">
        {/* Alto fijo de 48 dp: el botón «Hoy» aparece y desaparece sin mover lo de abajo. */}
        <View style={{ minHeight: 48 }} className="flex-row items-center justify-between gap-3">
          <AppText variant="h1">{es.tabs.estadisticas}</AppText>
          {s.lejosDeHoy ? <TodayButton onPress={s.irAHoy} /> : null}
        </View>
        <SegmentedControl
          options={PESTANAS.map((p) => ({ value: p, label: t.pestanas[p] }))}
          value={s.pestana}
          onChange={s.cambiarPestana}
        />
        {/* Márgenes negativos: la sombra de las tarjetas no se corta en los bordes de la lista. */}
        <ScrollView className="-mx-8 flex-1" contentContainerClassName="gap-5 px-8 pb-6 pt-1">
          {contenido()}
        </ScrollView>
        {acciones.capas}
      </Screen>
      {acciones.aviso}
    </>
  );
}
