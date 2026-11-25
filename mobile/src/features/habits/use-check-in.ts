import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { completarHabito, deshacerHabito, RelojAtrasadoError } from '@/db/logs-repository';
import { leerSonidoLogros, revisarHito } from '@/zonas/plantas/logica/servicioPlantas';
import type { HitoParaCelebrar } from '@/zonas/plantas/presentacion/componentes/CelebracionHito';
import { mandarAvisoMotivacional } from '@/zonas/recordatorios/logica/servicioAvisos';
import { es, formatear } from '@/comun/i18n/es';
import { fechaLocal } from '@/comun/util/dates';
import { useFechaHoy } from '@/comun/logica/fecha-hoy';
import type { Area } from '@/comun/modelo/esquemas/onboarding';

import { DURACION_COIN_BURST } from '@/zonas/plantas/presentacion/componentes/coin-burst';
import type { Celebracion } from '@/zonas/plantas/presentacion/componentes/phase-celebration';

// Marcar y deshacer un hábito de hoy (SDD 6.1), compartido por Hoy y Hábitos: guarda el check-in,
// lanza la moneda animada o el mensaje del tope del día, avisa al lector de pantalla y abre la
// celebración si la planta cambió de fase. Si la lista en pantalla era de ayer (cambió el día y
// aún no se actualizaba), no marca nada: actualiza la lista y lo explica.

export type HabitoParaCheck = { id: string; category_id: string; categoria: Area };

export function useCheckIn(userId: string) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Aviso cuando un check-in no dio monedas: tope del día, o ya pagó hoy. */
  const [aviso, setAviso] = useState<string | null>(null);
  const [premio, setPremio] = useState<{ clave: number; monedas: number } | null>(null);
  const [celebracion, setCelebracion] = useState<Celebracion | null>(null);
  const [hito, setHito] = useState<HitoParaCelebrar | null>(null);

  // La moneda animada se quita sola al terminar.
  useEffect(() => {
    if (premio === null) return;
    const temporizador = setTimeout(() => setPremio(null), DURACION_COIN_BURST);
    return () => clearTimeout(temporizador);
  }, [premio]);

  const ejecutar = async (habitId: string, accion: () => Promise<void>) => {
    setOcupado(habitId);
    setError(null);
    try {
      await accion();
    } catch (e) {
      setError(e instanceof RelojAtrasadoError ? es.hoy.errorReloj : es.hoy.errorGuardar);
    } finally {
      setOcupado(null);
    }
  };

  const completar = (habito: HabitoParaCheck) =>
    ejecutar(habito.id, async () => {
      const r = await completarHabito(userId, habito, fechaLocal());
      if (r === null) return;
      const textos = es.recompensas;
      const motivo =
        r.sinMonedas === 'ya_pagado'
          ? textos.yaPagado
          : r.sinMonedas === 'tope'
            ? textos.topeMonedas
            : null;
      setAviso(motivo);
      if (r.monedas > 0) {
        setPremio({ clave: Date.now(), monedas: r.monedas });
        AccessibilityInfo.announceForAccessibility(
          formatear(textos.hechoMonedas, { n: r.monedas }),
        );
      } else {
        // El motivo lo anuncia el propio aviso flotante.
        AccessibilityInfo.announceForAccessibility(textos.hecho);
      }
      if (r.cambioFase !== null && r.cambioFase > 1) {
        setCelebracion({ area: habito.categoria, fase: r.cambioFase });
      }
      // RF-16: hito del micro-paso (5 y 8 de 10). Se anota aunque haya cambio de fase, pero solo
      // se muestra sin ella para no encimar dos celebraciones.
      const alcanzado = await revisarHito(userId, habito.id);
      if (alcanzado && !(r.cambioFase !== null && r.cambioFase > 1)) {
        setHito({ ...alcanzado, sonido: await leerSonidoLogros(userId) });
      }
      // RF-13: a los 3, 6, 9… días seguidos, un aviso de ánimo (máximo uno al día).
      mandarAvisoMotivacional(userId).catch((causa: unknown) => {
        console.warn('No se pudo mandar el aviso motivacional', causa);
      });
    });

  const deshacer = (habito: HabitoParaCheck) =>
    ejecutar(habito.id, async () => {
      setAviso(null);
      await deshacerHabito(userId, habito, fechaLocal());
      AccessibilityInfo.announceForAccessibility(es.recompensas.deshecho);
    });

  return {
    ocupado,
    error,
    aviso,
    premio,
    celebracion,
    cerrarCelebracion: () => setCelebracion(null),
    hito,
    cerrarHito: () => setHito(null),
    cerrarAvisos: () => {
      setError(null);
      setAviso(null);
    },
    alternar: (habito: HabitoParaCheck, hecho: boolean) => {
      if (useFechaHoy.getState().revisar()) {
        setError(null);
        setAviso(es.hoy.cambioDia);
        return;
      }
      void (hecho ? deshacer(habito) : completar(habito));
    },
  };
}
