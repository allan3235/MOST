/**
 * @file PantallaCrearMeta.tsx
 * @proyecto most.
 * @descripcion «Crear meta» (RF-03, CP-01 y CP-02): la persona escribe una meta con sus palabras y
 *   elige el área; la IA la descompone en una secuencia ordenada de micro-pasos; al confirmar se
 *   crea el hábito con su secuencia, empezando en el paso 1. Una meta vacía no se envía. Generar
 *   necesita conexión; guardar funciona sin ella (cola de salida).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.2.0
 * @historial 1.0.0 (2026-11-23): creación.
 *   1.1.0 (2026-11-24): UC-01, sin el perfil de la encuesta invita a responderla; el
 *   recordatorio cae en el momento del perfil.
 *   1.2.0 (2026-11-24): la encuesta solo guarda el perfil; al terminarla se llega aquí a crear el
 *   primer hábito («Lo hago después» vuelve a Hoy). El perfil se revisa al volver a la pantalla.
 */

import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Alert } from '@/comun/presentacion/ui/alert';
import { AppText } from '@/comun/presentacion/ui/app-text';
import { BackButton } from '@/comun/presentacion/ui/back-button';
import { Button } from '@/comun/presentacion/ui/button';
import { Card } from '@/comun/presentacion/ui/card';
import { ChoicePill } from '@/comun/presentacion/ui/choice-pill';
import { Field } from '@/comun/presentacion/ui/field';
import { Screen } from '@/comun/presentacion/ui/screen';
import { crearHabito } from '@/zonas/habitos/logica/servicioHabitos';
import {
  descomponerMeta,
  type MotivoSinPropuesta,
  type PropuestaMeta,
} from '@/zonas/planes/logica/servicioMetas';
import { leerGlobalesFormulario } from '@/zonas/planes/logica/servicioPlanes';
import { leerAjustesLocales } from '@/zonas/cuenta/logica/servicioAjustes';
import { useSession } from '@/zonas/cuenta/presentacion/session-context';
import { useOnboardingStore } from '@/zonas/cuestionario/logica/onboarding-store';
import { ListaMicroPasos } from '@/zonas/planes/presentacion/componentes/ListaMicroPasos';
import { es, formatear } from '@/comun/i18n/es';
import { fechaLocal } from '@/comun/util/dates';
import { navegar } from '@/comun/presentacion/navegar';
import { AREAS, momentoPrincipal, type Area } from '@/comun/modelo/esquemas/onboarding';

// ===== Tipos =====

type Estado = 'escribiendo' | 'pensando' | 'propuesta' | 'guardando';

// ===== Constantes =====

const LARGO_MINIMO_META = 3;
const LARGO_MAXIMO_META = 120;

// ===== Funciones auxiliares =====

/** Mensaje para cada motivo sin propuesta; el del backend gana si viene (tono sin culpa). */
function mensajeDeMotivo(motivo: MotivoSinPropuesta, mensaje: string | null): string {
  const t = es.crearMeta.errores;
  if (motivo === 'sin_conexion') {
    return t.sinConexion;
  }
  if ((motivo === 'no_apropiada' || motivo === 'no_disponible') && mensaje) {
    return mensaje;
  }
  return t.error;
}

// ===== Principal =====

/**
 * Pantalla para crear una meta con micro-pasos.
 * @returns La pantalla.
 */
export function PantallaCrearMeta() {
  const t = es.crearMeta;
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  /** Recién terminada la encuesta de la bienvenida: su primer hábito. */
  const esPrimera = useLocalSearchParams<{ primera?: string }>().primera === '1';
  const [texto, setTexto] = useState('');
  const [area, setArea] = useState<Area | null>(null);
  const [estado, setEstado] = useState<Estado>('escribiendo');
  const [propuesta, setPropuesta] = useState<PropuestaMeta | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  /** UC-01: sin la encuesta no hay perfil; null mientras se revisa. */
  const [sinPerfil, setSinPerfil] = useState<boolean | null>(null);

  // Al volver de la encuesta el perfil ya existe: se revisa cada vez que se ve la pantalla.
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      leerGlobalesFormulario(userId)
        .then((globales) => {
          if (activo) setSinPerfil(globales === null);
        })
        .catch(() => {
          if (activo) setSinPerfil(false);
        });
      return () => {
        activo = false;
      };
    }, [userId]),
  );

  const responderEncuesta = () => {
    useOnboardingStore.getState().prepararPara(userId);
    navegar.push({ pathname: '/plan-nuevo/[paso]', params: { paso: '1' } });
  };

  const descomponer = async () => {
    const meta = texto.trim();
    if (meta.length === 0) {
      setAviso(t.errores.vacia);
      return;
    }
    if (meta.length < LARGO_MINIMO_META) {
      setAviso(t.errores.corta);
      return;
    }
    if (area === null) {
      setAviso(t.errores.area);
      return;
    }
    setAviso(null);
    setEstado('pensando');
    const resultado = await descomponerMeta(meta, area);
    if (resultado.ok) {
      setPropuesta(resultado.propuesta);
      setEstado('propuesta');
    } else if (resultado.motivo === 'perfil_incompleto') {
      setEstado('escribiendo');
      setSinPerfil(true);
    } else {
      setAviso(mensajeDeMotivo(resultado.motivo, resultado.mensaje));
      setEstado('escribiendo');
    }
  };

  const usar = async () => {
    const primero = propuesta?.micro_pasos[0];
    if (!propuesta || !primero) {
      return;
    }
    setEstado('guardando');
    setAviso(null);
    try {
      // El recordatorio cae en el momento que eligió en la encuesta («varía»: la tarde).
      const [{ horas }, globales] = await Promise.all([
        leerAjustesLocales(userId),
        leerGlobalesFormulario(userId),
      ]);
      const momento = globales ? momentoPrincipal(globales.disponibilidad) : 'manana';
      const hora = horas[momento === 'varia' ? 'tarde' : momento];
      await crearHabito(
        userId,
        {
          nombre: primero.titulo,
          descripcion: propuesta.descripcion === '' ? null : propuesta.descripcion,
          categoria: propuesta.categoria,
          dias_semana: primero.dias_semana,
          duracion: primero.duracion_min,
          hora,
          notificar: true,
          fecha_inicio: fechaLocal(),
          fecha_fin: null,
        },
        propuesta.micro_pasos,
      );
      navegar.back();
    } catch (causa) {
      console.warn('No se pudo guardar la meta', causa);
      setAviso(t.errores.guardar);
      setEstado('propuesta');
    }
  };

  const otraMeta = () => {
    setPropuesta(null);
    setAviso(null);
    setEstado('escribiendo');
  };

  const conPropuesta = propuesta !== null && (estado === 'propuesta' || estado === 'guardando');

  return (
    <Screen scroll contentClassName="gap-6 pt-2">
      <View className="-ml-4">
        <BackButton />
      </View>

      <View className="gap-2">
        <AppText variant="h1" accessibilityRole="header">
          {esPrimera && !conPropuesta ? t.primeraTitulo : t.titulo}
        </AppText>
        <AppText tone="ink-soft">
          {conPropuesta ? t.propuestaAyuda : esPrimera ? t.primeraAyuda : t.subtitulo}
        </AppText>
      </View>

      {sinPerfil ? (
        <Card className="gap-4">
          <AppText variant="h3">{t.sinPerfilTitulo}</AppText>
          <AppText tone="ink-soft">{t.sinPerfilTexto}</AppText>
          <Button label={t.sinPerfilBoton} onPress={responderEncuesta} />
        </Card>
      ) : conPropuesta ? (
        <>
          <Card className="gap-3">
            <AppText variant="h3">{propuesta.titulo}</AppText>
            {propuesta.descripcion ? (
              <AppText variant="small">{propuesta.descripcion}</AppText>
            ) : null}
            <ListaMicroPasos pasos={propuesta.micro_pasos} pasoActual={1} />
          </Card>
          {aviso ? <Alert variant="error" message={aviso} /> : null}
          <View className="gap-2">
            <Button label={t.usar} loading={estado === 'guardando'} onPress={() => void usar()} />
            <Button
              variant="tertiary"
              label={t.otra}
              disabled={estado === 'guardando'}
              onPress={otraMeta}
            />
          </View>
        </>
      ) : (
        <>
          <Field
            label={t.campo}
            placeholder={t.placeholder}
            value={texto}
            onChangeText={(nuevo) => {
              setAviso(null);
              setTexto(nuevo);
            }}
            maxLength={LARGO_MAXIMO_META}
            invalido={aviso === t.errores.vacia || aviso === t.errores.corta}
            multiline
            editable={estado === 'escribiendo'}
          />

          <View className="gap-3">
            <AppText weight="semibold">{t.area}</AppText>
            <View className="flex-row flex-wrap gap-2">
              {AREAS.map((opcion) => (
                <ChoicePill
                  key={opcion}
                  label={es.onboarding.formulario.areas[opcion]}
                  selected={area === opcion}
                  onPress={() => {
                    setAviso(null);
                    setArea(opcion);
                  }}
                />
              ))}
            </View>
          </View>

          {aviso ? <Alert variant="error" message={aviso} /> : null}

          <Button
            label={estado === 'pensando' ? t.pensando : t.descomponer}
            loading={estado === 'pensando'}
            onPress={() => void descomponer()}
          />
          {esPrimera ? (
            <Button
              variant="tertiary"
              label={t.despues}
              disabled={estado === 'pensando'}
              onPress={() => navegar.back()}
            />
          ) : null}
          <AppText variant="small" tone="ink-soft">
            {formatear(t.privacidad, { n: LARGO_MAXIMO_META })}
          </AppText>
        </>
      )}
    </Screen>
  );
}
