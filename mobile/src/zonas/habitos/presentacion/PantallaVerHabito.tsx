/**
 * @file PantallaVerHabito.tsx
 * @proyecto most.
 * @descripcion Vista previa de un hábito (al tocarlo en Hábitos o en una planta): área, días, hora,
 *   duración, inicio, si toca hoy y sus micro-pasos con el que va en curso (RF-03, RF-16). Solo
 *   muestra; editar sigue en el menú ⋮ de la lista (decisión del usuario).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-25
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-25): creación (antes tocar el hábito abría la edición).
 */

import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { es } from '@/comun/i18n/es';
import { AppText } from '@/comun/presentacion/ui/app-text';
import { BackButton } from '@/comun/presentacion/ui/back-button';
import { Screen } from '@/comun/presentacion/ui/screen';
import { SettingsRow } from '@/comun/presentacion/ui/settings-row';
import { useLocalQuery } from '@/comun/presentacion/use-local-query';
import { cardShadow, colors, tintes } from '@/comun/tema';
import { textoFecha } from '@/zonas/habitos/logica/fechas';
import { textoDias, textoDuracion } from '@/zonas/habitos/logica/formato';
import { leerVistaHabito, type VistaHabito } from '@/zonas/habitos/logica/servicioHabitos';
import { ListaMicroPasos } from '@/zonas/planes/presentacion/componentes/ListaMicroPasos';

import { ICONO_CATEGORIA } from './categoria-icono';

// ===== Constantes =====

const TAMANO_ICONO = 20;
const LARGO_HORA = 5;

// ===== Funciones auxiliares =====

/**
 * Qué dice la fila de recordatorio: la hora, «Flexible» o «Ninguno».
 * @param vista Hábito con su horario.
 * @returns El texto.
 */
function textoRecordatorio(vista: VistaHabito): string {
  const horario = vista.horario;
  if (!horario?.notificar) {
    return es.habitForm.ninguno;
  }
  return horario.flexible || !horario.hora
    ? es.habitForm.flexible
    : horario.hora.slice(0, LARGO_HORA);
}

/**
 * Estado de hoy, sin juicio: hecho, toca o no toca.
 * @param vista Hábito.
 * @returns El texto.
 */
function textoHoy(vista: VistaHabito): string {
  const t = es.habitos.vista;
  if (vista.hecho) {
    return t.hoyHecho;
  }
  return vista.programadoHoy ? t.hoyToca : t.hoyNoToca;
}

// ===== Principal =====

/**
 * Pantalla de vista previa de un hábito.
 * @returns La pantalla.
 */
export default function PantallaVerHabito() {
  const t = es.habitos.vista;
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = useLocalQuery(`vista-habito-${id}`, () => leerVistaHabito(id));
  const vista = consulta.data;

  if (!vista) {
    return (
      <Screen contentClassName="gap-6 pt-2">
        <View className="-ml-4">
          <BackButton />
        </View>
        {consulta.cargando ? (
          <ActivityIndicator color={colors.ink} accessibilityLabel={es.comun.cargando} />
        ) : (
          <AppText tone="ink-soft">{t.noEncontrado}</AppText>
        )}
      </Screen>
    );
  }

  const { habito, horario, categoria } = vista;
  const Icono = ICONO_CATEGORIA[categoria];
  const dias = horario?.dias_semana ?? [];

  return (
    <Screen scroll contentClassName="gap-6 pt-2 pb-8">
      <View className="-ml-4">
        <BackButton />
      </View>

      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <View
            style={{ backgroundColor: tintes[categoria] }}
            className="h-9 w-9 items-center justify-center rounded-field"
          >
            <Icono size={TAMANO_ICONO} color={colors.ink} />
          </View>
          <AppText variant="small" weight="semibold">
            {es.onboarding.formulario.areas[categoria]}
          </AppText>
        </View>
        <AppText variant="h1" accessibilityRole="header">
          {habito.titulo}
        </AppText>
        {habito.descripcion ? <AppText tone="ink-soft">{habito.descripcion}</AppText> : null}
        <AppText weight="semibold" tone={vista.hecho ? 'confirmar' : 'ink'}>
          {habito.activo ? textoHoy(vista) : t.enPausa}
        </AppText>
      </View>

      <View style={cardShadow} className="overflow-hidden rounded-card bg-campo">
        <SettingsRow
          label={es.habitForm.frecuencia}
          value={dias.length > 0 ? textoDias(dias, es.habitos.tarjeta) : es.habitForm.ninguno}
        />
        <SettingsRow label={es.habitForm.recordatorios} value={textoRecordatorio(vista)} />
        <SettingsRow label={es.habitForm.duracion} value={textoDuracion(habito.duracion_min)} />
        <SettingsRow
          label={es.habitForm.fechaInicio}
          value={vista.inicio ? textoFecha(vista.inicio) : es.habitForm.ninguno}
          ultima
        />
      </View>

      {vista.pasos.length > 0 ? (
        <View style={cardShadow} className="gap-2 rounded-card bg-campo p-4">
          <ListaMicroPasos
            pasos={vista.pasos}
            pasoActual={habito.paso_actual}
            enCurso={habito}
            avance={vista.avance ?? undefined}
          />
        </View>
      ) : null}

      <AppText variant="small" tone="ink-soft">
        {t.comoEditar}
      </AppText>
    </Screen>
  );
}
