/**
 * @file servicioAvisos.ts
 * @proyecto most.
 * @descripcion Servicio de los recordatorios (SDD 7.1, RF-01, RF-13, RF-14, RF-18): decide qué
 *   avisos programar en la ventana de 7 días (respetando el modo enfoque), cuándo mandar el aviso
 *   motivacional y qué hacer con los permisos. Lee con la capa de datos y avisa con la de
 *   dispositivo; la presentación solo habla con este servicio.
 * @autor Equipo most. (código heredado de Habit Green; reorganizado por Allan con Claude Code)
 * @fecha 2026-11-24
 * @version 2.0.0
 * @historial 2.0.0 (2026-11-24): pasa a zonas/recordatorios/logica (antes features/reminders/avisos.ts);
 *   lo que toca expo-notifications pasa a dispositivo/notificaciones y las lecturas a datos.
 */

import { es, formatear } from '@/comun/i18n/es';
import { globalesSchema, momentoPrincipal } from '@/comun/modelo/esquemas/onboarding';
import { fechaLocal, sumarDias } from '@/comun/util/dates';
import { leerEnfoqueHasta } from '@/zonas/enfoque/datos/repositorioEnfoque';
import { estaEnEnfoque, quitarAvisosDuranteEnfoque } from '@/zonas/enfoque/logica/enfoque';

import {
  guardarAvisoMotivacional,
  leerEstiloAvisos,
  leerFechasConRegistro,
  leerFuentesAvisos,
  leerFuentesContexto,
  leerUltimoAvisoMotivacional,
  type FuentesContexto,
} from '../datos/repositorioAvisos';
import {
  alarmasExactasPermitidas as alarmasExactasDelTelefono,
  cancelarTodos,
  configurarManejador,
  leerEstadoPermiso,
  mostrarAhora,
  pedirAlarmasExactas as pedirAlarmasExactasAlTelefono,
  pedirPermisoAvisos,
  permisoAvisosConcedido,
  programarAvisos,
  registrarCanalYCategoria,
} from '../dispositivo/notificaciones';
import { DIAS_PARA_AVISO, diasSeguidos, tocaAvisoMotivacional } from './aviso-motivacional';
import { historialDelPlan } from './historial-plan';
import { siguientePaso, type SiguientePaso } from './permiso';
import { planificarAvisos, type AvisoPlaneado, type DatosAvisos } from './planificar-avisos';
import { semanaDeApoyoEnPlanes, type PlanApoyo, type SemanaApoyo } from './semana-apoyo';

export {
  ACCION_COMPLETAR,
  CANAL_RECORDATORIOS,
  CATEGORIA_HABITO,
} from '../dispositivo/notificaciones';

// ===== Constantes =====

/** Pantalla que abre el aviso motivacional al tocarlo (acceso directo, RF-13). */
export const RUTA_AVISO_MOTIVACIONAL = '/estadisticas' as const;
/** Días hacia atrás que se revisan para contar los días seguidos. */
const DIAS_REVISADOS_MOTIVACION = 400;

// Ventana móvil (SDD 7.1): cada recálculo cancela lo programado y vuelve a programar los avisos de
// los próximos 7 días. Si lo planeado no cambió desde la última vez, no se toca nada.
let ultimaFirma: string | null = null;
/** Fin de la sesión de enfoque en curso (RF-14), o null. Se lee de SQLite en cada recálculo. */
let enfoqueHasta: Date | null = null;
let enCurso: Promise<void> | null = null;
let repetir = false;

// ===== Funciones auxiliares =====

function firma(avisos: readonly AvisoPlaneado[]): string {
  return avisos.map((a) => `${a.id}@${a.fecha.getTime()}|${a.titulo}|${a.cuerpo}`).join('\n');
}

/** P5 resumida en un momento (o «varía») y, de cada plan activo, su historial y su inicio. */
function contextoDe(fuentes: FuentesContexto): Pick<DatosAvisos, 'momento' | 'planes'> {
  // P5 por día (versión 4) o un solo momento (versión 3): se resume en un momento o «varía».
  const globales = globalesSchema.safeParse(fuentes.respuestasGlobales);
  const historialGlobal = fuentes.respuestasGlobales?.historial;
  const planes: PlanApoyo[] = fuentes.planes.flatMap((p) =>
    p.creado_en
      ? [
          {
            historial: historialDelPlan(p.respuestas, historialGlobal),
            inicioPlan: fechaLocal(new Date(p.creado_en)),
          },
        ]
      : [],
  );
  return {
    momento: globales.success ? momentoPrincipal(globales.data.disponibilidad) : null,
    planes,
  };
}

async function leerDatosAvisos(userId: string): Promise<DatosAvisos | null> {
  const fuentes = await leerFuentesAvisos(userId, fechaLocal());
  if (!fuentes) return null;
  const { ajustes } = fuentes;
  return {
    estilo: ajustes.estilo,
    estrategias: ajustes.estrategias,
    segundoAviso: ajustes.segundoAviso,
    resumenNocturno: ajustes.resumenNocturno,
    horas: ajustes.horas,
    config: fuentes.config,
    ...contextoDe(fuentes),
    habitos: fuentes.habitos,
    horarios: fuentes.horarios,
    ocurrencias: fuentes.ocurrencias,
    registros: fuentes.registros,
  };
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
  // El permiso de alarmas exactas entra en la firma: al darlo se vuelven a programar (y llegan a
  // su hora) aunque la lista de avisos sea la misma.
  const nueva = `${(await alarmasExactasDelTelefono()) ? 'exactas' : 'aproximadas'}\n${firma(avisos)}`;
  if (nueva === ultimaFirma) return;
  ultimaFirma = null;
  await programarAvisos(avisos);
  ultimaFirma = nueva;
}

// ===== Principal =====

/** Se llama al abrir la app: sin un canal creado, Android 13 no muestra la pregunta del permiso. */
export async function prepararAvisos(): Promise<void> {
  // RF-14: durante el enfoque, lo que llegue con la app abierta no se muestra ni suena.
  configurarManejador(() => estaEnEnfoque(enfoqueHasta, new Date()));
  await registrarCanalYCategoria();
}

/**
 * Si el permiso está dado y, si no, qué se puede hacer (preguntar o mandar a Ajustes).
 * @returns El siguiente paso.
 */
export async function leerPermiso(): Promise<{ siguiente: SiguientePaso }> {
  return { siguiente: siguientePaso(await leerEstadoPermiso()) };
}

/** Muestra la pregunta del permiso de avisos. */
export function pedirPermiso(): Promise<boolean> {
  return pedirPermisoAvisos();
}

/** ¿Hay permiso de avisos? */
export function permisoConcedido(): Promise<boolean> {
  return permisoAvisosConcedido();
}

/** ¿Los avisos llegarán a su hora exacta? (Android: «Alarmas y recordatorios»). */
export function alarmasExactasPermitidas(): Promise<boolean> {
  return alarmasExactasDelTelefono();
}

/** Abre «Alarmas y recordatorios» y espera a que la persona vuelva. */
export function pedirAlarmasExactas(): Promise<boolean> {
  return pedirAlarmasExactasAlTelefono();
}

/**
 * Recalcula los avisos. Si llega otra petición mientras corre, se repite al terminar.
 * @param userId Usuario con sesión.
 */
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

/**
 * Reprograma los avisos sin esperar: reprogramar decenas de avisos tarda segundos (RNF-01).
 * @param userId Usuario con sesión.
 */
export function reprogramarEnSegundoPlano(userId: string): void {
  reprogramarAvisos(userId).catch((causa: unknown) => {
    console.warn('No se pudieron reprogramar los avisos', causa);
  });
}

/** Al cerrar sesión: no deben llegar avisos de la cuenta anterior. */
export async function cancelarAvisos(): Promise<void> {
  ultimaFirma = null;
  await cancelarTodos();
}

/**
 * Fin de la sesión de enfoque en memoria (RF-14): el manejador de avisos lo consulta al momento,
 * sin esperar a SQLite. Lo fija el servicio del modo enfoque al empezar o terminar.
 * @param hasta Fin de la sesión, o null si terminó.
 */
export function fijarEnfoqueEnMemoria(hasta: Date | null): void {
  enfoqueHasta = hasta;
}

/**
 * Aviso motivacional (RF-13): se llama al completar un paso. Si con lo de hoy se llega a 3, 6, 9…
 * días seguidos y hoy no se avisó, llega al momento como banner y al tocarlo abre Progreso. Sin
 * permiso, en modo enfoque o con el estilo «Lo mínimo» no se gasta el aviso del día.
 * @param userId Usuario con sesión.
 */
export async function mandarAvisoMotivacional(userId: string): Promise<void> {
  if (!(await permisoAvisosConcedido()) || estaEnEnfoque(enfoqueHasta, new Date())) {
    return;
  }
  const estilo = await leerEstiloAvisos(userId);
  if (estilo === null || estilo === 'minimo') {
    return;
  }
  const hoy = fechaLocal();
  const fechas = await leerFechasConRegistro(userId, sumarDias(hoy, -DIAS_REVISADOS_MOTIVACION));
  const dias = diasSeguidos(fechas, hoy);
  if (!tocaAvisoMotivacional(dias, await leerUltimoAvisoMotivacional(userId), hoy)) {
    return;
  }
  await guardarAvisoMotivacional(userId, hoy);
  const t = es.avisos;
  await mostrarAhora({
    titulo: formatear(t.motivacionTitulo, { n: dias }),
    cuerpo:
      t.motivacionCuerpo[(dias / DIAS_PARA_AVISO) % t.motivacionCuerpo.length] ??
      t.motivacionCuerpo[0] ??
      '',
    datos: { ruta: RUTA_AVISO_MOTIVACIONAL },
  });
}

/**
 * Semana de apoyo que toca hoy (3 o 4), para el mensaje en Hoy.
 * @param userId Usuario con sesión.
 * @returns La semana, o null.
 */
export async function leerSemanaApoyo(userId: string): Promise<SemanaApoyo | null> {
  const { planes } = contextoDe(await leerFuentesContexto(userId));
  return semanaDeApoyoEnPlanes(planes, fechaLocal());
}
