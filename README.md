# most.

**Pequeños pasos. Grandes cambios.** App móvil para crear y mantener hábitos sin culpa: cada meta
se vuelve una secuencia de micro-pasos que se ajusta a tu ritmo.

| Carpeta | Qué es |
|---|---|
| `mobile/` | App Expo (React Native + TypeScript). Funciona sin conexión con SQLite. |
| `backend/` | API NestJS + PostgreSQL (Docker) + Prisma. La IA (Claude) genera los micro-pasos. |
| `compartido/` | Esquemas y motor del plan que usan la app y el backend. |
| `docs/` | Requisitos (`MOST_CONTEXTO.md`) y plan de trabajo (`plan.md`). |
| `legado/` | Documentos y código de Habit Green, solo como referencia. |

## Arranque rápido

Necesitas Node 24, pnpm, Docker Desktop y la app **Expo Go** en tu teléfono Android.

```bash
pnpm install                       # desde esta carpeta: instala todo y compila compartido/

# Backend (terminal 1)
cd backend
cp .env.example .env               # llena JWT_SECRETO (y ANTHROPIC_API_KEY si quieres IA)
docker compose up -d               # base de datos
pnpm db:migrar                     # tablas y catálogo
pnpm start:dev                     # API en http://localhost:3001

# App (terminal 2)
cd mobile
cp .env.example .env               # pon la IP de tu PC en EXPO_PUBLIC_API_URL
pnpm start                         # escanea el QR con Expo Go
```

**Si el teléfono no se conecta al backend:**
- El teléfono y la PC deben estar en la misma red Wi-Fi.
- Usa la IP de tu PC (en Windows: `ipconfig` → «Dirección IPv4»), no `localhost`.
- El firewall de Windows debe permitir el puerto 3001.
- Desde el navegador del teléfono, abre `http://<IP>:3001/salud`: debe responder `{"estado":"ok","baseDatos":true}`.

## Comandos útiles

| Comando (en la raíz) | Para qué |
|---|---|
| `pnpm test` | Pruebas de todo el proyecto |
| `pnpm lint` | Revisión de código |
| `pnpm typecheck` | Revisión de tipos |
| `pnpm compartido` | Recompilar `compartido/` después de cambiarlo |

Más detalle en [backend/README.md](backend/README.md) y [compartido/README.md](compartido/README.md).
