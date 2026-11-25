import { useEffect, useRef, useState } from 'react';

import { useDbVersion } from '@/comun/logica/cambios-locales';
import {
  aceptarBajada,
  aplicarPasoLigeroIa,
  aceptarNuevo,
  aceptarSubida,
  cerrarTarjeta,
  leerTarjetas,
  pedirTextosIa,
  revisarProgresion,
} from '@/zonas/reajuste/logica/servicioReajuste';
import { useLocalQuery } from '@/comun/presentacion/use-local-query';
import { es, formatear } from '@/comun/i18n/es';
import { ErrorSinRed } from '@/comun/logica/errores';
import { fechaLocal } from '@/comun/util/dates';
import { useSyncStore } from '@/comun/logica/sync/sync-store';
import { navegar } from '@/comun/presentacion/navegar';

import type { Tarjeta } from '@/zonas/reajuste/logica/progresion';

// Progresión en Hoy (SDD 6.3). Cada 7 días, al abrir la app, se revisan los hábitos del plan y
// las propuestas (subir, meta intermedia de RF-15, hábito nuevo) se muestran como tarjetas, una a
// la vez; nada cambia hasta que la persona acepta. La revisión se
// intenta con cada cambio local y al cambiar el día: mientras no toca es solo una lectura de dos
// fechas, y al instalar la app los datos llegan después de la primera sincronización. Ya hecha,
// `ultima_evaluacion` queda en hoy y no se repite.

export type OpcionesProgresion = {
  /** Solo las tarjetas de este plan (detalle del plan). */
  planId?: string;
  /** Si revisa la progresión al abrir; la revisión la hace Hoy, el detalle solo muestra. */
  revisar?: boolean;
};

export function useProgresion(userId: string, opciones: OpcionesProgresion = {}) {
  const { planId, revisar = true } = opciones;
  const t = es.progresion;
  const hoy = fechaLocal();
  const version = useDbVersion((s) => s.version);
  // Mientras se sincroniza se espera: así la revisión usa los registros que acaban de llegar.
  const sincronizando = useSyncStore((s) => s.sincronizando);
  const consulta = useLocalQuery(`progresion-${userId}`, () => leerTarjetas(userId));
  // Las ya contestadas se ocultan al momento, sin esperar a que se vuelva a leer SQLite.
  const [resueltas, setResueltas] = useState<ReadonlySet<string>>(new Set());
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const revisando = useRef(false);

  useEffect(() => {
    if (!revisar || !userId || sincronizando || revisando.current) return;
    revisando.current = true;
    revisarProgresion(userId)
      .catch((causa: unknown) => console.warn('No se pudo revisar la progresión', causa))
      .finally(() => {
        revisando.current = false;
      });
  }, [userId, hoy, version, sincronizando, revisar]);

  const pendientes = (consulta.data ?? []).filter(
    (x) => !resueltas.has(x.id) && (planId === undefined || x.planId === planId),
  );
  const actual: Tarjeta | null = pendientes[0] ?? null;

  const resolver = async (tarjeta: Tarjeta, accion: () => Promise<void>) => {
    setOcupado(true);
    setError(null);
    try {
      await accion();
      setResueltas((previas) => new Set(previas).add(tarjeta.id));
    } catch (causa) {
      console.warn('No se pudo guardar la progresión', causa);
      setError(causa instanceof ErrorSinRed ? t.sinConexionIa : t.error);
    } finally {
      setOcupado(false);
    }
  };

  return {
    actual,
    indice: resueltas.size + 1,
    total: resueltas.size + pendientes.length,
    ocupado,
    aviso,
    error,
    /** «Sí, vamos» o «Probar este paso»: sube, aplica la meta intermedia o suma el hábito nuevo. */
    aceptar: () => {
      if (!actual) return;
      if (actual.tipo === 'ligero_ia') {
        void resolver(actual, async () => {
          const titulo = await aplicarPasoLigeroIa(userId, actual);
          if (titulo) setAviso(formatear(t.listoBajar, { titulo }));
        });
      } else if (actual.tipo === 'bajar') {
        void resolver(actual, async () => {
          if (await aceptarBajada(userId, actual)) {
            setAviso(formatear(t.listoBajar, { titulo: actual.despues.titulo }));
          }
        });
      } else if (actual.tipo === 'subir') {
        void resolver(actual, async () => {
          if (await aceptarSubida(userId, actual)) {
            setAviso(formatear(t.listoSubir, { titulo: actual.despues.titulo }));
            void pedirTextosIa(userId, actual.habitId, 'subir', {
              ...actual.despues,
              objetivo: actual.objetivo,
            });
          }
        });
      } else if (actual.tipo === 'nuevo') {
        void resolver(actual, async () => {
          const id = await aceptarNuevo(userId, actual);
          if (id === null) {
            setAviso(t.sinLugar);
            return;
          }
          setAviso(formatear(t.listoNuevo, { titulo: actual.habito.titulo }));
          void pedirTextosIa(userId, id, 'nuevo', actual.habito);
        });
      }
    },
    /** «Más adelante» o «Entendido»: vuelve en la siguiente revisión si sigue igual. */
    cerrar: () => {
      if (actual) void resolver(actual, () => cerrarTarjeta(userId, actual.id));
    },
    /** «Ir a Perfil» cuando el día está completo. */
    irAPerfil: () => {
      if (!actual) return;
      void resolver(actual, () => cerrarTarjeta(userId, actual.id)).then(() =>
        navegar.navigate('/perfil'),
      );
    },
    cerrarAvisos: () => {
      setAviso(null);
      setError(null);
    },
  };
}
