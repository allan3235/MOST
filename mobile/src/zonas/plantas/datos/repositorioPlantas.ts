/**
 * @file repositorioPlantas.ts
 * @proyecto most.
 * @descripcion Capa de datos del jardín y la tienda (SDD 6.4 y 9.4): lee de SQLite las plantas,
 *   los accesorios y el saldo, guarda lo que se equipa (con la cola de salida, funciona sin
 *   conexión) y pide la compra al servidor (necesita conexión: el servidor revisa el saldo real).
 *   Las reglas de qué se equipa dónde viven en la capa de lógica.
 * @autor Equipo most. (código heredado de Habit Green; reorganizado por Allan con Claude Code)
 * @fecha 2026-11-24
 * @version 1.1.0
 * @historial 1.1.0 (2026-11-24): pasa a zonas/plantas/datos; equipar y comprar se orquestan en
 *   servicioPlantas (antes db/rewards-repository.ts).
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { aplicar } from '@/comun/datos/aplicar-cambio';
import { ErrorApi, pedirApi } from '@/comun/datos/clienteApi';
import { actualizarFila, getDb, leerFilas } from '@/comun/datos/database';
import type { OperacionOutbox } from '@/comun/logica/sync/sync-rules';
import { AREAS, type Area } from '@/comun/modelo/esquemas/onboarding';
import type {
  AccesorioPropio,
  CambioEquipado,
  TipoAccesorio,
} from '@/zonas/plantas/logica/equipar';

// Jardín y tienda (SDD 6.4 y 9.4). Se lee de SQLite. Equipar funciona sin conexión (cola de
// salida); comprar no, porque el servidor revisa el saldo real.

export type Accesorio = {
  id: string;
  tipo: TipoAccesorio;
  nombre: string;
  precio: number;
  orden: number;
  /** id de user_accessories si ya es del usuario. */
  propioId: string | null;
  /** category_id de las plantas que lo llevan puesto (puede ser más de una). */
  categoriasEquipadas: string[];
};

export type PlantaJardin = {
  area: Area;
  categoryId: string;
  fase: number;
  tieneHabitos: boolean;
  equipados: Accesorio[];
};

export type Jardin = { plantas: PlantaJardin[]; accesorios: Accesorio[]; saldo: number };

const ORDEN_TIPOS: TipoAccesorio[] = ['maceta', 'lentes', 'sombrero'];

async function leerAccesorios(db: SQLiteDatabase, userId: string): Promise<Accesorio[]> {
  const catalogo = await leerFilas<Omit<Accesorio, 'propioId' | 'categoriasEquipadas'>>(
    db,
    'accessories',
    '1 = 1 ORDER BY tipo, orden',
  );
  const propios = await leerFilas<{
    id: string;
    accessory_id: string;
    categorias_equipadas: string[] | null;
  }>(db, 'user_accessories', 'user_id = ? AND eliminado_en IS NULL', [userId]);
  return catalogo.map((a) => {
    const propio = propios.find((p) => p.accessory_id === a.id);
    return {
      ...a,
      propioId: propio?.id ?? null,
      categoriasEquipadas: propio?.categorias_equipadas ?? [],
    };
  });
}

async function leerSaldo(db: SQLiteDatabase, userId: string): Promise<number> {
  const fila = await db.getFirstAsync<{ saldo: number }>(
    'SELECT saldo FROM wallets WHERE user_id = ?',
    [userId],
  );
  return fila?.saldo ?? 0;
}

/** Las 5 plantas (aunque el área no tenga hábitos), su fase y lo que llevan puesto. */
export async function leerJardin(userId: string): Promise<Jardin> {
  const db = await getDb();
  const categorias = await db.getAllAsync<{ id: string; clave: string }>(
    'SELECT id, clave FROM categories WHERE user_id IS NULL',
  );
  const progreso = await db.getAllAsync<{ category_id: string; fase: number }>(
    'SELECT category_id, fase FROM plant_progress WHERE user_id = ?',
    [userId],
  );
  const conHabitos = await db.getAllAsync<{ category_id: string }>(
    'SELECT DISTINCT category_id FROM habits WHERE activo = 1 AND archivado_en IS NULL',
  );
  const accesorios = await leerAccesorios(db, userId);

  const plantas = AREAS.flatMap((area) => {
    const categoria = categorias.find((c) => c.clave === area);
    if (!categoria) return [];
    return [
      {
        area,
        categoryId: categoria.id,
        fase: progreso.find((p) => p.category_id === categoria.id)?.fase ?? 1,
        tieneHabitos: conHabitos.some((h) => h.category_id === categoria.id),
        equipados: accesorios
          .filter((a) => a.categoriasEquipadas.includes(categoria.id))
          .sort((a, b) => ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo)),
      },
    ];
  });
  return { plantas, accesorios, saldo: await leerSaldo(db, userId) };
}

/**
 * Accesorios que ya son de la persona, con las plantas que los llevan.
 * @param userId Usuario con sesión.
 * @returns Sus accesorios.
 */
export async function leerAccesoriosPropios(userId: string): Promise<AccesorioPropio[]> {
  const db = await getDb();
  return (await leerAccesorios(db, userId)).flatMap((a) =>
    a.propioId === null
      ? []
      : [{ id: a.propioId, tipo: a.tipo, categorias_equipadas: a.categoriasEquipadas }],
  );
}

/**
 * Guarda en qué plantas queda cada accesorio (una transacción con su cola de salida).
 * @param cambios Accesorios y sus plantas nuevas.
 */
export async function guardarEquipados(cambios: readonly CambioEquipado[]): Promise<void> {
  await aplicar(async (db) => {
    const ahora = new Date().toISOString();
    const operaciones: OperacionOutbox[] = [];
    for (const cambio of cambios) {
      const datos = { categorias_equipadas: cambio.categorias_equipadas };
      await actualizarFila(
        db,
        'user_accessories',
        { id: cambio.id },
        { ...datos, updated_at: ahora },
      );
      operaciones.push({
        operacion: 'update' as const,
        tabla: 'user_accessories',
        clave: cambio.id,
        payload: datos,
      });
    }
    return operaciones;
  });
}

export type ResultadoCompra = 'comprado' | 'sin_conexion' | 'saldo_insuficiente' | 'error';

/**
 * Pide la compra al servidor (necesita conexión). No descarga el saldo nuevo: eso es del servicio.
 * @param accessoryId Accesorio a comprar.
 * @returns Cómo salió.
 */
export async function comprarEnServidor(accessoryId: string): Promise<ResultadoCompra> {
  try {
    await pedirApi('/tienda/comprar', { metodo: 'POST', cuerpo: { accessory_id: accessoryId } });
    return 'comprado';
  } catch (error) {
    if (!(error instanceof ErrorApi)) return 'sin_conexion';
    return error.message === 'saldo_insuficiente' ? 'saldo_insuficiente' : 'error';
  }
}
