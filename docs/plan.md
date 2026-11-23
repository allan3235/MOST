# Plan de rescate de most.

Actualizado: 22-nov-2026. Fuente de requisitos: `docs/MOST_CONTEXTO.md` (SRS v4.0). Este archivo es el backlog vivo: al terminar una tarea, marca la casilla.

## Punto de partida

La app actual ("Habit Green") es una base sólida: unos 270 archivos con pruebas, onboarding de 7 pasos, plan con micro-pasos por nivel, check-in sin conexión (SQLite), recordatorios, plantas, monedas, tienda y estadísticas. Problemas:

- Usa **Supabase** como backend; el equipo decidió **NestJS**.
- Front y back mezclados en la raíz (`src/` + `supabase/`).
- Nombre, textos y varias reglas no siguen el SRS de MOST (umbrales, rachas, barreras, introspección, enfoque).

Decisiones del 22-nov:

- **Migrar a NestJS, correr en local y probar con Expo Go.**
- **La IA genera los hábitos y sus micro-pasos** (RF-03: "quién los crea" → la IA). Hoy la IA solo redacta textos y los hábitos salen de un catálogo fijo; eso cambia. Detalle en «Generación con IA».

## Generación con IA (cambio principal de producto)

**Qué cambia**

| | Hoy (Habit Green) | Nuevo (most.) |
|---|---|---|
| Quién crea el hábito | Catálogo fijo de 35 metas × 3 niveles | La IA, a partir de la encuesta o de una meta que escribe el usuario |
| Micro-pasos | 3 niveles predefinidos | La IA descompone la meta en una **secuencia ordenada** de micro-pasos (RF-03) |
| Papel de la IA | Solo reescribe títulos y descripciones | Propone hábito, micro-pasos, duración y días |
| Catálogo | Fuente principal | **Respaldo** si la IA falla y ejemplos para guiar a la IA |

**Dos entradas**

1. **Onboarding (UC-02):** con las respuestas de la encuesta de 7 pasos, la IA propone 1 o 2 hábitos, cada uno con sus micro-pasos. El usuario lo revisa y confirma (UC-15).
2. **Crear meta (RF-03 y CP-01/02):** el usuario escribe una meta («leer más», «dormir mejor») → la IA la descompone en micro-pasos → el usuario revisa, edita y confirma. Una meta vacía o sin nombre se rechaza antes de llamar a la IA (CP-02).

**Reglas que la IA no puede romper** (el backend valida la respuesta con Zod y la corrige o rechaza):

- Cada micro-paso dura **≤ 5 min** al inicio y crece poco a poco (máximo el doble o el triple por paso).
- Secuencia de 3 a 5 micro-pasos, ordenada de menor a mayor esfuerzo, con una versión reducida del primero (candado mínimo, RR-03).
- No supera el tiempo diario elegido en la encuesta (P4).
- Respeta la P6 (por ejemplo, si dice «recursos», nada que requiera equipo).
- Sin consejos médicos, dietas, cantidades sensibles ni etiquetas clínicas; tono TCC/ACT sin culpa (RNF-09).
- Si la IA falla dos veces, se acaba la cuota o no hay conexión → se usa el catálogo y el usuario no ve un error.

**Dónde vive**

- Solo en el backend NestJS (módulo `ia`). La clave del proveedor **nunca** va en la app.
- Proveedor intercambiable (Gemini gratuito por defecto; Claude u OpenAI), reutilizando `ai-provider.ts` de Supabase.
- Límite de generaciones por usuario al día.
- Se envía lo mínimo: respuestas de la encuesta y el texto de la meta. Nunca nombre, correo ni datos de introspección (RR-04).
- Crear un plan o una meta con IA necesita conexión; marcar micro-pasos sigue funcionando sin conexión.

## Estructura objetivo del repositorio

```
MOST/
  mobile/       # app Expo
  backend/      # API NestJS + PostgreSQL (Docker) con migraciones SQL
  compartido/   # tipos y esquemas Zod que usan mobile y backend (se crea en la Fase 1)
  docs/         # MOST_CONTEXTO.md (requisitos) y este plan
  legado/       # documentos y supabase/ de Habit Green, solo como referencia
  pnpm-workspace.yaml
```

Gestor: **pnpm** con workspaces (`node-linker=hoisted` para que Expo funcione).

## Flujos: requisito vs. app actual

| Flujo (UC) | Qué pide MOST | Qué hace hoy | Acción |
|---|---|---|---|
| Entrada | Visitante / nuevo / registrado | Cuenta obligatoria con confirmación de correo | Registro y login simples contra NestJS (sin confirmar correo en el MVP) |
| UC-01/02/15 Onboarding | Encuesta de 7 pasos → plan → confirmación | Elegir modo → 7 preguntas → plan del catálogo (la IA solo redacta) → revisión → «Empezar» | La IA genera hábitos y micro-pasos; el catálogo queda de respaldo; revisar textos con Kim |
| UC-03 Plan diario | Plan del día con micro-pasos | Pestaña Hoy | Mantener; mostrar el micro-paso actual y el siguiente |
| RF-03 Micro-pasos | Meta → lista ordenada de micro-pasos | 3 niveles por meta en el catálogo; el usuario no ve la secuencia; un hábito propio no tiene micro-pasos | Pantalla «Crear meta»: el usuario escribe la meta y la IA la descompone; secuencia visible en el detalle |
| UC-04/05 Marcar + recompensa | ≤ 1.5 s; también desde la notificación | Marcar en la app con planta y monedas | Agregar la acción «Completado» en la notificación (RI-04) |
| UC-06/07 Recordatorios | Hora y frecuencia | Hecho | Mantener |
| RF-02 Sin traslapes | Rechazar una franja ocupada y sugerir otra | No existe | Nuevo (falta definir cómo se registra la agenda) |
| UC-14 Resumen nocturno | Interruptor, 21:00 | Solo como «estilo» de aviso | Convertirlo en interruptor propio |
| RF-13 Motivación | Tras 3 días seguidos, máx. 1 al día | No existe con esa regla | Nuevo |
| RF-16 Hitos | 50 % y 80 % | No existe | Nuevo |
| UC-12 Progreso | Sin castigo | Estadísticas + rachas que se reinician | Quitar rachas que se borran; solo acumulados |
| UC-09 Punto medio | < 40 % en 7 días → meta intermedia en un toque | Baja con < 50 % en 14 días, revisión cada 7 días | Cambiar constantes; botón de un toque |
| UC-08 Ajustar/pausar | Sin castigo; la pausa no es fallo | Editar, «hacer más ligero» y pausar | Verificar que la pausa no cuente como fallo |
| RR-03 Candado mínimo | Piso de exigencia | Nivel 1 con duración reducida | Constante `META_MINIMA` (falta definir el valor) |
| UC-10 Barreras (RF-17+19) | Al vencer la hora: ≤ 3 preguntas → alternativa de 2 min | Solo «mover a otro día» | Nuevo; la reprogramación queda como una opción más |
| UC-11 Introspección (RF-04) | 1–3 preguntas por valores, escala 1–5, no salen del teléfono | No existe | Nuevo, solo local |
| UC-13 Modo enfoque (RF-14) | Silenciar avisos propios; No Molestar solo en Android | No existe | Nuevo |
| Fuera del SRS | — | Modo tradicional, lugares (geofencing), varios planes por área | Quitar los lugares; el modo tradicional se convierte en «Crear meta» con IA |

## Plan por fases

### Fase 0: Ordenar la casa
- [x] Archivar los documentos de Habit Green y `supabase/` en `legado/` (referencia para portar al backend).
- [x] Mover la app a `mobile/` y recuperar el `backend/` NestJS original de Naín.
- [ ] `compartido/` → se crea en la Fase 1, cuando haya el primer tipo o esquema compartido.
- [x] pnpm workspaces (`nodeLinker: hoisted`); borrar `package-lock.json`.
- [x] Nombre visible **most.** (`app.json` y textos de `i18n/es.ts`).
- [ ] Scheme (`habitgreen://`), paquete Android, slug de EAS y claves de almacenamiento local → en la Fase 2: hoy los usan los enlaces de correo de Supabase y el proyecto de EAS.
- [x] Arranque con Expo Go (`pnpm start` = `expo start --go`) y `mobile/.env.example` con `EXPO_PUBLIC_API_URL`.
- [x] Nuevo `CLAUDE.md`; `AGENTS.md` con comandos de pnpm.

### Fase 1: Backend NestJS mínimo (sin esto la app no inicia sesión)
Decisión técnica (22-nov): **`pg` + migraciones SQL en lugar de Prisma.** El esquema de Habit Green ya trae en SQL sus reglas de monedas y XP (`complete_habit`, `uncomplete_habit`…), sus disparadores y 34 políticas RLS. Se conservan tal cual: en cada petición, NestJS abre una transacción con el rol `authenticated` y el id del usuario (`BaseDatosServicio.comoUsuario`), y Postgres aplica las mismas reglas que ya funcionaban. Prisma no maneja funciones ni políticas, y su versión «latest» era una candidata (8.0.0-rc).

- [x] PostgreSQL en Docker (`backend/docker-compose.yml`, puerto 5433) y migraciones SQL (`backend/db/migraciones`, `pnpm db:migrar`). Las 16 migraciones de Supabase quedaron consolidadas en `0001_esquema.sql`.
- [x] Datos de referencia: categorías, catálogo de micro-pasos, accesorios y configuración (`0002_datos_referencia.sql`).
- [x] Módulo **auth**: registro, login y `GET /auth/yo`; JWT y contraseña con scrypt. Pruebas unitarias y de punta a punta (incluyen que RLS impide darse monedas).
- [x] Módulo **sync**: `POST /sync/operacion` (upsert, update, complete, uncomplete, archive), `POST /sync/lote` (atómico, para guardar un plan), `GET /sync/cambios` (descarga por cursor) y `POST /sync/fila`. Hábitos, horarios, ajustes y planes se escriben por aquí, protegidos por RLS. Las recompensas usan las funciones SQL de siempre.
- [x] `POST /tienda/comprar`.
- [x] Errores de Postgres → respuestas con `code` (rechazo definitivo para la cola de la app).
- [ ] Módulo **ia**: proveedor intercambiable, prompt, validación Zod con las reglas de «Generación con IA», límite diario y respaldo al catálogo. Pruebas con respuestas falsas de la IA (sin gastar cuota).
- [ ] Endpoint `POST /planes/borrador` (encuesta → hábitos con micro-pasos) y `POST /metas/descomponer` (meta escrita → micro-pasos).

### Fase 2: Conectar la app con NestJS
- [ ] Cambiar `lib/supabase.ts` por un cliente HTTP (`lib/api.ts`) con el token en SecureStore.
- [ ] Ajustar `sync-engine.ts` y los 5 repositorios que hoy llaman a Supabase.
- [ ] Simplificar las pantallas de auth (quitar confirmación de correo y recuperación por código del MVP).
- [ ] El onboarding pide el borrador a `POST /planes/borrador` (IA) y muestra la revisión; sin conexión: «Necesitas conexión para crear tu plan».
- [ ] Modelo local de micro-pasos: un hábito guarda su secuencia completa y el paso actual (hoy guarda solo el nivel).
- [ ] Borrar `supabase/`.
- [ ] Probar en Expo Go: registro → encuesta → plan generado por la IA → marcar → planta y monedas.

### Fase 3: Alinear los flujos existentes con el SRS
- [ ] Umbrales de reajuste: < 40 % en 7 días (RF-15), con constantes con nombre.
- [ ] `META_MINIMA` (RR-03).
- [ ] Quitar las rachas que se reinician; progreso solo acumulado (RNF-07).
- [ ] Resumen nocturno como interruptor (RF-18).
- [ ] La pausa no cuenta como fallo (RF-09).
- [ ] Pantalla «Crear meta» (RF-03): escribir meta → la IA la descompone → revisar, editar y confirmar.
- [ ] Secuencia de micro-pasos visible en el detalle (RF-03).
- [ ] El reajuste (subir o bajar) se mueve dentro de la secuencia que generó la IA; si hace falta un paso más ligero (meta intermedia, RF-15), se le pide a la IA con el mismo candado mínimo.
- [ ] Revisar textos con tono TCC/ACT (RNF-09).

### Fase 4: Lo que falta, en orden de prioridad
- [ ] RF-17+19 Lista de barreras con alternativa en un toque.
- [ ] RF-13 Aviso motivacional a los 3 días seguidos.
- [ ] RF-16 Hitos al 50 % y 80 %.
- [ ] RF-04 Introspección por valores (solo local).
- [ ] RI-04 «Completado» desde la notificación.
- [ ] RF-02 Agenda sin traslapes (cuando se defina cómo se registra).
- [ ] RF-14 Modo enfoque.

### Fase 5: Pruebas
- [ ] Ejecutar CP-01 a CP-16 y registrar el resultado el mismo día.
- [ ] Corregir los defectos de prioridad Alta.

### Fase 6: Antes de entregar
- [ ] Development build para validar notificaciones, cifrado y No Molestar (Expo Go no los soporta del todo).
- [ ] SQLite cifrado (RNF-05; solo funciona en development build).
- [ ] Prueba en iOS (RNF-11).

## Límites de Expo Go (importante)

Expo Go sirve para desarrollar, pero **no basta para todas las pruebas**:

- Las notificaciones locales funcionan, pero el propio SRS pide validarlas en una development build (CP-03, 06, 08).
- El cifrado de SQLite (SQLCipher) **no existe en Expo Go**.
- El acceso a No Molestar (CP-15) necesita una development build.
- El teléfono y la PC deben estar en la misma red Wi-Fi, y el firewall de Windows debe permitir el puerto 3001.

## Decisiones pendientes

1. **Calendario:** las pruebas son del 18 al 27-nov. La migración completa no cabe antes del 27; hay que pedir prórroga o ejecutar los CP por partes.
2. **Coordinación con Naín:** él tenía el backend asignado. Acordar quién hace cada módulo para no duplicar trabajo.
3. Valor de `META_MINIMA` (RR-03).
4. Cómo se registra la agenda o los tiempos libres (RF-02).
5. Hitos: 50/80 (RF-16) o 50/100 (RI-03).
6. Estándar ECM-TS: completo en el código nuevo; encabezados por script en el existente.
7. Proveedor de IA para la demo: Gemini gratuito (propuesta) o una cuenta de pago (Claude u OpenAI). El nivel gratuito de Gemini puede usar los datos enviados; por eso se manda lo mínimo.
8. Cuántos micro-pasos por meta (propuesta: 3 a 5) y si el usuario puede editar cada uno antes de confirmar (propuesta: sí).
