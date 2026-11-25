/**
 * @file servicioPlantas.ts
 * @proyecto most.
 * @descripcion Servicio de la zona Plantas (SDD 6.4 y 9.4, RF-16): la puerta de la presentación
 *   al jardín, la tienda y los hitos del micro-paso. Decide qué se equipa dónde, qué hito se
 *   alcanzó y si suena; la capa de datos solo lee y guarda, y la de dispositivo suena y vibra.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.1.0
 * @historial 1.0.0 (2026-11-24): creación (antes mezclado en db/rewards-repository.ts y
 *   db/hitos-repository.ts).
 *   1.1.0 (2026-11-25): elegir la planta que se muestra en Hoy.
 */

import { avisarCambioLocal } from '@/comun/logica/cambios-locales';
import { sincronizarAhora } from '@/comun/logica/sync/sync-engine';
import type { Area } from '@/comun/modelo/esquemas/onboarding';

import {
  celebrarHitoNuevo,
  contarHechosDelPaso,
  guardarSonidoHitos,
  leerHabitoDelHito,
  leerSonidoHitos,
} from '../datos/repositorioHitos';
import {
  comprarEnServidor,
  guardarEquipados,
  leerAccesoriosPropios,
  leerJardin,
  type Accesorio,
  type Jardin,
  type ResultadoCompra,
} from '../datos/repositorioPlantas';
import { guardarPlantaElegida, leerPlantaElegida } from '../datos/repositorioPlantaHoy';
import { reproducirSonidoHito, vibrarLogro } from '../dispositivo/celebracion';
import { plantaDestacada } from './planta-destacada';
import { cambiosAlEquipar, plantaParaEquipar, type TipoAccesorio } from './equipar';
import { avanceDelPaso, hitoAlcanzado, type AvancePaso, type PorcentajeHito } from './hitos';

// ===== Tipos =====

export type HitoAlcanzado = {
  porcentaje: PorcentajeHito;
  titulo: string;
  avance: AvancePaso;
};

/** El jardín y la planta que se muestra en Hoy (la elegida o, si no hay, la más avanzada). */
export type JardinConHoy = Jardin & { plantaEnHoy: Area | null };

export type { Accesorio, Jardin, ResultadoCompra };

// ===== Jardín y tienda =====

/**
 * Las 5 plantas (aunque el área no tenga hábitos), su fase, lo que llevan puesto y el saldo.
 * @param userId Usuario con sesión.
 * @returns El jardín, con la planta que se muestra en Hoy.
 */
export async function leerMiJardin(userId: string): Promise<JardinConHoy> {
  const [jardin, elegida] = await Promise.all([leerJardin(userId), leerPlantaElegida(userId)]);
  return { ...jardin, plantaEnHoy: plantaDestacada(jardin.plantas, elegida)?.area ?? null };
}

/**
 * «Mostrar en Hoy»: esa planta aparece en Hoy hasta que elija otra.
 * @param userId Usuario con sesión.
 * @param area Área de la planta.
 */
export async function mostrarPlantaEnHoy(userId: string, area: Area): Promise<void> {
  await guardarPlantaElegida(userId, area);
  // Hoy y el Jardín vuelven a leer el jardín.
  avisarCambioLocal();
}

/**
 * Pone el accesorio en la planta (`poner` = true) o se lo quita solo a ella. Si la planta ya
 * llevaba otro del mismo tipo, ese se le quita (las demás plantas no cambian).
 * @param userId Usuario con sesión.
 * @param accesorio Accesorio propio.
 * @param categoryId Planta.
 * @param poner Ponerlo o quitarlo.
 */
export async function equiparAccesorio(
  userId: string,
  accesorio: Accesorio,
  categoryId: string,
  poner: boolean,
): Promise<void> {
  const propios = await leerAccesoriosPropios(userId);
  const actual = propios.find((p) => p.id === accesorio.propioId);
  if (!actual) throw new Error('El accesorio no es del usuario');
  await guardarEquipados(cambiosAlEquipar(actual, categoryId, poner, propios));
}

/**
 * «Equipar ahora» en la Tienda. Con `origen`, lo pone en la planta desde la que se abrió la Tienda;
 * si no, elige una que todavía no lo lleve.
 * @param userId Usuario con sesión.
 * @param accessoryId Accesorio recién comprado.
 * @param origen Área desde la que se abrió la Tienda.
 * @returns Dónde quedó, o null si el objeto todavía no llega a este teléfono (para reintentar).
 */
export async function equiparDesdeTienda(
  userId: string,
  accessoryId: string,
  origen: Area | null,
): Promise<{ area: Area; tipo: TipoAccesorio; puesto: string; quitado: string | null } | null> {
  let jardin = await leerJardin(userId);
  let accesorio = jardin.accesorios.find((a) => a.id === accessoryId);
  if (accesorio?.propioId == null) {
    await sincronizarAhora().catch(() => {});
    jardin = await leerJardin(userId);
    accesorio = jardin.accesorios.find((a) => a.id === accessoryId);
  }
  if (!accesorio || accesorio.propioId === null) return null;

  const origenId = jardin.plantas.find((p) => p.area === origen)?.categoryId ?? null;
  const destino = plantaParaEquipar(
    accesorio.tipo,
    jardin.plantas,
    origenId,
    accesorio.categoriasEquipadas,
  );
  const planta = jardin.plantas.find((p) => p.categoryId === destino);
  if (!planta) return null;

  // Si la planta ya llevaba otro del mismo tipo, se reemplaza: se avisa al llegar a sus detalles.
  const quitado = jardin.accesorios.find(
    (a) =>
      a.id !== accesorio.id &&
      a.tipo === accesorio.tipo &&
      a.categoriasEquipadas.includes(planta.categoryId),
  );
  await equiparAccesorio(userId, accesorio, planta.categoryId, true);
  return {
    area: planta.area,
    tipo: accesorio.tipo,
    puesto: accesorio.nombre,
    quitado: quitado?.nombre ?? null,
  };
}

/**
 * Compra en el servidor (necesita conexión) y después descarga el saldo y el accesorio.
 * @param accessoryId Accesorio.
 * @returns Cómo salió.
 */
export async function comprarAccesorio(accessoryId: string): Promise<ResultadoCompra> {
  const resultado = await comprarEnServidor(accessoryId);
  if (resultado === 'comprado') {
    await sincronizarAhora().catch(() => {});
  }
  return resultado;
}

// ===== Hitos del micro-paso (RF-16) =====

/**
 * Después de completar un hábito: si con este registro el paso llegó a 5 o a 8 de 10 y ese hito
 * no se celebró antes en este paso, lo deja celebrado y lo devuelve.
 * @param userId Usuario con sesión.
 * @param habitId Hábito recién completado.
 * @returns El hito, o null.
 */
export async function revisarHito(userId: string, habitId: string): Promise<HitoAlcanzado | null> {
  const habito = await leerHabitoDelHito(habitId);
  if (!habito) return null;
  const despues = await contarHechosDelPaso(habitId, habito.nivel_desde);
  const porcentaje = hitoAlcanzado(despues - 1, despues);
  if (porcentaje === null) return null;
  // Un hito por paso: desmarcar y volver a marcar no lo repite.
  const clave = `${habitId}|${habito.paso_actual ?? ''}|${habito.nivel_desde ?? ''}|${porcentaje}`;
  if (!(await celebrarHitoNuevo(userId, clave))) return null;
  return { porcentaje, titulo: habito.titulo, avance: avanceDelPaso(despues) };
}

/**
 * Si los logros suenan (RI-03, audio opcional).
 * @param userId Usuario con sesión.
 * @returns true si suena.
 */
export function leerSonidoLogros(userId: string): Promise<boolean> {
  return leerSonidoHitos(userId);
}

/**
 * Enciende o apaga el sonido de los logros.
 * @param userId Usuario con sesión.
 * @param activo true para que suene.
 */
export function guardarSonidoLogros(userId: string, activo: boolean): Promise<void> {
  return guardarSonidoHitos(userId, activo);
}

/**
 * Al mostrar la celebración de un hito: vibra y, si está encendido, suena.
 * @param conSonido Preferencia de sonido.
 */
export function celebrarHito(conSonido: boolean): void {
  vibrarLogro();
  if (conSonido) {
    reproducirSonidoHito();
  }
}
