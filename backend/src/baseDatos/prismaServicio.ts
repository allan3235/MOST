/**
 * @file prismaServicio.ts
 * @proyecto most.
 * @descripcion Cliente de Prisma para consultas con tipos (cuentas, y lo que venga: IA, planes).
 *   Los modelos salen de prisma/schema.prisma. La sincronización genérica usa BaseDatosServicio
 *   (pg) porque arma SQL dinámico y necesita las marcas de tiempo exactas.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { leerConfiguracion } from '../comun/configuracion.js';
import { PrismaClient } from '../generated/prisma/client.js';

// ===== Principal =====

@Injectable()
export class PrismaServicio extends PrismaClient implements OnModuleDestroy {
  constructor() {
    // Prisma 7 se conecta a través de un "adaptador"; este usa el controlador pg.
    super({ adapter: new PrismaPg({ connectionString: leerConfiguracion().DATABASE_URL }) });
  }

  /** Cierra las conexiones al apagar el servidor. */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
