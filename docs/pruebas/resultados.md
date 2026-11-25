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
| CP-01 | RF-03 | auto | **Aprobada** (corrida 2) | **Corrida 1 — Fallida:** una comprobación estricta temporal de «cada micro-paso dura 5 min o menos» dio ✕ `expected false to be true`, porque los pasos quedan en 5 → 10 → 20 min. **Corrida 2 — Aprobada**, con el esperado corregido por la decisión del 23-nov: `pnpm vitest run -t "CP-01"` → ✓ «queda en 3 a 5 pasos ordenados, el primero de 5 min o menos y cada uno ≤ triple del anterior», y `pnpm jest src/features/metas` → ✓ «CP-01: descompone la meta en una lista ordenada y guarda la secuencia desde el paso 1». | D-01 (Media, cerrado: se cambió el esperado del caso) |
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
| Aprobada | 7 | CP-01, CP-02, CP-04, CP-05, CP-12, CP-13, CP-14 |
| Fallida | 1 | CP-10 |
| Bloqueada | 1 | CP-15 |
| Pendiente-dispositivo | 7 | CP-03, CP-06, CP-07, CP-08, CP-09, CP-11, CP-16 |

- **Alta (14 casos):** 7 aprobados = **50 %** (meta 100 %). ✗
- **Media (2 casos: CP-06, CP-09):** 0 aprobados = **0 %** (meta ≥ 90 %). ✗ Los dos pasan su parte automática y solo esperan dispositivo.
- **Criterio de aceptación: todavía no se cumple.** La mayoría de lo pendiente es la prueba en un dispositivo real con build de desarrollo. Además quedan dos defectos de severidad Alta, D-02 y D-03, y uno de severidad Media, D-04.

### Matriz RF ↔ CP

Un RF queda verificado solo si **todos** sus CP están aprobados.

| RF | CP | Estado de los CP | ¿Verificado? |
|---|---|---|---|
| RF-01 | CP-03, CP-05 | Pendiente-disp., Aprobada | No |
| RF-02 | CP-04 | Aprobada | **Sí** |
| RF-03 | CP-01, CP-02 | Aprobada, Aprobada | **Sí** |
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
| D-01 | CP-01 | Solo el primer micro-paso tiene tope de 5 min. Los demás crecen hasta el tiempo diario del hábito: para «Leer 20 minutos al día» quedan 5 → 10 → 20 min. CP-01 pide «cada uno ≤ 5 min», mientras el SRS dice «propuesto ≤ 5 min». **Cerrado el 23-nov por decisión de producto:** se queda la progresión y el esperado de CP-01 pasa a «el primero ≤ 5 min y cada uno a lo mucho el triple del anterior». El cambio está en `docs/pruebas/instrucciones.md` y en `docs/MOST_CONTEXTO.md` (RF-03); falta pasarlo al SRS del Drive. | Media (cerrado) |
| D-02 | CP-10 | La base local (expo-sqlite) no está cifrada, así que las respuestas de introspección quedan en claro en el teléfono. Incumple RNF-05 (AES-256). Propuesta, por confirmar en la documentación de expo-sqlite SDK 58: activar SQLCipher en `app.json` y guardar la clave en SecureStore. Necesita build de desarrollo y migrar la base existente. | Alta |
| D-03 | CP-15 | Modo enfoque: en Android con el permiso «Acceso a No molestar», la app no activa No Molestar ni lo restaura después. Solo silencia sus propios avisos y abre el ajuste del sistema. Para hacerlo hace falta un módulo nativo (`NotificationManager.setInterruptionFilter`) y una build de desarrollo. En iOS no se intenta, como pide el SRS. | Alta |
| D-04 | CP-04 | Si se agrega un bloque ocupado nuevo, los recordatorios que ya caían en esa franja no se revisan ni se avisan. La revisión solo ocurre al elegir la hora de un hábito. No afecta al flujo de CP-04, pero sí a su postcondición general («ningún recordatorio dentro de un bloque ocupado»). | Media |

**Estado de los defectos:** D-01 quedó cerrado al cambiar el esperado de CP-01. D-02 y D-03 necesitan módulos nativos y una build de desarrollo. D-04 se puede corregir sin esperar a nadie: queda como el siguiente paso.

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

---

## Corrida 2 — 25-nov-2026 (re-ejecución de los casos corregidos)

**Entorno:** Windows 11, pnpm. Jest (jest-expo 58) en `mobile/` y Vitest en `backend/`, sobre `main` en `83758c2`. Para la parte de dispositivo se usó un emulador Android con **build de desarrollo** (no Expo Go), compilado desde `C:\m`. No hubo prueba en iPhone.

**Comandos de la corrida:**

| Comando | Salida resumida |
|---|---|
| `cd mobile && pnpm jest` | `Test Suites: 68 passed, 68 total` · `Tests: 482 passed, 482 total` |
| `cd mobile && pnpm jest -t "CP-"` | `Tests: 451 skipped, 31 passed`: las 31 pruebas CP de la app aprobadas, 0 fallidas (en la corrida 1 eran 18) |
| `cd backend && pnpm test` | `Test Files 5 passed (5)` · `Tests 33 passed (33)` |
| `cd backend && pnpm vitest run -t "CP-01"` | `Tests 1 passed \| 32 skipped` |
| `cd mobile && pnpm typecheck && pnpm lint` · `cd backend && pnpm lint` | sin errores ni avisos |

**Criterio de estado.** Es el mismo de la corrida 1, con un supuesto nuevo: **el emulador Android con build de desarrollo cuenta como dispositivo Android**. Si el equipo pide teléfono físico, CP-10 y CP-15 regresan a «Pendiente-dispositivo». Los casos que también piden iPhone siguen pendientes.

### Tabla de re-ejecución

| CP | RF | Corrida 1 | Corrida 2 | Evidencia de la corrida 2 | Defecto |
|---|---|---|---|---|---|
| CP-01 | RF-03 | Aprobada | **Aprobada** | `PantallaCrearMeta.test.tsx` ✓ «CP-01: descompone la meta en una lista ordenada y guarda la secuencia desde el paso 1». Backend ✓ «queda en 3 a 5 pasos ordenados, el primero de 5 min o menos y cada uno ≤ triple del anterior». | D-01 cerrado |
| CP-02 | RF-03 | Aprobada | **Aprobada** | `PantallaCrearMeta.test.tsx` ✓ «CP-02: con la meta vacía no pide micro-pasos, avisa con tono neutro y conserva lo capturado». | — |
| CP-03 | RF-01 | Pendiente-disp. | **Pendiente-dispositivo** (solo iPhone) | `planificar-avisos.test.ts` ✓ «CP-03: «Tomar agua» a las 10:00 diario…». **Emulador:** la notificación real llegó con la app en segundo plano y con el botón «Hecho ✓» (D-05 corregido). Falta iPhone. La hora en iPhone ya se puede elegir (D-11). | D-05, D-11 |
| CP-04 | RF-02 | Aprobada | **Aprobada** | `agenda.test.ts` ✓ «CP-04: 10:00 en la franja 10:00–11:00 se rechaza y se sugiere 11:00». La postcondición ya se cumple: `PantallaAgenda.test.tsx` ✓ «avisa del recordatorio que quedó dentro del bloque nuevo y lo mueve a las 11:00» y ✓ «Dejarlo así no cambia el recordatorio». | D-04 cerrado |
| CP-05 | RF-01 | Aprobada | **Aprobada** | `esquema-habito.test.ts` ✓ «CP-05 (RF-01): recordatorio sin hora no se guarda…». | — |
| CP-06 | RF-18 | Pendiente-disp. | **Pendiente-dispositivo** | `planificar-avisos.test.ts` ✓ «CP-06: el resumen de las 21:00 nombra los hábitos de mañana». En el emulador, el resumen **no llegó a las 21:00** (D-05). Ya está corregido, pero falta volver a probarlo con el permiso de alarmas exactas. | D-05 |
| CP-07 | RF-08 | Pendiente-disp. | **Aprobada** | `recompensas.test.ts` ✓ «CP-07: «Abrir el libro» da XP a la planta y monedas al instante, y queda registrado en el log». `use-check-in.test.tsx` ✓ «CP-07: la moneda «+10» aparece en menos de 1.5 s y se quita sola» (prueba de la UI con reloj falso). | — |
| CP-08 | RF-13 | Pendiente-disp. | **Pendiente-dispositivo** | `aviso-motivacional.test.ts` ✓ «CP-08: a los 3 días seguidos toca avisar». Falta tocar el acceso directo en la build de desarrollo (en Expo Go el toque no llega a la app). No se re-ejecutó en esta corrida. | — |
| CP-09 | RF-16 | Pendiente-disp. | **Aprobada** | `hitos.test.ts` ✓ «CP-09: a los 5 de 10 es el hito del 50 % y a los 8 de 10 el del 80 %». `use-check-in.test.tsx` ✓ «CP-09: celebra el 50 % a los 5 de 10 y el 80 % a los 8 de 10, sin reiniciar» y ✓ «la celebración muestra el hito y el indicador, con vibración y sonido» (sonido simulado). Conviene escucharlo en un teléfono. | — |
| CP-10 | RF-04 | **Fallida** | **Aprobada** | `introspeccion.test.ts` ✓ «CP-10: la escala va de 1 a 5». `DialogoIntrospeccion.test.tsx` ✓ «CP-10: responde con la escala 1–5…». `cifrado.test.ts` ✓ 4 pruebas: clave aleatoria de 256 bits en SecureStore, `PRAGMA key` con SQLCipher, recrear una base vieja sin cifrar, y sin `PRAGMA key` en Expo Go. **Emulador:** `most.db` empieza con bytes aleatorios y no con el texto `SQLite format 3`, así que está cifrada. | D-02 cerrado |
| CP-11 | RF-15 | Pendiente-disp. | **Aprobada** | `progresion.test.ts` ✓ «RF-15 (CP-11): 2 de 7 días (28 %) propone una meta intermedia». `meta-intermedia-tarjeta.test.tsx` ✓ «se ofrece sin mensajes de fracaso y se aplica con un solo toque». `meta-intermedia.test.tsx` ✓ «al aplicarla solo cambia el hábito; el historial no se toca». | — |
| CP-12 | RF-09 | Aprobada | **Aprobada** | `esquema-habito.test.ts` ✓ «CP-12: bajar de 20 a 10 min en lunes, miércoles y viernes sí se guarda». `planificar-avisos.test.ts` ✓ «CP-12: …los avisos se acomodan solos». | — |
| CP-13 | RF-17 + RF-19 | Aprobada | **Aprobada** | `barreras.test.ts` ✓ «CP-13: con falta de tiempo, la versión ligera va primero». `TarjetaBarreras.test.tsx` ✓ «CP-13: …ofrece la versión ligera en un toque». | — |
| CP-14 | RF-09 + RF-15 + RR-03 | Aprobada | **Aprobada** | `esquema-habito.test.ts` ✓ «CP-14: 0 días y 0 minutos no se guardan y se explica el mínimo con tono compasivo». | — |
| CP-15 | RF-14 | **Bloqueada** | **Aprobada** | `no-molestar.test.ts` ✓ «CP-15: Android con permiso pasa a No Molestar y al terminar vuelve al estado previo» y ✓ «si ya tenía un filtro propio, al terminar regresa a ese mismo». **Emulador:** con el permiso, `zen_mode` pasa de 0 a 1 al empezar y vuelve a 0 al terminar. | D-03 y D-06 cerrados |
| CP-16 | RF-14 | Pendiente-disp. | **Pendiente-dispositivo** (solo iPhone) | `no-molestar.test.ts` ✓ «CP-16: Android sin permiso no cambia nada…» y ✓ «en iOS nunca se intenta». **Emulador (Android sin permiso):** `zen_mode` se queda en 0 antes, durante y después; se ve la guía manual y el botón para dar el permiso. Falta iPhone. | — |

### Resumen de la corrida 2

| Estado | Corrida 1 | Corrida 2 | Casos (corrida 2) |
|---|---|---|---|
| Aprobada | 7 | **12** | CP-01, 02, 04, 05, 07, 09, 10, 11, 12, 13, 14, 15 |
| Fallida | 1 | **0** | — |
| Bloqueada | 1 | **0** | — |
| Pendiente-dispositivo | 7 | **4** | CP-03 (iPhone), CP-06, CP-08, CP-16 (iPhone) |

- **Alta (14 casos):** 11 aprobados = **78.6 %** (meta 100 %; en la corrida 1 era 50 %). ✗ Faltan CP-03, CP-08 y CP-16.
- **Media (2 casos):** 1 aprobado (CP-09) = **50 %** (meta ≥ 90 %; en la corrida 1 era 0 %). ✗ Falta CP-06.
- **Criterio de aceptación: todavía no se cumple.** No quedan defectos abiertos de severidad Alta en el código. Lo que falta es probar en el dispositivo:
  - CP-06 y CP-08 en la build de desarrollo de Android.
  - CP-03 y CP-16 en un iPhone.

### Matriz RF ↔ CP (corrida 2)

| RF | CP | Estado de los CP | ¿Verificado? |
|---|---|---|---|
| RF-01 | CP-03, CP-05 | Pendiente-disp. (iPhone), Aprobada | No |
| RF-02 | CP-04 | Aprobada | **Sí** |
| RF-03 | CP-01, CP-02 | Aprobada, Aprobada | **Sí** |
| RF-04 | CP-10 | Aprobada | **Sí** (antes No) |
| RF-08 | CP-07 | Aprobada | **Sí** (antes No) |
| RF-09 | CP-12, CP-14 | Aprobada, Aprobada | **Sí** |
| RF-13 | CP-08 | Pendiente-disp. | No |
| RF-14 | CP-15, CP-16 | Aprobada, Pendiente-disp. (iPhone) | No |
| RF-15 | CP-11, CP-14 | Aprobada, Aprobada | **Sí** (antes No) |
| RF-16 | CP-09 | Aprobada | **Sí** (antes No) |
| RF-17 + RF-19 | CP-13 | Aprobada | **Sí** |
| RF-18 | CP-06 | Pendiente-disp. | No |
| RR-03 | CP-14 | Aprobada | **Sí** |

**RF verificados: 9 de 13** (en la corrida 1 eran 5).

---

## Seguimiento de acciones correctivas

Responsable de todas las correcciones: Allan, con Claude Code. Origen: «CP-xx» si salió de un caso de prueba, «Emulador» si salió de la prueba en la build de desarrollo, y «Revisión» si lo reportó el equipo al revisar la app desplegada (Expo Go + Dokploy).

| ID | Origen | Defecto | Sev. | Acción correctiva | Commit (fecha) | Verificación | Estado |
|---|---|---|---|---|---|---|---|
| D-01 | CP-01 | El esperado pedía «cada micro-paso ≤ 5 min», pero la progresión llega a 5 → 10 → 20 min. | Media | Decisión de producto: «el primero ≤ 5 min y cada uno ≤ triple del anterior». Se actualizaron las instrucciones y el contexto. | docs (23-nov) | Backend ✓ CP-01 | **Cerrado.** Falta pasarlo al SRS del Drive. |
| D-02 | CP-10 | La base local no estaba cifrada (RNF-05). | Alta | SQLCipher en `app.json`, clave aleatoria de 256 bits en SecureStore, `PRAGMA key` y recreación de bases viejas. | `81b9ade` (23-nov) | `cifrado.test.ts` 4 ✓ · emulador: sin `SQLite format 3` | **Cerrado** |
| D-03 | CP-15 | El modo enfoque no activaba No Molestar en Android con permiso. | Alta | Módulo nativo local `modules/no-molestar` (Kotlin, `setInterruptionFilter`). Guarda y restaura el filtro previo. En iOS no se intenta. | `99605f7` (23-nov) | `no-molestar.test.ts` 4 ✓ · emulador `zen_mode` 0→1→0 | **Cerrado** |
| D-04 | CP-04 | Un bloque nuevo no revisaba los recordatorios que ya caían en esa franja. | Media | Al guardar un bloque se buscan los choques y se ofrece moverlos a la primera hora libre en un toque. | `5f77f46` (23-nov) | `PantallaAgenda.test.tsx` 2 ✓ | **Cerrado** |
| D-05 | Emulador (CP-03, CP-06) | Sin el permiso «Alarmas y recordatorios», los avisos llegaban hasta 1 h tarde; el resumen de las 21:00 no llegó a su hora. | Alta | Se declaró `SCHEDULE_EXACT_ALARM`, se pide con un diálogo que explica para qué y se reprograma todo al darlo. | `07269d5` (23-nov) | Emulador: CP-03 ✓ | **Corregido, verificación parcial:** falta re-probar CP-06. |
| D-06 | Emulador (CP-15) | Al terminar la sesión decía «recuerda quitar No Molestar» aunque most. ya lo había quitado. | Baja | El texto solo aparece si No Molestar se activó a mano. | `a66f236` (23-nov) | Emulador ✓ | **Cerrado** |
| D-07 | Emulador (RI-04) | Si fallaba crear el canal de avisos, la categoría con «Hecho ✓» nunca se registraba y el error no se veía. | Media | Canal y categoría se registran por separado y el error se muestra en el log. | `54e03e8` (23-nov) | Emulador: «Hecho ✓» marca el hábito (+10 monedas) | **Cerrado** |
| D-08 | Revisión (UC-01) | Se podía entrar sin hacer la encuesta, así que no había perfil para armar los micro-pasos. | Alta | Encuesta obligatoria antes de entrar; las cuentas anteriores la responden al abrir la app. | `29bc45f` (24-nov) | Pruebas de `session-route` y del cuestionario ✓ | **Cerrado** |
| D-09 | Revisión (UC-01) | La encuesta inicial generaba hábitos, cuando su objetivo es conocer al usuario. | Media | La encuesta queda en 5 preguntas de perfil y se guarda sin hábitos. Después se abre «Crear meta» con «Lo hago después». | `6fef712` (24-nov) | `form-rules.test.ts` y `PantallaCrearMeta.test.tsx` ✓ · prueba de punta a punta contra la API: 0 hábitos tras la encuesta, `/ia/meta` usa el perfil | **Cerrado** |
| D-10 | Revisión (P5) | La hora del hábito ignoraba sus días: por ejemplo, «al levantarte» quedaba a las 20:30. | Media | La hora sale del momento libre de los días del hábito, y la IA respeta los ratos libres. | `fae9b63` (24-nov) | Pruebas del motor del plan y del backend ✓ | **Cerrado** |
| D-11 | Revisión (RNF-11) | En iPhone, «Elegir hora» no abría nada (usaba el reloj solo de Android), así que no se podía cambiar la hora del recordatorio. Pasaba en 4 pantallas. | Alta | Ruedas de hora propias, iguales en Android e iOS (`RuedasHora` + `useReloj`). | `2771a41` (24-nov) | `ruedas-hora.test.tsx` 4 ✓ (incluye iOS simulado) | **Corregido:** falta verificar en iPhone. |
| D-12 | Revisión | En Hoy sin hábitos, «Crear mi primer hábito» no ofrecía elegir entre micro-pasos y a mi manera. | Baja | Usa el mismo diálogo que el «+» de Hábitos. | `8882c6b` (24-nov) | Suite completa ✓ (sin prueba propia) | **Cerrado** |
| D-13 | Revisión | Tocar un hábito abría directamente la edición. | Media | Nueva vista previa `/habit/ver/[id]` con datos y micro-pasos. Editar queda solo en el menú ⋮. | `9175b0b` (24-nov) | `PantallaVerHabito.test.tsx` 2 ✓ | **Cerrado** |
| D-14 | Revisión (RF-02) | En «Mi agenda», cambiar un día de un bloque L–V cambiaba todos los días; los bloques no iban en orden y no se veía el tiempo libre. | Media | Vista por día con ratos libres. «Solo el {día}» separa ese día en una sola transacción. | `83758c2` (25-nov) | `agenda-dia.test.ts` 7 ✓ · `PantallaAgenda.test.tsx` 2 ✓ | **Cerrado** |

**Totales:** 14 acciones.
- **Cerradas:** 12.
- **Corregidas con verificación pendiente en dispositivo:** 2. D-05 espera la re-prueba de CP-06; D-11 espera un iPhone.
- **Abiertas sin corregir:** 0.

**Mejoras pedidas en la revisión.** No son defectos, pero quedan registradas:
- `f68edd3`: el «+» de Hábitos ofrece «Con micro-pasos» o «A mi manera».
- `82e23a1`: se elige qué planta sale en Hoy.
- `55887ac`: se quitó «Crear plan» de Mis planes.

**Limitación del despliegue temporal (Expo Go):**
- La base **no se cifra**, porque Expo Go no incluye SQLCipher.
- No Molestar y el toque a las notificaciones tampoco funcionan.
- Esos puntos se prueban solo en la build de desarrollo.

### Pasos manuales que quedan (corrida 3)

Anoten el resultado el mismo día en esta tabla.
- **CP-06 (Android, build de desarrollo):** dar el permiso «Alarmas y recordatorios», activar el resumen y poner el reloj a las 20:58. Esperado: a las 21:00 llega «Mañana te esperan 2 hábitos» y al tocarla se abre Hoy.
- **CP-08 (Android, build de desarrollo):** completar «Tomar agua» 3 días seguidos, cambiando la fecha del teléfono. Esperado: llega un solo banner y al tocarlo se abre Progreso.
- **CP-03 (iPhone):** elegir la hora con las ruedas (D-11) y mandar la app a segundo plano. Esperado: el aviso llega a la hora.
- **CP-16 (iPhone):** iniciar una sesión de 25 min. Esperado: no hay diálogo del sistema ni cambios de ajustes, y los avisos de most. vuelven al terminar.
