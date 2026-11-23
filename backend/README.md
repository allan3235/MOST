# most. — backend

API de most. con **NestJS**, **PostgreSQL** (en Docker) y **Prisma 7**.

## Arranque (primera vez)

Necesitas Node 24, pnpm y Docker Desktop abierto.

```bash
pnpm install                 # desde la raíz MOST/; también genera el cliente de Prisma
cd backend
cp .env.example .env         # y llena JWT_SECRETO (las instrucciones están en el archivo)
docker compose up -d         # base de datos en localhost:5433
pnpm db:migrar               # crea las tablas y los datos del catálogo
pnpm start:dev               # API en http://localhost:3001
```

Comprueba que responde: abre http://localhost:3001/salud → `{"estado":"ok","baseDatos":true}`.

## Comandos

| Comando | Para qué |
|---|---|
| `pnpm start:dev` | Servidor con recarga automática |
| `pnpm test` | Pruebas unitarias |
| `pnpm test:e2e` | Pruebas de punta a punta (necesitan la base corriendo y migrada) |
| `pnpm lint` | Revisión de código (oxlint) |
| `pnpm db:migrar` | Aplica las migraciones pendientes |
| `pnpm db:estado` | Muestra qué migraciones están aplicadas |
| `pnpm db:nueva-migracion --name <nombre>` | Crea una migración a partir de los cambios en `prisma/schema.prisma` |
| `pnpm db:studio` | Abre Prisma Studio para ver los datos |

## Cómo está organizada la base

- `prisma/schema.prisma`: el mapa de tablas y relaciones.
- `prisma/migrations/`: el historial. La migración inicial trae, además de las tablas, lo que Prisma no dibuja en el mapa:
  - las funciones SQL de recompensas (`complete_habit`, `uncomplete_habit`, `archivar_habito`, `comprar_accesorio`);
  - los disparadores;
  - las políticas RLS (cada usuario solo ve y cambia lo suyo).
- Para cambiar la base:
  1. Edita `schema.prisma`.
  2. Corre `pnpm db:nueva-migracion --name ...`.
  3. Revisa el SQL generado y agrégale funciones o políticas si hacen falta.
  4. Corre `pnpm db:migrar`.

  **Nunca edites una migración que ya se aplicó.**

## Rutas

| Ruta | Sesión | Qué hace |
|---|---|---|
| `GET /salud` | No | Estado del servidor y de la base |
| `POST /auth/registro` · `POST /auth/login` | No | Crear cuenta / iniciar sesión → `{ token, usuario }` |
| `GET /auth/yo` | Sí | Usuario del token |
| `POST /sync/operacion` | Sí | Una operación: `upsert`, `update`, `complete`, `uncomplete`, `archive` |
| `POST /sync/lote` | Sí | Varias operaciones en una transacción (todas o ninguna) |
| `GET /sync/cambios` | Sí | Filas que cambiaron desde un cursor (`?tabla=&desde=`) |
| `POST /sync/fila` | Sí | Una fila por su clave |
| `POST /tienda/comprar` | Sí | Comprar un accesorio |

«Sesión» = encabezado `Authorization: Bearer <token>`. Los rechazos definitivos (por ejemplo, una política RLS o una regla de negocio) responden con `code`, y la app los saca de su cola en vez de reintentarlos.
