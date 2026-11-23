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
- Proveedor: **Claude** (decisión del 23-nov), con un modelo por tarea para no gastar de más:
  - Crear el plan y descomponer una meta (diseñar la secuencia completa) → `claude-opus-5-5`, esfuerzo `medium`, con respaldo automático del servidor si el modelo rechaza la petición.
  - Paso más ligero cuando a la persona le cuesta (ajustar un paso de un plan que ya existe) → `claude-haiku-5-5`, esfuerzo `low`.
  - Se cambian con `IA_MODELO_GRANDE` e `IA_MODELO_PEQUENO` en `backend/.env`.
- Detrás de la interfaz `ProveedorIa`: en las pruebas se usa una IA simulada (sin gastar).
- Límite de llamadas por usuario al día (`IA_LIMITE_DIARIO`, 10 por defecto), registrado en `ai_requests`.
- Se envía lo mínimo: respuestas de la encuesta y el texto de la meta. Nunca nombre, correo ni datos de introspección (RR-04).
- Crear un plan o una meta con IA necesita conexión; marcar micro-pasos sigue funcionando sin conexión.

## Estructura objetivo del repositorio

```
MOST/
  mobile/       # app Expo
  backend/      # API NestJS + PostgreSQL (Docker) + Prisma 7
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
Decisión técnica (23-nov): **Prisma 7 (estable, 7.10.1) para el esquema, las migraciones y el historial, conservando el SQL que ya funcionaba.** `prisma/schema.prisma` es el mapa de la base (generado con `prisma db pull`) y `prisma/migrations` el historial. Las reglas de monedas y XP (`complete_habit`, `uncomplete_habit`…), los disparadores y las 34 políticas RLS siguen como SQL dentro de la migración inicial: Prisma no los dibuja en el mapa, pero los aplica. Las consultas normales usan el cliente de Prisma con tipos (`PrismaServicio`). La sincronización genérica usa `pg` (`BaseDatosServicio.comoUsuario`) porque arma SQL dinámico y necesita las marcas de tiempo con microsegundos. En cada petición abre una transacción con el rol `authenticated` y el id del usuario, para que Postgres aplique las mismas reglas RLS que con Supabase. (El 22-nov se usó `pg` + SQL sin Prisma; se cambió a petición de Allan para tener mapa, historial y tipos.)

- [x] PostgreSQL en Docker (`backend/docker-compose.yml`, puerto 5433) y Prisma Migrate (`pnpm db:migrar`). Las 16 migraciones de Supabase quedaron consolidadas en `prisma/migrations/20261122000000_esquema_inicial`.
- [x] Datos de referencia: categorías, catálogo de micro-pasos, accesorios y configuración (`20261122000001_datos_referencia`).
- [x] Módulo **auth**: registro, login y `GET /auth/yo`; JWT y contraseña con scrypt. Pruebas unitarias y de punta a punta (incluyen que RLS impide darse monedas).
- [x] Módulo **sync**: `POST /sync/operacion` (upsert, update, complete, uncomplete, archive), `POST /sync/lote` (atómico, para guardar un plan), `GET /sync/cambios` (descarga por cursor) y `POST /sync/fila`. Hábitos, horarios, ajustes y planes se escriben por aquí, protegidos por RLS. Las recompensas usan las funciones SQL de siempre.
- [x] `POST /tienda/comprar`.
- [x] Errores de Postgres → respuestas con `code` (rechazo definitivo para la cola de la app).
- [x] Tabla **`micro_pasos`** (migración de Prisma `20261123080815_micro_pasos`) y `habits.paso_actual`, con CHECK del candado mínimo y políticas RLS; se sincroniza por `/sync`.
- [x] Módulo **ia** con Claude: salida estructurada validada con Zod, reglas de MOST aplicadas en código (`reglasMicroPasos.ts`), 2 intentos, respaldo al catálogo, límite diario y registro en `ai_requests`. Pruebas con IA simulada.
- [x] `POST /ia/plan` (encuesta → hábitos con micro-pasos), `POST /ia/meta` (meta escrita → micro-pasos) y `POST /ia/paso-ligero` (meta intermedia, RF-15, modelo pequeño).
- [ ] Probar con Claude de verdad: poner `ANTHROPIC_API_KEY` en `backend/.env` (lo hace Allan; cada plan cuesta centavos).

### Fase 2: Conectar la app con NestJS
- [x] Paquete `compartido/` (`@most/compartido`): esquemas de la encuesta y del plan y motor del plan, que usan la app y el backend. `/ia/plan` devuelve el borrador completo de la app más los micro-pasos.
- [x] Cliente HTTP (`lib/clienteApi.ts`) y sesión con el token en SecureStore (`lib/sesionGuardada.ts`); se quitó `@supabase/supabase-js`.
- [x] `sync-engine.ts` y los 5 repositorios hablan con `/sync`, `/ia` y `/tienda`. El plan confirmado se guarda en un solo `/sync/lote`.
- [x] Pantallas de cuenta simplificadas: crear cuenta entra de una vez; sin confirmación de correo ni recuperación de contraseña (fuera del MVP).
- [x] Tabla local `micro_pasos` y `habits.paso_actual` (SQLite versión 8, base `most.db`).
- [x] Nombre técnico: scheme `most`, paquete Android `com.most.app`, claves locales `most-*`. El slug y el proyecto de EAS siguen ligados a la cuenta Expo `nueve_36`: se decide en la Fase 6.
- [x] Token de 60 días, igual que el límite sin conexión de la app.
- [x] Verificado sin teléfono: 359 pruebas de la app, 30 unitarias y 19 e2e del backend, Metro empaqueta y un script repitió el flujo de la app contra el backend real.
- [ ] **Probar en Expo Go (Allan):** registro → encuesta → plan → «Empezar» → marcar → planta y monedas.

### Fase 3: Alinear los flujos existentes con el SRS
- [ ] **Aplicar las migraciones nuevas** con Docker abierto: `pnpm db:migrar` y revisar que `pnpm db:nueva-migracion --name verificar` salga vacía (se escribieron sin base porque Docker estaba cerrado).
- [x] Umbrales de reajuste: < 40 % en 7 días (RF-15) con `UMBRAL_CUMPLIMIENTO` y `DIAS_EVALUADOS`; la meta intermedia es una tarjeta «Probar este paso» (ya no baja sola). Migración `20261123120000_progresion_rf15` para `app_config`.
- [x] `META_MINIMA = 1` (RR-03): ningún reajuste deja menos de 1 minuto ni menos de 1 día; un paso de 1 minuto no tiene versión más corta (solo apoyo).
- [x] Sin rachas que se reinician (RNF-07): se muestra el total de veces completado, que nunca baja, con un brote en lugar de la llama.
- [x] Resumen nocturno como interruptor (RF-18): `user_settings.resumen_nocturno` (migración `20261123140000_resumen_nocturno`); se suma a cualquier estilo desde «Avisos y horas».
- [x] La pausa no cuenta como fallo (RF-09): tabla `habit_pausas` (migración `20261123130000_habit_pausas`); estadísticas y progresión saltan esos días, también después de reanudar.
- [x] Pantalla «Crear meta» (RF-03, CP-01/02): Hábitos → «Crear meta con micro-pasos» → escribir la meta y elegir área → `/ia/meta` → ver la secuencia → «Usar estos micro-pasos» crea el hábito en el paso 1 (respeta el límite de hábitos). Una meta vacía no se envía.
- [ ] Editar cada micro-paso antes de confirmar (propuesta del plan; hoy se acepta o se pide otra).
- [x] Secuencia de micro-pasos visible (RF-03): en la revisión del plan antes de «Empezar» y en el detalle del plan («Tus micro-pasos»), con estado por icono y texto (Superado / Vas aquí / Después).
- [x] El reajuste (subir o bajar) se mueve dentro de la secuencia de micro-pasos; sin secuencia, por los niveles del catálogo. Los títulos dicen los minutos reales de la versión reducida.
- [x] Cuando ya no hay paso más ligero en la secuencia, la tarjeta ofrece «¿Te propongo una versión aún más ligera?»: el modelo pequeño (Haiku, `/ia/paso-ligero`) la redacta y se aplica en un toque como versión reducida, respetando el candado mínimo. Sin conexión se explica.
- [x] Revisar textos con tono TCC/ACT (RNF-09): sin palabras de culpa ni fracaso; «Me desanimo cuando fallo un día» → «Me desanimo cuando un día no sale». Los días sin marcar se ven neutros (sin rojo ni tachas).

### Fase 4: Lo que falta, en orden de prioridad
- [x] RF-17+19 Lista de barreras con alternativa en un toque: al abrir la app, por cada día que no salió se pregunta qué se atravesó (tiempo, recursos, acceso o «Prefiero no decir») y se ofrece en un toque una versión más ligera u otro día. Con causa, el día no cuenta en el cumplimiento (`habit_occurrences.barrera`). Con la estrategia «desánimo» se sigue moviendo en silencio.
- [x] RF-13 Aviso motivacional a los 3 días seguidos: al marcar un paso, si se llega a 3, 6, 9… días seguidos con algo hecho, llega al momento una notificación de ánimo que abre Progreso; máximo una al día (tabla local `avisos_motivacionales`), nada con el estilo «Lo mínimo». Abrir Progreso desde el aviso queda por confirmar en build de desarrollo (Expo Go abre su inicio).
- [x] RF-16 Hitos al 50 % y 80 %: decisión del equipo, se miden sobre la meta del micro-paso en curso (10 veces desde que empezó el paso). A los 5 y 8 de 10 sale una celebración con barra, vibración y sonido opcional (Perfil → Avisos y horas → Logros); una sola vez por paso. El detalle del plan muestra «5 de 10 hacia el siguiente paso».
- [x] RF-04 Introspección por valores (solo local): 3 preguntas por valores con escala 1–5 (se puede saltar cualquiera), sin lenguaje clínico. Tarjeta «Un momento para ti» en Hoy cada 7 días (si no hay otra tarjeta) y al pausar un hábito (UC-11). Respuestas en la tabla local `introspecciones`, nunca se sincronizan (RR-04).
- [x] RI-04 «Completado» desde la notificación: los avisos de un hábito traen el botón «Hecho ✓» (categoría `habito`); al tocarlo abre la app, marca el hábito con su recompensa y muestra Hoy. Visto el botón en el emulador; el toque llega a la app solo en build de desarrollo (Expo Go no lo entrega).
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
7. ~~Proveedor de IA~~ → decidido el 23-nov: Claude, con modelo grande para crear y pequeño para ajustar.
8. Cuántos micro-pasos por meta (propuesta: 3 a 5) y si el usuario puede editar cada uno antes de confirmar (propuesta: sí).
