import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { ConfirmDialog } from '@/comun/presentacion/ui/confirm-dialog';
import { es } from '@/comun/i18n/es';

import {
  abrirAjustesDeLaApp,
  alarmasExactasPermitidas,
  leerPermiso,
  pedirAlarmasExactas,
  pedirPermiso,
} from '@/zonas/recordatorios/logica/servicioAvisos';
import { debePedirAlarmasExactas, type SiguientePaso } from '@/zonas/recordatorios/logica/permiso';

// Pide el permiso de avisos en contexto (SDD 7.1): explica para qué sirve y abre la pregunta de
// Android o, si ya no deja preguntar, manda a Ajustes. `dialogo` se coloca en la pantalla.
//
// - `exigir`: elegir la hora de un recordatorio. La acción solo sigue si el permiso queda dado,
//   porque un recordatorio sin permiso nunca sonaría.
// - `sugerir`: confirmar el plan. La acción sigue responda lo que responda y recibe si el permiso
//   quedó dado (sin él, el plan se guarda sin horas).

export type ModoPermiso = 'exigir' | 'sugerir';

type Accion = (concedido: boolean) => void;

/** Ya se explicó «Alarmas y recordatorios» en esta sesión: no se vuelve a preguntar (RNF-06). */
let exactasPreguntadas = false;
type Pendiente = { accion: Accion; modo: ModoPermiso; siguiente: SiguientePaso };

export function usePermisoAvisos() {
  const t = es.avisos;
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  /** null mientras se lee. */
  const [concedido, setConcedido] = useState<boolean | null>(null);
  /** Explicación de «Alarmas y recordatorios» abierta (RF-01: que el aviso llegue a su hora). */
  const [pedirExactas, setPedirExactas] = useState(false);
  // Mientras se lee el permiso el botón sigue activo: un doble toque haría la acción dos veces.
  const revisando = useRef(false);

  const revisar = useCallback(async (): Promise<SiguientePaso> => {
    const { siguiente } = await leerPermiso();
    setConcedido(siguiente === 'listo');
    return siguiente;
  }, []);

  // Al volver de Ajustes de Android, el permiso puede haber cambiado.
  useEffect(() => {
    const leer = () => {
      leerPermiso()
        .then(({ siguiente }) => setConcedido(siguiente === 'listo'))
        .catch(() => setConcedido(null));
    };
    leer();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') leer();
    });
    return () => suscripcion.remove();
  }, []);

  // Con los avisos ya permitidos, si Android los entregaría a hora aproximada, se explica una vez.
  const revisarExactas = async () => {
    const permitidas = await alarmasExactasPermitidas();
    if (
      debePedirAlarmasExactas({
        plataforma: Platform.OS,
        permitidas,
        yaPreguntado: exactasPreguntadas,
      })
    ) {
      exactasPreguntadas = true;
      setPedirExactas(true);
    }
  };

  const responderExactas = (permitir: boolean) => {
    setPedirExactas(false);
    if (permitir) {
      // Al volver de Ajustes, useAvisos reprograma y la firma incluye el permiso nuevo.
      pedirAlarmasExactas().catch((causa: unknown) => {
        console.warn('No se pudo pedir el permiso de alarmas exactas', causa);
      });
    }
  };

  const conPermiso = async (accion: Accion, modo: ModoPermiso = 'sugerir') => {
    if (revisando.current) return;
    revisando.current = true;
    try {
      let siguiente: SiguientePaso = 'listo';
      try {
        siguiente = await revisar();
      } catch (causa) {
        // Sin poder leer el permiso se sigue: es mejor guardar que trabar a la persona.
        console.warn('No se pudo leer el permiso de avisos', causa);
      }
      // Si no se pudo leer, cuenta como dado: un error no debe quitar recordatorios.
      if (siguiente === 'listo') {
        accion(true);
        void revisarExactas();
      } else setPendiente({ accion, modo, siguiente });
    } finally {
      revisando.current = false;
    }
  };

  const responder = async (activar: boolean) => {
    if (!pendiente) return;
    const { accion, modo, siguiente } = pendiente;
    setPendiente(null);
    let dado = false;
    if (activar && siguiente === 'preguntar') {
      try {
        dado = await pedirPermiso();
        setConcedido(dado);
      } catch (causa) {
        console.warn('No se pudo pedir el permiso de avisos', causa);
      }
    } else if (activar) {
      // Al volver de Ajustes se revisa otra vez (AppState).
      void abrirAjustesDeLaApp();
    }
    if (dado) {
      accion(true);
      void revisarExactas();
    } else if (modo === 'sugerir') accion(false);
  };

  const enAjustes = pendiente?.siguiente === 'ajustes';
  const dialogo = (
    <>
      <ConfirmDialog
        visible={pendiente !== null}
        tipo="confirmar"
        mensaje={enAjustes ? t.explicacionAjustes : t.explicacion}
        cancelar={t.ahoraNo}
        confirmar={enAjustes ? t.abrirAjustes : t.activar}
        onCancelar={() => void responder(false)}
        onConfirmar={() => void responder(true)}
      />
      <ConfirmDialog
        visible={pedirExactas}
        tipo="confirmar"
        mensaje={t.exactasExplicacion}
        cancelar={t.ahoraNo}
        confirmar={t.exactasPermitir}
        onCancelar={() => responderExactas(false)}
        onConfirmar={() => responderExactas(true)}
      />
    </>
  );

  return { conPermiso, dialogo, concedido };
}
