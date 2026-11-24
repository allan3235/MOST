# Resultados de validación — CP-01 a CP-16

Proyecto **most.** · rama `feat/fase-4` · formato según `docs/pruebas/instrucciones.md`.

## Corrida 1 — 23-nov-2026

**Entorno:** Windows 11, Node + pnpm, Jest (jest-expo 58) en `mobile/`, Vitest en `backend/`. Emulador Android de Expo Go, sin build de desarrollo. Todos los casos se rehicieron desde cero.

**Comandos de la corrida completa:**

| Comando | Salida resumida |
|---|---|
| `cd mobile && pnpm jest` | `Test Suites: 58 passed, 58 total` · `Tests: 423 passed, 423 total` |
| `cd mobile && pnpm jest -t "CP-" --json` | `Tests: 405 skipped, 18 passed`: las 18 pruebas CP de la app aprobadas, 0 fallidas. Más 1 prueba CP-01 en el backend (✓). |
| `cd backend && pnpm test` | `Test Files 5 passed (5)` · `Tests 31 passed (31)` |
| `cd mobile && pnpm typecheck && pnpm lint` | sin errores |
| `cd backend && pnpm lint` (oxlint) | sin errores |
| `pnpm prettier --check` | sin cambios pendientes en el código. Solo avisa de dos `README.md` en `mobile/assets/`, que ya estaban así y no son de esta corrida. |

**Criterio de estado.** Un caso queda «Aprobada» solo si su prueba automática cubre el resultado esperado principal y la ejecuté con la salida a la vista. Si una parte esencial depende de algo que Jest no puede comprobar, el caso queda «Pendiente-dispositivo». Por ejemplo: que la notificación llegue a la hora, que la animación se vea en pantalla o el toque en la notificación.

### Tabla de resultados

| CP | RF | Tipo | Estado | Evidencia (comando + salida resumida) | Defecto |
|---|---|---|---|---|---|
| CP-01 | RF-03 | auto | **Fallida** | `pnpm vitest run -t "CP-01"` → ✓ «queda en 3 a 5 pasos ordenados de menor a mayor esfuerzo y el primero dura 5 min o menos». `pnpm jest src/features/metas` → ✓ «CP-01: descompone la meta en una lista ordenada y guarda la secuencia desde el paso 1». Comprobación estricta temporal «cada micro-paso dura 5 min o menos» → ✕ `expected false to be true`: para «Leer 20 minutos al día» los pasos quedan en 5 → 10 → 20 min. | D-01 (Media) |
| CP-02 | RF-03 | auto | **Aprobada** | `pnpm jest src/features/metas` → ✓ «CP-02: con la meta vacía no pide micro-pasos, avisa con tono neutro y conserva lo capturado». No llama a la IA ni guarda; muestra «Escribe tu meta para poder dividirla en pasos.»; el área elegida sigue seleccionada. | — |
| CP-03 | RF-01 | auto + disp. | **Pendiente-dispositivo** | `planificar-avisos.test.ts` → ✓ «CP-03: «Tomar agua» a las 10:00 diario avisa a las 10:00 cada uno de los 7 días». Falta ver la notificación real a las 10:00 con la app en segundo plano. | — |
| CP-04 | RF-02 | auto | **Aprobada** | `agenda.test.ts` → ✓ «CP-04: 10:00 en la franja 10:00–11:00 se rechaza y se sugiere 11:00», más 5 pruebas de apoyo: otro día, empezar justo antes, bloques seguidos, sin hueco y validación. Probado también en el emulador: el diálogo ofrece «Usar las 11:00». | D-04 (Media), postcondición fuera de este flujo |
| CP-05 | RF-01 | auto | **Aprobada** | `habit.test.ts` → ✓ «CP-05 · no se guarda, el error queda en el campo hora y el mensaje es claro y sin culpa». Hay un solo error, en `['hora']`: «Elige una hora.». Como el formulario no se guarda, no se programa ningún aviso. | — |
| CP-06 | RF-18 | auto + disp. | **Pendiente-dispositivo** | `planificar-avisos.test.ts` → ✓ «CP-06: el resumen de las 21:00 nombra los hábitos de mañana» («Mañana te esperan 2 hábitos» / «Tomar agua y Leer 20 minutos. Descansa bien.»), más ✓ «RF-18: el interruptor suma el resumen…». Falta que llegue a las 21:00 y que al tocarla abra Hoy. | — |
| CP-07 | RF-08 | auto | **Pendiente-dispositivo** | `recompensas.test.ts` → ✓ «CP-07 · «Abrir el libro» da XP a la planta y monedas al instante, y queda registrado en el log». El cálculo mide menos de 1500 ms. Falta medir en pantalla la animación «+10» (`CoinBurst`), que dura 1 s en total. | — |
| CP-08 | RF-13 | auto + disp. | **Pendiente-dispositivo** | `aviso-motivacional.test.ts` → ✓ «CP-08: a los 3 días seguidos toca avisar» y ✓ «máximo un aviso al día», con la fecha inyectada. En el emulador sí llegó el banner. Falta el toque al acceso directo, porque Expo Go no entrega el toque de la notificación a la app. | — |
| CP-09 | RF-16 | auto | **Pendiente-dispositivo** | `hitos.test.ts` → ✓ «CP-09: a los 5 de 10 es el hito del 50 % y a los 8 de 10 el del 80 %», más «entre hitos no hay refuerzo», «se celebra el más alto» y «no pasa de la meta». Falta ver en pantalla la celebración y oír el sonido, que necesita build de desarrollo. | — |
| CP-10 | RF-04 | auto | **Fallida** | `introspeccion.test.ts` → ✓ «RF-04: de 1 a 3 preguntas», ✓ «CP-10: la escala va de 1 a 5», ✓ «nunca usa palabras clínicas». `DialogoIntrospeccion.test.tsx` → ✓ «CP-10: responde con la escala 1–5, salta una y guarda al terminar». Las respuestas van a la tabla local `introspecciones`, que no se sincroniza. Lo que falla: la base SQLite **no está cifrada**. | D-02 (Alta) |
| CP-11 | RF-15 | auto | **Pendiente-dispositivo** | `progresion.test.ts` → ✓ «RF-15 (CP-11): 2 de 7 días (28 %) propone una meta intermedia» y ✓ «se mira solo la última semana, con el umbral de 40 %». Falta comprobar en pantalla que se aplica en un toque y que el historial sigue igual. | — |
| CP-12 | RF-09 | auto | **Aprobada** | `habit.test.ts` → ✓ «CP-12: bajar de 20 a 10 min en lunes, miércoles y viernes sí se guarda». `planificar-avisos.test.ts` → ✓ «CP-12: al ajustar a lunes, miércoles y viernes de 10 min, los avisos se acomodan solos»: quedan el 16, 18 y 20-nov a las 08:00 con «tus 10 min». Que el progreso previo se conserva lo revisé en el código, no con una prueba: `editarHabito` solo versiona `habit_schedules` y no toca `habit_logs`. | — |
| CP-13 | RF-17 + RF-19 | auto | **Aprobada** | `barreras.test.ts` → ✓ «pregunta con máximo 3 opciones», ✓ «CP-13: con falta de tiempo, la versión ligera va primero». `TarjetaBarreras.test.tsx` → ✓ «CP-13: con falta de tiempo ofrece la versión ligera en un toque» (515 ms, sin palabras de culpa). Que la barrera se guarde en `habit_occurrences.barrera` lo verifiqué en el emulador; ninguna prueba automática lo cubre. | — |
| CP-14 | RF-09 + RF-15 + RR-03 | auto | **Aprobada** | `habit.test.ts` → ✓ «CP-14: 0 días y 0 minutos no se guardan y se explica el mínimo con tono compasivo», con `DIAS_MINIMOS_POR_SEMANA = 1` y `MINUTOS_MINIMOS = 2`. Backend → ✓ «un paso de 1 minuto sube al candado mínimo de 2 min (RR-03)». | — |
| CP-15 | RF-14 | auto + disp. (Android) | **Bloqueada** | `enfoque.test.ts` → ✓ «CP-15/16: durante la sesión no queda ningún aviso propio; después sí». La parte «con permiso, el dispositivo pasa a No Molestar» no existe: hoy solo se abre el ajuste del sistema. | D-03 (Alta) |
| CP-16 | RF-14 | auto + disp. (iPhone / Android sin permiso) | **Pendiente-dispositivo** | Misma prueba ✓ «CP-15/16…» y ✓ «la sesión dura lo elegido y luego termina sola». La app no llama a ninguna API de No Molestar; solo muestra la guía. En el emulador Android se probaron el contador, la guía y la persistencia. Falta probar en iPhone. | — |

### Resumen

| Estado | Casos | Cuáles |
|---|---|---|
| Aprobada | 6 | CP-02, CP-04, CP-05, CP-12, CP-13, CP-14 |
| Fallida | 2 | CP-01, CP-10 |
| Bloqueada | 1 | CP-15 |
| Pendiente-dispositivo | 7 | CP-03, CP-06, CP-07, CP-08, CP-09, CP-11, CP-16 |

- **Alta (14 casos):** 6 aprobados = **42.9 %** (meta 100 %). ✗
- **Media (2 casos: CP-06, CP-09):** 0 aprobados = **0 %** (meta ≥ 90 %). ✗ Los dos pasan su parte automática y solo esperan dispositivo.
- **Criterio de aceptación: todavía no se cumple.** La mayoría de lo pendiente es la prueba en un dispositivo real con build de desarrollo. Además hay tres defectos que corregir: D-01, D-02 y D-03.

### Matriz RF ↔ CP

Un RF queda verificado solo si **todos** sus CP están aprobados.

| RF | CP | Estado de los CP | ¿Verificado? |
|---|---|---|---|
| RF-01 | CP-03, CP-05 | Pendiente-disp., Aprobada | No |
| RF-02 | CP-04 | Aprobada | **Sí** |
| RF-03 | CP-01, CP-02 | Fallida, Aprobada | No |
| RF-04 | CP-10 | Fallida | No |
| RF-08 | CP-07 | Pendiente-disp. | No |
| RF-09 | CP-12, CP-14 | Aprobada, Aprobada | **Sí** |
| RF-13 | CP-08 | Pendiente-disp. | No |
| RF-14 | CP-15, CP-16 | Bloqueada, Pendiente-disp. | No |
| RF-15 | CP-11, CP-14 | Pendiente-disp., Aprobada | No |
| RF-16 | CP-09 | Pendiente-disp. | No |
| RF-17 + RF-19 | CP-13 | Aprobada | **Sí** |
| RF-18 | CP-06 | Pendiente-disp. | No |
| RR-03 | CP-14 | Aprobada | **Sí** |

### Defectos para ClickUp

| ID | Caso | Descripción | Severidad |
|---|---|---|---|
| D-01 | CP-01 | Solo el primer micro-paso tiene tope de 5 min. Los demás crecen hasta el tiempo diario del hábito: para «Leer 20 minutos al día» quedan 5 → 10 → 20 min. CP-01 pide «cada uno ≤ 5 min», mientras el SRS dice «propuesto ≤ 5 min». **Necesita decisión del equipo:** si se exige ≤ 5 min a todos, una meta de 20 min nunca llega a 20; la otra salida es cambiar el esperado del caso a «el primero ≤ 5 min y cada uno a lo mucho el triple del anterior». | Media |
| D-02 | CP-10 | La base local (expo-sqlite) no está cifrada, así que las respuestas de introspección quedan en claro en el teléfono. Incumple RNF-05 (AES-256). Propuesta, por confirmar en la documentación de expo-sqlite SDK 58: activar SQLCipher en `app.json` y guardar la clave en SecureStore. Necesita build de desarrollo y migrar la base existente. | Alta |
| D-03 | CP-15 | Modo enfoque: en Android con el permiso «Acceso a No molestar», la app no activa No Molestar ni lo restaura después. Solo silencia sus propios avisos y abre el ajuste del sistema. Para hacerlo hace falta un módulo nativo (`NotificationManager.setInterruptionFilter`) y una build de desarrollo. En iOS no se intenta, como pide el SRS. | Alta |
| D-04 | CP-04 | Si se agrega un bloque ocupado nuevo, los recordatorios que ya caían en esa franja no se revisan ni se avisan. La revisión solo ocurre al elegir la hora de un hábito. No afecta al flujo de CP-04, pero sí a su postcondición general («ningún recordatorio dentro de un bloque ocupado»). | Media |

**Por qué ningún defecto se corrigió en esta corrida:** D-01 necesita una decisión de producto. D-02 y D-03 necesitan módulos nativos y una build de desarrollo. D-04 se puede corregir sin esperar a nadie: queda como el siguiente paso.

### Pasos manuales pendientes en dispositivo real

Todos con **build de desarrollo**, no Expo Go: `pnpm expo run:android`, o `pnpm dlx eas-cli@latest build --profile development`. Anota el resultado el mismo día en esta tabla.

**CP-03 (Android y iPhone)**
1. Crea el hábito «Tomar agua», todos los días, con aviso a la hora de prueba (por ejemplo, la actual + 2 min) y guarda.
2. Comprueba que el hábito muestra esa hora.
3. Manda la app a segundo plano.
4. Esperado: la notificación llega a la hora, con el botón «Hecho ✓». Repite al día siguiente.

**CP-06**
1. En Perfil → Recordatorios, activa el resumen nocturno. Para no esperar hasta las 21:00, cambia la hora del teléfono a las 20:58.
2. Ten «Tomar agua» y «Leer 20 minutos» programados para mañana.
3. Esperado: a las 21:00 llega «Mañana te esperan 2 hábitos»; al tocarla se abre Hoy.
4. Cierra y abre la app: el interruptor sigue activado.

**CP-07**
1. Abre Hoy con el micro-paso «Abrir el libro» pendiente y márcalo.
2. Graba la pantalla a 60 fps para medir.
3. Esperado: la animación «+10» con la moneda aparece en ≤ 1.5 s, sin textos negativos. El saldo y el XP de la planta suben.

**CP-08**
1. Con fechas de prueba (cambiando la fecha del teléfono), completa «Tomar agua» los días 1, 2 y 3.
2. Manda la app a segundo plano.
3. Esperado: llega un solo banner motivacional ese día; al tocarlo se abre Estadísticas.
4. Completa otro hábito el mismo día: no debe llegar un segundo aviso.

**CP-09**
1. Avanza un micro-paso a 5 de 10 repeticiones.
2. Esperado: celebración del 50 % y, con el sonido activado en Perfil, el audio.
3. Llega a 8 de 10. Esperado: celebración del 80 %, y el indicador muestra 8/10 sin reiniciar la app.
4. Vuelve a 8: no se repite la celebración.

**CP-11**
1. Simula 2 de 7 días cumplidos en una meta de 5 días por semana.
2. Abre el hábito: aparece la sugerencia de meta intermedia, sin mensajes de fracaso.
3. Aplícala con un toque.
4. Esperado: el hábito cambia a la meta intermedia y el historial de Estadísticas conserva los días anteriores.

**CP-15 (Android, cuando exista D-03)**
1. Otorga «Acceso a No molestar».
2. Programa un recordatorio a los 10 min e inicia una sesión de enfoque de 25 min.
3. Esperado: el teléfono pasa a No Molestar y el recordatorio no suena.
4. Termina antes o cancela: No Molestar vuelve a como estaba y los avisos regresan.

**CP-16 (iPhone, o Android sin permiso)**
1. Inicia una sesión de 25 min y lee la guía.
2. Esperado: no aparece ningún diálogo del sistema, no hay cierres ni cambios en los ajustes del teléfono, y no llega ningún aviso de most. durante la sesión.
3. Termina: los avisos vuelven.
