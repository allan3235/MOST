import {
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationCategoryAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';

import { borrarEnfoque, guardarEnfoqueHasta, leerEnfoqueHasta } from '@/db/enfoque-repository';
import { leerDatosAvisos, revisarAvisoMotivacional } from '@/db/reminders-repository';
import { estaEnEnfoque, quitarAvisosDuranteEnfoque } from '@/features/enfoque/domain/enfoque';
import { es, formatear } from '@/i18n/es';
import { fechaLocal } from '@/lib/dates';
import { colors } from '@/theme';

import { DIAS_PARA_AVISO } from './domain/aviso-motivacional';
import { siguientePaso, type SiguientePaso } from './domain/permiso';
import { planificarAvisos, type AvisoPlaneado } from './domain/planificar-avisos';

// Lo que toca `expo-notifications` (SDD 7.1): el canal de Android y el permiso. Los avisos son
// aproximados a propósito: sin el permiso de alarmas exactas, que en Android 14 o superior obligaría
// a pasar por Ajustes, pueden llegar unos minutos tarde.

export const CANAL_RECORDATORIOS = 'recordatorios';

/** Categoría de los avisos de un hábito: llevan el botón «Hecho» (RI-04). */
export const CATEGORIA_HABITO = 'habito';
/** Acción del botón «Hecho». */
export const ACCION_COMPLETAR = 'completar';

/** Se llama al abrir la app: sin un canal creado, Android 13 no muestra la pregunta del permiso. */
export async function prepararAvisos(): Promise<void> {
  setNotificationHandler({
    handleNotification: async () => {
      // RF-14: durante el enfoque, lo que llegue con la app abierta no se muestra ni suena.
      const silencio = estaEnEnfoque(enfoqueHasta, new Date());
      return {
        shouldShowBanner: !silencio,
        shouldShowList: !silencio,
        // Con `false`, Android no muestra el aviso desplegable.
        shouldPlaySound: !silencio,
        shouldSetBadge: false,
      };
    },
  });
  // El canal y la categoría van por separado: si uno falla (en Expo Go crear el canal puede
  // rechazarse), el otro igual se registra.
  const resultados = await Promise.allSettled([
    setNotificationChannelAsync(CANAL_RECORDATORIOS, {
      name: es.avisos.canal,
      // Android no deja cambiarla una vez creado el canal.
      importance: AndroidImportance.DEFAULT,
      lightColor: colors.accent,
    }),
    // RI-04: «Hecho» abre la app y marca el hábito. Abrirla es lo que asegura que la respuesta
    // llegue aunque la app estuviera cerrada, y así se ve la recompensa al momento.
    setNotificationCategoryAsync(CATEGORIA_HABITO, [
      {
        identifier: ACCION_COMPLETAR,
        buttonTitle: es.avisos.accionCompletar,
        options: { opensAppToForeground: true },
      },
    ]),
  ]);
  const fallo = resultados.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (fallo) {
    throw fallo.reason;
  }
}

/** Si el permiso está dado y, si no, qué se puede hacer (preguntar o mandar a Ajustes). */
export async function leerPermiso(): Promise<{ siguiente: SiguientePaso }> {
  const permiso = await getPermissionsAsync();
  return {
    siguiente: siguientePaso({ concedido: permiso.granted, puedePreguntar: permiso.canAskAgain }),
  };
}

export async function pedirPermiso(): Promise<boolean> {
  const permiso = await requestPermissionsAsync();
  return permiso.granted;
}

export async function permisoConcedido(): Promise<boolean> {
  return (await getPermissionsAsync()).granted;
}

// Ventana móvil (SDD 7.1): cada recálculo cancela lo programado y vuelve a programar los avisos de
// los próximos 7 días. Si lo planeado no cambió desde la última vez, no se toca nada.
let ultimaFirma: string | null = null;
/** Fin de la sesión de enfoque en curso (RF-14), o null. Se lee de SQLite en cada recálculo. */
let enfoqueHasta: Date | null = null;
let enCurso: Promise<void> | null = null;
let repetir = false;

function firma(avisos: readonly AvisoPlaneado[]): string {
  return avisos.map((a) => `${a.id}@${a.fecha.getTime()}|${a.titulo}|${a.cuerpo}`).join('\n');
}

async function programar(userId: string): Promise<void> {
  const datos = await leerDatosAvisos(userId);
  const ahora = new Date();
  const guardado = await leerEnfoqueHasta(userId);
  enfoqueHasta = estaEnEnfoque(guardado, ahora) ? guardado : null;
  // RF-14: durante el enfoque no se programa ningún aviso propio; al terminar, uno de cierre.
  const avisos = quitarAvisosDuranteEnfoque(
    datos ? planificarAvisos(datos, ahora) : [],
    enfoqueHasta,
  );
  if (enfoqueHasta) {
    avisos.unshift({
      id: 'fin-enfoque',
      fecha: enfoqueHasta,
      titulo: es.enfoque.finTitulo,
      cuerpo: es.enfoque.finCuerpo,
      habitId: null,
    });
  }
  const nueva = firma(avisos);
  if (nueva === ultimaFirma) return;
  ultimaFirma = null;
  await cancelAllScheduledNotificationsAsync();
  for (const aviso of avisos) {
    await scheduleNotificationAsync({
      identifier: aviso.id,
      content: {
        title: aviso.titulo,
        body: aviso.cuerpo,
        data: { habitId: aviso.habitId, fecha: fechaLocal(aviso.fecha) },
        // Solo los avisos de un hábito llevan «Hecho»; el resumen y el apoyo no.
        ...(aviso.habitId ? { categoryIdentifier: CATEGORIA_HABITO } : {}),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: aviso.fecha,
        channelId: CANAL_RECORDATORIOS,
      },
    });
  }
  ultimaFirma = nueva;
}

/** Recalcula los avisos. Si llega otra petición mientras corre, se repite al terminar. */
export function reprogramarAvisos(userId: string): Promise<void> {
  if (enCurso) {
    repetir = true;
    return enCurso;
  }
  enCurso = (async () => {
    do {
      repetir = false;
      await programar(userId);
    } while (repetir);
  })().finally(() => {
    enCurso = null;
  });
  return enCurso;
}

/** Al cerrar sesión: no deben llegar avisos de la cuenta anterior. */
export async function cancelarAvisos(): Promise<void> {
  ultimaFirma = null;
  await cancelAllScheduledNotificationsAsync();
}

/** Pantalla que abre el aviso motivacional al tocarlo (acceso directo, RF-13). */
export const RUTA_AVISO_MOTIVACIONAL = '/estadisticas' as const;

/**
 * Aviso motivacional (RF-13): se llama al completar un paso. Si toca, llega al momento como banner
 * y al tocarlo abre Progreso. Sin permiso no se gasta el aviso del día.
 * @param userId Usuario con sesión.
 */
export async function mandarAvisoMotivacional(userId: string): Promise<void> {
  if (!(await permisoConcedido()) || estaEnEnfoque(enfoqueHasta, new Date())) {
    return;
  }
  const dias = await revisarAvisoMotivacional(userId);
  if (dias === null) {
    return;
  }
  const t = es.avisos;
  await scheduleNotificationAsync({
    content: {
      title: formatear(t.motivacionTitulo, { n: dias }),
      body:
        t.motivacionCuerpo[(dias / DIAS_PARA_AVISO) % t.motivacionCuerpo.length] ??
        t.motivacionCuerpo[0],
      data: { ruta: RUTA_AVISO_MOTIVACIONAL },
    },
    // Solo el canal: se muestra en cuanto se programa.
    trigger: { channelId: CANAL_RECORDATORIOS },
  });
}

/** Recalcula los avisos sin esperar: reprogramar decenas de avisos tarda segundos (RNF-01). */
function reprogramarEnSegundoPlano(userId: string): void {
  reprogramarAvisos(userId).catch((causa: unknown) => {
    console.warn('No se pudieron reprogramar los avisos', causa);
  });
}

/**
 * Empieza una sesión de enfoque (RF-14): se guarda su fin y se recalculan los avisos sin los que
 * caerían durante ella. El silencio aplica al momento (el fin queda en memoria para el manejador);
 * la reprogramación sigue en segundo plano.
 * @param userId Usuario con sesión.
 * @param hasta Fin de la sesión (finDeEnfoque).
 */
export async function iniciarEnfoque(userId: string, hasta: Date): Promise<void> {
  enfoqueHasta = hasta;
  await guardarEnfoqueHasta(userId, hasta);
  reprogramarEnSegundoPlano(userId);
}

/**
 * Termina o cancela la sesión: los avisos vuelven a programarse como antes.
 * @param userId Usuario con sesión.
 */
export async function terminarEnfoque(userId: string): Promise<void> {
  await borrarEnfoque(userId);
  enfoqueHasta = null;
  reprogramarEnSegundoPlano(userId);
}
