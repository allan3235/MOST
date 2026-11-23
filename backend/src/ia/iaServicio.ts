/**
 * @file iaServicio.ts
 * @proyecto most.
 * @descripcion Genera hábitos y micro-pasos con IA. Para cada petición: revisa el límite diario
 *   del usuario, pide a Claude (hasta 2 intentos si la respuesta no sirve), aplica las reglas de
 *   MOST y, si nada funciona, usa el catálogo. Cada llamada queda registrada en ai_requests.
 *   A la IA solo se envían claves de la encuesta o el texto de la meta: nunca nombre ni correo.
 *   Nada se guarda como hábito aquí: se devuelve un borrador y la app lo guarda al confirmar
 *   (UC-15) por /sync/lote.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { z } from 'zod';

import { PrismaServicio } from '../baseDatos/prismaServicio.js';
import { leerConfiguracion } from '../comun/configuracion.js';
import { ErrorConCodigo } from '../comun/errorConCodigo.js';
import {
  buscarAreaDeObjetivo,
  PRESUPUESTO_POR_TIEMPO,
  type Area,
  type Respuestas,
} from './esquemasEncuesta.js';
import {
  esquemaMetaIa,
  esquemaPasoLigeroIa,
  esquemaPlanIa,
  type BorradorPlan,
  type HabitoPropuesto,
  type MicroPaso,
  type OrigenPropuesta,
} from './esquemasIa.js';
import {
  INSTRUCCIONES_META,
  INSTRUCCIONES_PASO_LIGERO,
  INSTRUCCIONES_PLAN,
} from './instruccionesIa.js';
import type { TareaIa } from './modelosIa.js';
import { armarHabitoDesdeCatalogo, RESUMEN_CATALOGO } from './planCatalogo.js';
import { PROVEEDOR_IA, type ProveedorIa } from './proveedorIa.js';
import {
  corregirHabito,
  corregirPasoLigero,
  crearPasoLigeroSinIa,
  type LimitesHabito,
} from './reglasMicroPasos.js';

// ===== Tipos =====

export type PropuestaMeta = { origen: 'ia'; habito: HabitoPropuesto };

export type PropuestaPasoLigero = {
  origen: OrigenPropuesta;
  /** Orden del paso que se aligera (el nuevo paso irá antes de él). */
  antes_de: number;
  paso: Omit<MicroPaso, 'orden'>;
};

// ===== Constantes =====

const INTENTOS_MAXIMOS = 2;
/** Estados que cuentan para el límite diario (sí se llamó a la IA). */
const ESTADOS_QUE_CUENTAN = ['ok', 'error', 'rechazo', 'invalida'];
const PRESUPUESTO_POR_DEFECTO = 20;
const PASO_INICIAL_SI_MANTIENE = 2;

// ===== Principal =====

@Injectable()
export class IaServicio {
  constructor(
    private readonly prisma: PrismaServicio,
    @Inject(PROVEEDOR_IA) private readonly proveedor: ProveedorIa,
  ) {}

  /**
   * Borrador del plan desde la encuesta (UC-02): un hábito por objetivo, con micro-pasos.
   * @param usuarioId Usuario con sesión.
   * @param respuestas Respuestas validadas de la encuesta.
   * @returns Borrador; origen "catalogo" si la IA no estuvo disponible.
   */
  async generarPlan(usuarioId: string, respuestas: Respuestas): Promise<BorradorPlan> {
    const filas = await this.prisma.habit_catalog.findMany({
      where: { objetivo: { in: respuestas.objetivos } },
    });
    const sinRecursos = respuestas.obstaculo === 'recursos';
    const respaldos = new Map(
      respuestas.objetivos.map((objetivo) => [
        objetivo,
        armarHabitoDesdeCatalogo(filas, objetivo, sinRecursos),
      ]),
    );

    // El tiempo diario se reparte entre los hábitos que tienen duración (definición 5, P4).
    const conDuracion = [...respaldos.values()].filter(
      (habito) => (habito?.micro_pasos[0]?.duracion_min ?? 1) > 0,
    ).length;
    const presupuesto = PRESUPUESTO_POR_TIEMPO[respuestas.tiempo];
    const limitesDe = (objetivo: string): LimitesHabito => ({
      minutosMaximos: Math.floor(presupuesto / Math.max(conDuracion, 1)),
      categoria: buscarAreaDeObjetivo(objetivo) ?? respuestas.areas[0],
      objetivo,
      pasoInicial: respuestas.historial === 'mantiene' ? PASO_INICIAL_SI_MANTIENE : 1,
      usaDuracionReducida: respuestas.obstaculo === 'poco_tiempo',
    });

    const mensaje = JSON.stringify({
      respuestas,
      minutos_maximos_por_habito: limitesDe(respuestas.objetivos[0]).minutosMaximos,
    });
    const desdeIa = await this.pedirIa(
      usuarioId,
      'plan',
      INSTRUCCIONES_PLAN,
      mensaje,
      esquemaPlanIa,
      (plan) => {
        const habitos = respuestas.objetivos.map((objetivo) => {
          const propuesto = plan.habitos.find((habito) => habito.objetivo === objetivo);
          return propuesto ? corregirHabito(propuesto, limitesDe(objetivo)) : null;
        });
        return habitos.every((habito) => habito !== null)
          ? { resumen: plan.resumen.trim().slice(0, 300), habitos: habitos as HabitoPropuesto[] }
          : null;
      },
    );
    if (desdeIa) {
      return { origen: 'ia', ...desdeIa };
    }

    const habitos = respuestas.objetivos
      .map((objetivo) => {
        const respaldo = respaldos.get(objetivo);
        return respaldo ? corregirHabito(respaldo, limitesDe(objetivo)) : null;
      })
      .filter((habito): habito is HabitoPropuesto => habito !== null);
    return { origen: 'catalogo', resumen: RESUMEN_CATALOGO, habitos };
  }

  /**
   * Convierte una meta escrita por la persona en un hábito con micro-pasos (RF-03).
   * @param usuarioId Usuario con sesión.
   * @param texto Meta escrita.
   * @param categoria Área elegida.
   * @returns Hábito propuesto.
   */
  async descomponerMeta(usuarioId: string, texto: string, categoria: Area): Promise<PropuestaMeta> {
    const ajustes = await this.prisma.user_settings.findUnique({
      where: { user_id: usuarioId },
      select: { presupuesto_min: true },
    });
    const limites: LimitesHabito = {
      minutosMaximos: ajustes?.presupuesto_min ?? PRESUPUESTO_POR_DEFECTO,
      categoria,
      objetivo: null,
      pasoInicial: 1,
      usaDuracionReducida: false,
    };
    const mensaje = JSON.stringify({
      meta: texto,
      area: categoria,
      minutos_maximos_por_habito: limites.minutosMaximos,
    });

    // Objeto (no variable suelta): TypeScript no ve los cambios hechos dentro del callback.
    const revision = { noApropiada: false };
    const habito = await this.pedirIa(
      usuarioId,
      'meta',
      INSTRUCCIONES_META,
      mensaje,
      esquemaMetaIa,
      (meta) => {
        revision.noApropiada = !meta.es_apropiada;
        return corregirHabito(meta.habito, limites);
      },
    );
    if (revision.noApropiada) {
      throw new ErrorConCodigo(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'META_NO_APROPIADA',
        'Esa meta no la podemos convertir en un hábito. ¿Probamos con otra forma de decirla?',
      );
    }
    if (!habito) {
      throw new ErrorConCodigo(
        HttpStatus.SERVICE_UNAVAILABLE,
        'IA_NO_DISPONIBLE',
        'No pudimos armar tus micro-pasos en este momento. Intenta de nuevo en un rato.',
      );
    }
    return { origen: 'ia', habito };
  }

  /**
   * Propone un paso intermedio más ligero que el actual (meta intermedia, RF-15). Usa el modelo
   * pequeño: el plan ya existe y solo hay que ajustar un paso. No guarda nada.
   * @param usuarioId Usuario con sesión.
   * @param habitId Hábito con micro-pasos.
   * @returns Paso más ligero y antes de qué paso va.
   */
  async proponerPasoLigero(usuarioId: string, habitId: string): Promise<PropuestaPasoLigero> {
    const habito = await this.prisma.habits.findFirst({
      where: { id: habitId, user_id: usuarioId, archivado_en: null },
      select: { titulo: true, paso_actual: true, micro_pasos: { orderBy: { orden: 'asc' } } },
    });
    if (!habito) {
      throw new ErrorConCodigo(
        HttpStatus.NOT_FOUND,
        'HABITO_NO_ENCONTRADO',
        'No encontramos ese hábito.',
      );
    }
    const pasos: MicroPaso[] = habito.micro_pasos.map((paso) => ({
      orden: paso.orden,
      titulo: paso.titulo,
      descripcion: paso.descripcion ?? '',
      duracion_min: paso.duracion_min,
      duracion_reducida_min: paso.duracion_reducida_min,
      dias_semana: paso.dias_semana,
    }));
    const actual = pasos.find((paso) => paso.orden === (habito.paso_actual ?? 1)) ?? pasos[0];
    if (!actual) {
      throw new ErrorConCodigo(
        HttpStatus.CONFLICT,
        'SIN_MICRO_PASOS',
        'Este hábito todavía no tiene micro-pasos.',
      );
    }

    const mensaje = JSON.stringify({
      habito: habito.titulo,
      paso_actual: actual,
      secuencia: pasos,
    });
    const paso = await this.pedirIa(
      usuarioId,
      'paso_ligero',
      INSTRUCCIONES_PASO_LIGERO,
      mensaje,
      esquemaPasoLigeroIa,
      (respuesta) => corregirPasoLigero(respuesta.paso, actual),
    );
    return paso
      ? { origen: 'ia', antes_de: actual.orden, paso }
      : { origen: 'catalogo', antes_de: actual.orden, paso: crearPasoLigeroSinIa(actual) };
  }

  /**
   * Llama a la IA con límite diario, reintento y registro. Devuelve null si no hubo una
   * respuesta útil (el llamador decide el respaldo).
   * @param convertir Valida y corrige la respuesta; null si no sirve (se reintenta).
   */
  private async pedirIa<E extends z.ZodType, R>(
    usuarioId: string,
    tarea: TareaIa,
    instrucciones: string,
    mensaje: string,
    esquema: E,
    convertir: (datos: z.infer<E>) => R | null,
  ): Promise<R | null> {
    if (await this.superoLimite(usuarioId)) {
      await this.registrar(usuarioId, tarea, 'limite', 0);
      return null;
    }
    for (let intento = 1; intento <= INTENTOS_MAXIMOS; intento++) {
      const resultado = await this.proveedor.generar(tarea, instrucciones, mensaje, esquema);
      if (resultado.estado === 'sin_clave') {
        await this.registrar(usuarioId, tarea, 'sin_clave', 0);
        return null;
      }
      const convertido = resultado.estado === 'ok' ? convertir(resultado.datos) : null;
      const estado =
        resultado.estado === 'ok' && convertido === null ? 'invalida' : resultado.estado;
      await this.registrar(usuarioId, tarea, estado, resultado.tokens);
      if (convertido !== null) {
        return convertido;
      }
      if (resultado.estado === 'rechazo') {
        return null;
      }
    }
    return null;
  }

  /** true si el usuario ya usó sus llamadas a la IA de hoy (día UTC). */
  private async superoLimite(usuarioId: string): Promise<boolean> {
    const inicioDelDia = new Date();
    inicioDelDia.setUTCHours(0, 0, 0, 0);
    const usadas = await this.prisma.ai_requests.count({
      where: {
        user_id: usuarioId,
        creado_en: { gte: inicioDelDia },
        estado: { in: ESTADOS_QUE_CUENTAN },
      },
    });
    return usadas >= leerConfiguracion().IA_LIMITE_DIARIO;
  }

  private async registrar(
    usuarioId: string,
    tarea: TareaIa,
    estado: string,
    tokens: number,
  ): Promise<void> {
    await this.prisma.ai_requests.create({
      data: { user_id: usuarioId, funcion: tarea, estado, tokens },
    });
  }
}
