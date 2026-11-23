import { useEffect, useRef, useState } from 'react';

import {
  descartarOcurrencia,
  leerReprogramacion,
  moverOcurrencia,
  reprogramarEnSilencio,
} from '@/db/occurrences-repository';
import { aliviarConPasoLigero, leerPasosLigeros } from '@/db/progression-repository';
import { useLocalQuery } from '@/db/use-local-query';
import { es, formatear } from '@/i18n/es';
import { fechaLocal } from '@/lib/dates';

import { alternativasPara, type Barrera } from './domain/barreras';
import type { Propuesta } from './domain/reprogramar';
import { destinoDia, quedoPara } from './domain/texto-dia';

// Reprogramación en Hoy (SDD 6.2) con la lista de barreras (RF-17 + RF-19). Al abrir la app se
// leen las propuestas y se muestran una por una. Primero se pregunta qué se atravesó (o «Prefiero
// no decir», que lleva a la tarjeta de siempre); con la causa se ofrece una alternativa en un
// toque y ese día no cuenta en contra. Con `desanimo` no hay tarjeta: se mueven solas una vez y
// se avisa con suavidad.

const clave = (p: Propuesta) => `${p.habito.id}|${p.fechaOriginal}`;

/** Lo que respondió en la tarjeta actual: la barrera, o null si prefirió no decir. */
type Respuesta = { clave: string; barrera: Barrera | null };

export type PasoTarjeta = 'pregunta' | 'alternativas' | 'clasica';

async function leerTodo(userId: string) {
  const reprogramacion = await leerReprogramacion(userId);
  const ligeros = reprogramacion.silenciosa
    ? {}
    : await leerPasosLigeros(
        userId,
        reprogramacion.propuestas.map((p) => p.habito.id),
      );
  return { ...reprogramacion, ligeros };
}

export function useReprogramacion(userId: string) {
  const t = es.reprogramar;
  const hoy = fechaLocal();
  const consulta = useLocalQuery(`reprogramar-${userId}-${hoy}`, () => leerTodo(userId));
  // Las ya resueltas se ocultan al momento, sin esperar a que se vuelva a leer SQLite.
  const [resueltas, setResueltas] = useState<ReadonlySet<string>>(new Set());
  const [ocupado, setOcupado] = useState(false);
  const [eligiendo, setEligiendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const silencioIniciado = useRef(false);
  // Con el día nuevo, los días libres del diálogo ya no valen: se cierra solo.
  const [hoyVisto, setHoyVisto] = useState(hoy);
  if (hoyVisto !== hoy) {
    setHoyVisto(hoy);
    setEligiendo(false);
  }

  const silenciosa = consulta.data?.silenciosa ?? false;
  const todas = consulta.data?.propuestas;
  const pendientes = (todas ?? []).filter((p) => !resueltas.has(clave(p)));
  const actual = silenciosa ? null : (pendientes[0] ?? null);
  // La respuesta solo vale para la tarjeta en la que se dio.
  const respondida = actual && respuesta?.clave === clave(actual) ? respuesta : null;
  const barrera = respondida?.barrera ?? null;
  const ligero = actual ? (consulta.data?.ligeros[actual.habito.id] ?? null) : null;
  // 'pregunta': qué se atravesó; 'alternativas': con barrera; 'clasica': prefirió no decir.
  const paso: PasoTarjeta =
    respondida === null ? 'pregunta' : barrera === null ? 'clasica' : 'alternativas';

  // Con `desanimo`: todas se mueven (o se descartan si no hay día) en una sola escritura.
  useEffect(() => {
    if (!silenciosa || !todas || todas.length === 0 || silencioIniciado.current) return;
    silencioIniciado.current = true;
    reprogramarEnSilencio(userId, todas)
      .then((movidas) => {
        const [unica] = movidas;
        if (movidas.length === 1 && unica.diaPropuesto !== null) {
          setAviso(
            formatear(t.silencioUno, {
              habito: unica.habito.titulo,
              destino: destinoDia(unica.diaPropuesto, hoy),
            }),
          );
        } else if (movidas.length > 1) {
          setAviso(formatear(t.silencioVarios, { n: movidas.length }));
        }
      })
      .catch((causa: unknown) => {
        console.warn('No se pudo reprogramar en silencio', causa);
        silencioIniciado.current = false;
      });
  }, [silenciosa, todas, userId, hoy, t]);

  const resolver = async (
    propuesta: Propuesta,
    accion: () => Promise<unknown>,
    alTerminar?: () => void,
  ) => {
    setOcupado(true);
    setError(null);
    try {
      await accion();
      setResueltas((previas) => new Set(previas).add(clave(propuesta)));
      alTerminar?.();
    } catch (causa) {
      console.warn('No se pudo guardar la reprogramación', causa);
      setError(t.error);
    } finally {
      setOcupado(false);
    }
  };

  const mover = (fecha: string) => {
    if (!actual) return;
    const propuesta = actual;
    void resolver(
      propuesta,
      () => moverOcurrencia(userId, propuesta, fecha, barrera),
      // Al dejarla no hay aviso: nada cambió de día.
      () =>
        setAviso(
          formatear(t.movido, { habito: propuesta.habito.titulo, destino: quedoPara(fecha, hoy) }),
        ),
    );
  };

  return {
    hoy,
    actual,
    paso,
    barrera,
    alternativas:
      actual && barrera
        ? alternativasPara(barrera, actual.diaPropuesto, actual.diasLibres.length > 1, ligero)
        : [],
    indice: resueltas.size + 1,
    total: resueltas.size + pendientes.length,
    ocupado,
    eligiendo,
    aviso,
    error,
    aceptar: () => {
      if (actual?.diaPropuesto) mover(actual.diaPropuesto);
    },
    elegirDia: mover,
    elegirBarrera: (b: Barrera | null) => {
      if (actual) setRespuesta({ clave: clave(actual), barrera: b });
    },
    probarLigero: () => {
      if (!actual || !barrera) return;
      const propuesta = actual;
      let titulo: string | null = null;
      void resolver(
        propuesta,
        async () => {
          titulo = await aliviarConPasoLigero(userId, propuesta, barrera);
        },
        () => setAviso(titulo ? formatear(t.ligeroListo, { titulo }) : t.dejadoListo),
      );
    },
    dejar: () => {
      if (!actual) return;
      const conBarrera = barrera;
      void resolver(
        actual,
        () => descartarOcurrencia(userId, actual, conBarrera),
        // Sin barrera no hay aviso: nada cambió.
        conBarrera ? () => setAviso(t.dejadoListo) : undefined,
      );
    },
    abrirDias: () => setEligiendo(true),
    cerrarDias: () => setEligiendo(false),
    cerrarAvisos: () => {
      setAviso(null);
      setError(null);
    },
  };
}
