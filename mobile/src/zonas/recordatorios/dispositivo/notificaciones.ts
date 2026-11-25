/**
 * @file notificaciones.ts
 * @proyecto most.
 * @descripcion Servicios del dispositivo de los recordatorios (SDD 7.1, RI-04, RI-07): todo lo que
 *   toca `expo-notifications`. Registra el canal de Android y la categoría con el botón «Hecho»,
 *   lee y pide permisos (avisos y alarmas exactas), programa y cancela avisos y muestra uno al
 *   momento. No decide qué avisar: eso es de la capa de lógica.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación (sale de features/reminders/avisos.ts).
 */

import {
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  getExactAlarmPermissionsAsync,
  getPermissionsAsync,
  requestExactAlarmPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationCategoryAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { es } from '@/comun/i18n/es';
import { colors } from '@/comun/tema';
import { fechaLocal } from '@/comun/util/dates';

import type { AvisoPlaneado } from '../logica/planificar-avisos';

// ===== Tipos =====

export type EstadoPermisoAvisos = { concedido: boolean; puedePreguntar: boolean };

// ===== Constantes =====

export const CANAL_RECORDATORIOS = 'recordatorios';
/** Categoría de los avisos de un hábito: llevan el botón «Hecho» (RI-04). */
export const CATEGORIA_HABITO = 'habito';
/** Acción del botón «Hecho». */
export const ACCION_COMPLETAR = 'completar';

// ===== Principal =====

/**
 * Cómo se muestra un aviso con la app abierta.
 * @param enSilencio Devuelve true mientras los avisos deben callarse (modo enfoque).
 */
export function configurarManejador(enSilencio: () => boolean): void {
  setNotificationHandler({
    handleNotification: async () => {
      const silencio = enSilencio();
      return {
        shouldShowBanner: !silencio,
        shouldShowList: !silencio,
        // Con `false`, Android no muestra el aviso desplegable.
        shouldPlaySound: !silencio,
        shouldSetBadge: false,
      };
    },
  });
}

/**
 * Canal de Android y categoría con «Hecho». Van por separado: si uno falla (en Expo Go crear el
 * canal puede rechazarse), el otro igual se registra; después se informa el primer error.
 */
export async function registrarCanalYCategoria(): Promise<void> {
  const resultados = await Promise.allSettled([
    setNotificationChannelAsync(CANAL_RECORDATORIOS, {
      name: es.avisos.canal,
      // Android no deja cambiarla una vez creado el canal.
      importance: AndroidImportance.DEFAULT,
      lightColor: colors.accent,
    }),
    // RI-04: «Hecho» abre la app y marca el hábito. Abrirla asegura que la respuesta llegue aunque
    // la app estuviera cerrada, y así se ve la recompensa al momento.
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

/** Estado del permiso de avisos y si Android todavía deja preguntar. */
export async function leerEstadoPermiso(): Promise<EstadoPermisoAvisos> {
  const permiso = await getPermissionsAsync();
  return { concedido: permiso.granted, puedePreguntar: permiso.canAskAgain };
}

/** Muestra la pregunta del permiso de avisos. */
export async function pedirPermisoAvisos(): Promise<boolean> {
  return (await requestPermissionsAsync()).granted;
}

/** ¿Hay permiso de avisos? */
export async function permisoAvisosConcedido(): Promise<boolean> {
  return (await getPermissionsAsync()).granted;
}

/**
 * ¿Android deja programar alarmas exactas? Sin ese permiso los avisos llegan «a una hora
 * aproximada» (hasta 1 h tarde). En iOS siempre llegan a su hora. Si no se puede leer, cuenta como
 * permitido: no se pregunta de más.
 */
export async function alarmasExactasPermitidas(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    return (await getExactAlarmPermissionsAsync()).granted;
  } catch {
    return true;
  }
}

/** Abre «Alarmas y recordatorios» de Android y espera a que la persona vuelva. */
export async function pedirAlarmasExactas(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  return (await requestExactAlarmPermissionsAsync()).granted;
}

/**
 * Reemplaza todo lo programado por estos avisos.
 * @param avisos Avisos ya decididos por la capa de lógica.
 */
export async function programarAvisos(avisos: readonly AvisoPlaneado[]): Promise<void> {
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
}

/** Quita todo lo programado. */
export async function cancelarTodos(): Promise<void> {
  await cancelAllScheduledNotificationsAsync();
}

/**
 * Muestra un aviso en este momento (banner, no bloquea).
 * @param aviso Título, cuerpo y datos (por ejemplo, la ruta del acceso directo).
 */
export async function mostrarAhora(aviso: {
  titulo: string;
  cuerpo: string;
  datos: Record<string, string>;
}): Promise<void> {
  await scheduleNotificationAsync({
    content: { title: aviso.titulo, body: aviso.cuerpo, data: aviso.datos },
    // Solo el canal: se muestra en cuanto se programa.
    trigger: { channelId: CANAL_RECORDATORIOS },
  });
}
