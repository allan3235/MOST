@AGENTS.md
@MOST_CONTEXTO.md

## Forma de trabajo

- Los requisitos son los de `MOST_CONTEXTO.md` (SRS v4.0). El código heredado de "Habit Green" se adapta a ellos, no al revés.
- El backlog vivo es `docs/plan.md`: se avanza por fases, en orden. Al terminar una tarea, márcala ahí.
- Backend: NestJS en `backend/`. App: Expo en `mobile/`, probada con Expo Go en local. Tipos compartidos en `compartido/`.
- El usuario tiene poca experiencia con este stack: al implementar cada parte, explica qué hace, por qué se hizo así y cómo probarla.
- Código nuevo o modificado: estándar ECM-TS (sección 9 de `MOST_CONTEXTO.md`) y reglas de tono (sección 7).
- Si un requisito es ambiguo o contradice al código, pregunta antes de decidir.
