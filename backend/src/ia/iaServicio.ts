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
 * @version 1.1.0
 * @historial 1.0.0 (2026-11-23): creación. 1.1.0: el plan usa el motor compartido y devuelve
 *   el borrador completo de la app.
 */

import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { PrismaServicio } from '../baseDatos/prismaServicio.js';
import { leerConfiguracion } from '../comun/configuracion.js';
import { ErrorConCodigo } from '../comun/errorConCodigo.js';
import {
  respuestasSchema,
  tieneObstaculo,
  type Area,
  type Respuestas,
} from '@most/compartido/encuesta';
import {
  alternativasDeNivel,
  generarPlan as calcularPlanMotor,
  sugerenciasDeHabitos,
  type ConfigPlan,
} from '@most/compartido/motorPlan';
import { borradorPlanSchema, type BorradorPlan, type HabitoPlan } from '@most/compartido/plan';
import { z } from 'zod';

import { aFilaCatalogo, combinarConMicroPasos } from './combinarPlan.js';
import {
  esquemaMetaIa,
  esquemaPasoLigeroIa,
  esquemaPlanIa,
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
import { armarHabitoDesdeCatalogo } from './planCatalogo.js';
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
const LARGO_MAXIMO_RESUMEN = 300;

/** Valores de app_config que usa el motor del plan. */
const esquemaConfigPlan = z.object({
  presupuestos: z.object({
    menos_10: z.number(),
    '10_20': z.number(),
    '20_40': z.number(),
    mas_40: z.number(),
  }),
  horas_por_momento: z.object({
    manana: z.string(),
    mediodia: z.string(),
    tarde: z.string(),
    noche: z.string(),
    flexible_aviso: z.string(),
    flexible_segundo_aviso: z.string(),
  }),
});

// ===== Principal =====

@Injectable()
export class IaServicio {
  constructor(
    private readonly prisma: PrismaServicio,
    @Inject(PROVEEDOR_IA) private readonly proveedor: ProveedorIa,
  ) {}

  /**
   * Borrador del plan desde la encuesta (UC-02). El motor del plan (compartido con la app) calcula
   * hora, aviso, nivel y ajustes; la IA propone la secuencia de micro-pasos de cada hábito (o el
   * catálogo, si la IA no responde). Tiene la misma forma que la app ya sabe mostrar y guardar.
   * @param usuarioId Usuario con sesión.
   * @param respuestas Respuestas validadas de la encuesta.
   * @param minutosOcupados Minutos que ya usan sus otros hábitos (planes siguientes).
   * @returns Borrador; origen "catalogo" si la IA no estuvo disponible.
   */
  async generarPlan(
    usuarioId: string,
    respuestas: Respuestas,
    minutosOcupados = 0,
  ): Promise<BorradorPlan> {
    const catalogo = (await this.prisma.habit_catalog.findMany()).map(aFilaCatalogo);
    const { motor: config, ventanaFlexible } = await this.leerConfigPlan();
    const plan = calcularPlanMotor(respuestas, catalogo, config, minutosOcupados);

    // El tiempo libre se reparte entre los hábitos con duración (definición 5, P4).
    const libre = Math.max(0, config.presupuestos[respuestas.tiempo] - minutosOcupados);
    const conDuracion = plan.habitos.filter((habito) => habito.duracion_min > 0).length;
    const limitesDe = (habito: HabitoPlan): LimitesHabito => ({
      minutosMaximos: Math.floor(libre / Math.max(conDuracion, 1)),
      categoria: habito.categoria,
      objetivo: habito.objetivo,
      pasoInicial: habito.nivel,
      usaDuracionReducida: habito.usa_duracion_reducida,
    });

    const mensaje = JSON.stringify({
      respuestas,
      minutos_maximos_por_habito: limitesDe(plan.habitos[0]).minutosMaximos,
    });
    const desdeIa = await this.pedirIa(
      usuarioId,
      'plan',
      INSTRUCCIONES_PLAN,
      mensaje,
      esquemaPlanIa,
      (propuesta) => {
        const propuestos = plan.habitos.map((habito) => {
          const deLaIa = propuesta.habitos.find((h) => h.objetivo === habito.objetivo);
          return deLaIa ? corregirHabito(deLaIa, limitesDe(habito)) : null;
        });
        return propuestos.every((habito) => habito !== null)
          ? {
              resumen: propuesta.resumen.trim().slice(0, LARGO_MAXIMO_RESUMEN),
              propuestos: propuestos as HabitoPropuesto[],
            }
          : null;
      },
    );

    const sinRecursos = tieneObstaculo(respuestas, 'recursos');
    const habitos = plan.habitos.map((habito, indice) => {
      if (desdeIa) {
        return combinarConMicroPasos(habito, desdeIa.propuestos[indice], true);
      }
      const delCatalogo = armarHabitoDesdeCatalogo(catalogo, habito.objetivo, sinRecursos);
      const corregido = delCatalogo ? corregirHabito(delCatalogo, limitesDe(habito)) : null;
      return corregido ? combinarConMicroPasos(habito, corregido, false) : habito;
    });

    // Se valida con el mismo esquema que usa la app: si algo no cuadra, se nota aquí y no allá.
    return borradorPlanSchema.parse({
      origen: desdeIa ? 'ia' : 'catalogo',
      resumen: desdeIa?.resumen ?? null,
      habitos,
      ajustes: plan.ajustes,
      alternativas: alternativasDeNivel(respuestas, catalogo, config, plan.habitos),
      sugerencias: sugerenciasDeHabitos(respuestas, catalogo, config),
      ventana_flexible: ventanaFlexible,
    });
  }

  /**
   * Perfil de la encuesta (UC-01). Sin él no se pueden armar micro-pasos a la medida.
   * @param usuarioId Usuario con sesión.
   * @returns Las respuestas validadas.
   */
  private async leerPerfil(usuarioId: string): Promise<Respuestas> {
    const fila = await this.prisma.onboarding_answers.findUnique({
      where: { user_id: usuarioId },
      select: { respuestas: true },
    });
    const perfil = respuestasSchema.safeParse(fila?.respuestas);
    if (!perfil.success) {
      throw new ErrorConCodigo(
        HttpStatus.CONFLICT,
        'PERFIL_INCOMPLETO',
        'Antes de armar tus micro-pasos, cuéntanos un poco de ti con 7 preguntas.',
      );
    }
    return perfil.data;
  }

  /**
   * Convierte una meta escrita por la persona en un hábito con micro-pasos (RF-03).
   * @param usuarioId Usuario con sesión.
   * @param texto Meta escrita.
   * @param categoria Área elegida.
   * @returns Hábito propuesto.
   */
  async descomponerMeta(usuarioId: string, texto: string, categoria: Area): Promise<PropuestaMeta> {
    const perfil = await this.leerPerfil(usuarioId);
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
    // UC-01: los micro-pasos se arman con el perfil de la encuesta, no solo con los minutos.
    const mensaje = JSON.stringify({
      meta: texto,
      area: categoria,
      minutos_maximos_por_habito: limites.minutosMaximos,
      perfil: {
        historial: perfil.historial,
        tiempo: perfil.tiempo,
        disponibilidad: perfil.disponibilidad,
        obstaculos: perfil.obstaculos,
      },
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
      select: {
        titulo: true,
        duracion_min: true,
        paso_actual: true,
        micro_pasos: { orderBy: { orden: 'asc' } },
      },
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
    const delPaso = pasos.find((paso) => paso.orden === (habito.paso_actual ?? 1)) ?? pasos[0];
    // Se aligera lo que hace hoy (puede ser ya su versión reducida), no el paso completo.
    const actual = delPaso
      ? { ...delPaso, titulo: habito.titulo, duracion_min: habito.duracion_min }
      : undefined;
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

  /** Presupuestos y horas de app_config para el motor del plan. */
  private async leerConfigPlan(): Promise<{
    motor: ConfigPlan;
    ventanaFlexible: BorradorPlan['ventana_flexible'];
  }> {
    const filas = await this.prisma.app_config.findMany({
      where: { clave: { in: ['presupuestos', 'horas_por_momento'] } },
    });
    const config = esquemaConfigPlan.parse(
      Object.fromEntries(filas.map((fila) => [fila.clave, fila.valor])),
    );
    const horas = config.horas_por_momento;
    return {
      motor: { presupuestos: config.presupuestos, horas },
      ventanaFlexible: { inicio: horas.flexible_aviso, fin: horas.flexible_segundo_aviso },
    };
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
