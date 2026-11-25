@AGENTS.md
@docs/MOST_CONTEXTO.md
@docs/pruebas/instrucciones.md

## Forma de trabajo

- Los requisitos son los de `docs/MOST_CONTEXTO.md` (SRS v4.0). El código heredado de "Habit Green" se adapta a ellos, no al revés.
- El backlog vivo es `docs/plan.md`: se avanza por fases, en orden. Al terminar una tarea, márcala ahí.
- Backend: NestJS en `backend/`. App: Expo en `mobile/`, probada con Expo Go en local. Tipos compartidos en `compartido/`.
- El usuario tiene poca experiencia con este stack: al implementar cada parte, explica qué hace, por qué se hizo así y cómo probarla.
- Código nuevo o modificado: estándar ECM-TS (sección 9 de `docs/MOST_CONTEXTO.md`) y reglas de tono (sección 7).
- Si un requisito es ambiguo o contradice al código, pregunta antes de decidir.
- Despliegue temporal (Expo Go + backend en Dokploy, rama `main`): ver `docs/despliegue-temporal.md`. No sustituye la build de desarrollo.
- Validación: los casos CP-01 a CP-16 y el formato del reporte están en `docs/pruebas/instrucciones.md`; los resultados van en `docs/pruebas/resultados.md`.

## Arquitectura del front (capas, no cebolla)

- `mobile/src/zonas/<zona>/` con 4 capas del SRS: `presentacion/` (pantallas, componentes, hooks) → `logica/` (reglas en TS puro y servicios) → `datos/` (SQLite y API) y `dispositivo/` (notificaciones, No Molestar, sonido). Las dependencias solo van hacia abajo.
- Zonas: cuenta, cuestionario, planes, habitos, recordatorios, reajuste, plantas, progreso, enfoque. Lo compartido vive en `mobile/src/comun/` con las mismas capas; `comun/modelo` (esquemas, configuración por defecto), `comun/util`, `comun/i18n` y `comun/tema` son neutrales.
- La presentación habla solo con servicios de `logica/` (`servicioX.ts`); el SQL solo vive en `datos/`. `src/app/` (Expo Router) solo reexporta pantallas.
- ESLint (`mobile/eslint.config.js`) rechaza imports hacia arriba; los `import type` sí se permiten.
