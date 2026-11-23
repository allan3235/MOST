/**
 * @file PantallaCrearMeta.tsx
 * @proyecto most.
 * @descripcion «Crear meta» (RF-03, CP-01 y CP-02): la persona escribe una meta con sus palabras y
 *   elige el área; la IA la descompone en una secuencia ordenada de micro-pasos; al confirmar se
 *   crea el hábito con su secuencia, empezando en el paso 1. Una meta vacía no se envía. Generar
 *   necesita conexión; guardar funciona sin ella (cola de salida).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { useState } from 'react';
import { View } from 'react-native';

import { Alert } from '@/components/ui/alert';
import { AppText } from '@/components/ui/app-text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoicePill } from '@/components/ui/choice-pill';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { crearHabito } from '@/db/habits-repository';
import {
  descomponerMeta,
  type MotivoSinPropuesta,
  type PropuestaMeta,
} from '@/db/metasRepositorio';
import { leerAjustesLocales } from '@/db/settings-repository';
import { useSession } from '@/features/auth/session-context';
import { ListaMicroPasos } from '@/features/plan/components/ListaMicroPasos';
import { es, formatear } from '@/i18n/es';
import { fechaLocal } from '@/lib/dates';
import { navegar } from '@/lib/navegar';
import { AREAS, type Area } from '@/schemas/onboarding';

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
  const [texto, setTexto] = useState('');
  const [area, setArea] = useState<Area | null>(null);
  const [estado, setEstado] = useState<Estado>('escribiendo');
  const [propuesta, setPropuesta] = useState<PropuestaMeta | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

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
      const { horaManana } = await leerAjustesLocales(userId);
      await crearHabito(
        userId,
        {
          nombre: primero.titulo,
          descripcion: propuesta.descripcion === '' ? null : propuesta.descripcion,
          categoria: propuesta.categoria,
          dias_semana: primero.dias_semana,
          duracion: primero.duracion_min,
          hora: horaManana,
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
          {t.titulo}
        </AppText>
        <AppText tone="ink-soft">{conPropuesta ? t.propuestaAyuda : t.subtitulo}</AppText>
      </View>

      {conPropuesta ? (
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
          <AppText variant="small" tone="ink-soft">
            {formatear(t.privacidad, { n: LARGO_MAXIMO_META })}
          </AppText>
        </>
      )}
    </Screen>
  );
}
