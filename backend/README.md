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
| `POST /ia/plan` | Sí | Encuesta → borrador del plan con micro-pasos (`origen: 'ia'` o `'catalogo'`) |
| `POST /ia/meta` | Sí | Meta escrita → hábito con micro-pasos (503 `IA_NO_DISPONIBLE`, 422 `META_NO_APROPIADA`) |
| `POST /ia/paso-ligero` | Sí | Paso intermedio más ligero que el actual (meta intermedia, RF-15) |

«Sesión» = encabezado `Authorization: Bearer <token>`. Los rechazos definitivos (por ejemplo, una política RLS o una regla de negocio) responden con `code`, y la app los saca de su cola en vez de reintentarlos.

## IA (Claude)

Los hábitos y sus micro-pasos los genera Claude, con un modelo según la tarea para no gastar de más:

| Tarea | Modelo | Esfuerzo |
|---|---|---|
| Crear el plan (`/ia/plan`) y descomponer una meta (`/ia/meta`) | `claude-opus-5-5` | `medium` |
| Paso más ligero (`/ia/paso-ligero`) | `claude-haiku-5-5` | `low` |

- **Clave:** `ANTHROPIC_API_KEY` en `backend/.env`. Nunca va en la app ni en el repositorio. Sin clave, los planes salen del catálogo y `/ia/meta` responde 503.
- **Reglas de MOST:** la IA propone y `src/ia/reglasMicroPasos.ts` corrige. El primer paso dura 5 min o menos; hay de 3 a 5 pasos, cada uno a lo mucho el triple del anterior; nada pasa del tiempo diario; la reducida es de al menos 1 min.
- **Respaldo:** hay 2 intentos. Si fallan, se acaba el límite diario (`IA_LIMITE_DIARIO`) o la IA rechaza la petición, el plan sale del catálogo semilla.
- **Privacidad:** a la IA solo se envían claves de la encuesta o el texto de la meta, nunca nombre ni correo.
- **Uso:** cada llamada queda en la tabla `ai_requests` (tarea, estado y tokens).
- **Pruebas:** `test/ia.e2e-spec.ts` usa una IA simulada, así que no gasta dinero.
