# @most/compartido

Código que usan igual la app (`mobile/`) y el backend (`backend/`), para no tenerlo duplicado:

| Módulo | Contenido |
|---|---|
| `@most/compartido/encuesta` | Claves y validación de la encuesta inicial de 7 pasos |
| `@most/compartido/plan` | Forma del borrador del plan, sus hábitos y sus micro-pasos |
| `@most/compartido/motorPlan` | Motor del plan: respuestas + catálogo → hábitos con nivel, duración, días y hora |

Solo depende de Zod (nada de React Native ni NestJS). Se compila a JavaScript en `dist/`. Eso pasa
solo con `pnpm install`; si cambias algo aquí, corre `pnpm --filter @most/compartido build`, o
`pnpm --filter @most/compartido dev` mientras trabajas. Los imports relativos llevan `.js`,
porque así los pide Node con ESM.
