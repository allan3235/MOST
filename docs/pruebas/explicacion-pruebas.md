# Pruebas automáticas de most.: de dónde salen y qué revisan

Para: Kimberly (Product Owner, plan de pruebas). Acompaña a la lista completa
[`pruebas-automaticas.md`](pruebas-automaticas.md) (también en [`.csv`](pruebas-automaticas.csv)
para hoja de cálculo) y a los resultados de los CP en [`resultados.md`](resultados.md).

Corrida del 25-nov-2026 sobre `main`: **515 pruebas, 515 aprobadas, 0 fallidas**. El punto 7 desglosa las 515 una por una.

---

## 1. Qué es una prueba automática

Es un programa pequeño que usa una parte de la app y revisa que el resultado sea el esperado, sin
que nadie toque el teléfono. Por ejemplo, la prueba de CP-04 le da a la agenda un bloque ocupado
de 10:00 a 11:00, pide un recordatorio a las 10:30 y comprueba que se rechace y que se sugieran las
11:00. Si alguien cambia el código y rompe esa regla, la prueba falla y avisa.

Cada prueba tiene un nombre que dice qué revisa. Cuando revisa un caso del plan de pruebas, el
nombre empieza con su ID, por ejemplo «CP-04: 10:00 en la franja 10:00–11:00 se rechaza y se
sugiere 11:00».

## 2. De dónde salen

### 2.1 Dónde viven

Las pruebas están **dentro del repositorio, junto al código que revisan**:

| Parte | Dónde | Herramienta |
|---|---|---|
| App (`mobile/`) | carpetas `__tests__/`, archivos `*.test.ts` o `*.test.tsx` | **Jest** con *jest-expo* (lógica) y **Testing Library** (pantallas) |
| Backend (`backend/`) | junto a cada archivo, `*.spec.ts` | **Vitest** |

Por ejemplo, las reglas de la agenda están en `mobile/src/zonas/recordatorios/logica/agenda.ts` y
sus pruebas en `mobile/src/zonas/recordatorios/logica/__tests__/agenda.test.ts`.

### 2.2 Quién las escribió (origen)

Hay tres orígenes, y la tabla del punto 5 dice cuál corresponde a cada archivo:

| Origen | Qué son | Cómo se reconocen |
|---|---|---|
| **Heredadas** | Venían con el código base de «Habit Green», sobre el que se armó most. Revisan reglas que ya existían: fechas, sincronización, cuentas, recompensas, el motor del plan. | Archivos sin encabezado ECM-TS. Algunas se ampliaron con pruebas de CP (por ejemplo, `esquema-habito.test.ts` tiene CP-05, CP-12 y CP-14). |
| **De los RF y CP** | Escritas en este proyecto (Allan con Claude Code) para cubrir los RF del SRS v4.0 y los casos CP-01 a CP-16. | Encabezado `@autor Allan…` y el CP o RF en el nombre. |
| **De las correcciones** | Escritas al corregir un defecto (D-02 a D-14, ver `resultados.md`), para que no vuelva a pasar. | El defecto en el nombre o en el encabezado (por ejemplo, D-04 en `PantallaAgenda.test.tsx`). |

### 2.3 Cómo se sacó la lista

La lista **no se escribió a mano**. Sale del reporte que generan las mismas herramientas al correr
las pruebas:

1. `cd mobile && pnpm jest --json --outputFile=app.json` corre las 482 pruebas de la app y guarda
   el resultado de cada una (nombre, archivo, aprobada o fallida).
2. `cd backend && pnpm vitest run --reporter=json --outputFile=back.json` hace lo mismo con las 33
   del backend.
3. Un script pequeño junta los dos reportes y los convierte en la tabla de
   `pruebas-automaticas.md` y en el `.csv`. También busca en el nombre de cada prueba los códigos
   CP, RF, RR, UC y D para llenar la columna «Casos».

Cualquiera puede repetirlo desde la raíz del repositorio:

```bash
cd mobile && pnpm test     # 482 pruebas de la app
cd ../backend && pnpm test # 33 pruebas del backend
```

### 2.4 Por qué antes eran 454 y ahora 515

| Corrida | App | Backend | Total |
|---|---|---|---|
| Corrida 1 (23-nov) | 423 | 31 | 454 |
| Corrida 2 (25-nov) | 482 | 33 | **515** |

Las 61 nuevas cubren las correcciones de la corrida 1 y lo que pidió el equipo al revisar la app:
cifrado de la base (CP-10), No Molestar (CP-15/16), encuesta de perfil, selector de hora en
iPhone, vista previa del hábito, «+» con dos opciones, planta en Hoy y «Mi agenda» por día.

## 3. Tipos de prueba y qué no pueden revisar

| Tipo | Qué hace | Ejemplo |
|---|---|---|
| **Lógica** (la mayoría) | Llama a una regla escrita en TypeScript puro y revisa el resultado. Es rápida y exacta. | «a los 5 de 10 es el hito del 50 % y a los 8 de 10 el del 80 %» (CP-09) |
| **Pantalla** | Dibuja una pantalla en memoria, simula toques y revisa lo que se ve, incluido que no haya palabras de culpa. | «CP-02: con la meta vacía no pide micro-pasos, avisa con tono neutro y conserva lo capturado» |
| **Backend** | Revisa reglas del servidor, como las que corrigen lo que propone la IA. | «un paso de 1 minuto sube al candado mínimo de 2 min (RR-03)» |

**Simulaciones.** Para no depender del teléfono ni de internet, algunas piezas se reemplazan por
versiones de prueba: las notificaciones (`expo-notifications`), la base de datos, la IA, el sonido
y el reloj. Por ejemplo, CP-08 «adelanta» el calendario tres días con una fecha inyectada, en lugar
de esperar tres días reales.

**Lo que una prueba automática no puede comprobar.** Por eso hay casos «Pendiente-dispositivo»:

- que la notificación **llegue de verdad** a la hora con la app en segundo plano (CP-03, CP-06, CP-08);
- que el teléfono **entre a No Molestar** (CP-15, comprobado en el emulador);
- cómo se ve y suena en un **iPhone real** (CP-03, CP-16).

Eso se prueba a mano con la build de desarrollo, siguiendo los pasos de `resultados.md`.

## 4. Cómo leer la lista

En `pruebas-automaticas.md` las pruebas van numeradas del 1 al 515 y agrupadas por archivo:

| Columna | Qué es |
|---|---|
| **#** | Número de la prueba en la lista |
| **Grupo** | El tema dentro del archivo (en el código se llama `describe`) |
| **Prueba** | Lo que revisa, dicho como resultado esperado |
| **Casos** | CP, RF, RR, UC o defectos que menciona; vacío si es una regla interna |
| **Resultado** | Aprobada o Fallida en esta corrida |

Para el plan de pruebas, lo más útil es filtrar el `.csv` por la columna «Casos»: muestra qué
pruebas respaldan cada CP.

## 5. Qué revisa cada archivo

Agrupados por zona de la app (la misma división que el SRS: cuenta, cuestionario, planes, hábitos,
recordatorios, reajuste, plantas, progreso, enfoque).

### Base común (datos, sincronización, utilidades)

| Archivo | Qué revisa | Pruebas | Casos | Origen |
|---|---|---|---|---|
| `comun/datos/cifrado.test.ts` | La base del teléfono se cifra con una clave de 256 bits guardada en el almacén seguro. | 4 | CP-10, RNF-05 | Corrección D-02 |
| `comun/datos/clienteApi.test.ts` | La conexión con el servidor: token, errores, sin internet y sesión caducada. | 6 | — | RF |
| `comun/datos/dueno-base.test.ts` | Si entra otra cuenta en el mismo teléfono, se borran los datos de la anterior. | 3 | — | Heredada |
| `comun/logica/fecha-hoy.test.ts` | Si cambia el día con la app abierta, la lista se actualiza una sola vez. | 2 | — | Heredada |
| `comun/logica/sync/sync-rules.test.ts` | Reglas para subir y bajar cambios cuando vuelve el internet (offline-first). | 17 | — | Heredada |
| `comun/modelo/esquemas/onboarding.test.ts` | Las respuestas válidas de la encuesta (P5 por día, P6 con varias respuestas). | 12 | UC-01 | Heredada (ampliada) |
| `comun/modelo/esquemas/plan.test.ts` | Qué respuestas de la IA se aceptan al armar un plan. | 8 | — | Heredada |
| `comun/presentacion/candado.test.ts` | Un toque doble rápido no ejecuta dos veces la misma acción. | 4 | — | Heredada |
| `comun/presentacion/ui/ruedas-hora.test.tsx` | El selector de hora funciona igual en Android y en iPhone. | 4 | RNF-11 | Corrección D-11 |
| `comun/util/dates.test.ts` | Fechas: día de la semana y sumar días entre meses y años. | 3 | — | Heredada |

### Cuenta

| Archivo | Qué revisa | Pruebas | Casos | Origen |
|---|---|---|---|---|
| `cuenta/auth-error-message.test.ts` | Los errores al entrar se explican en lenguaje claro, sin texto técnico. | 3 | RNF-09 | Heredada |
| `cuenta/auth-schemas.test.ts` | Validación de correo y contraseña al registrarse y entrar. | 8 | — | Heredada |
| `cuenta/form-aviso.test.ts` | Un solo aviso claro cuando falta algo en el formulario. | 3 | — | Heredada |
| `cuenta/sesion-caducada.test.ts` | La sesión aguanta 60 días sin internet. | 5 | — | Heredada |
| `cuenta/session-route.test.ts` | A qué pantalla va cada persona: sin cuenta, sin encuesta o lista. | 7 | UC-01 | Heredada (ampliada, D-08) |

### Cuestionario (encuesta inicial)

| Archivo | Qué revisa | Pruebas | Casos | Origen |
|---|---|---|---|---|
| `cuestionario/form-rules.test.ts` | Las 5 preguntas del perfil, cuándo se puede avanzar y los recorridos de la encuesta. | 17 | UC-01 | Heredada (ampliada, D-09) |
| `cuestionario/retomar.test.ts` | Si se cierra la app a media encuesta, se vuelve a la misma pregunta. | 2 | UC-01 | Heredada |

### Planes y «Crear meta» (M1)

| Archivo | Qué revisa | Pruebas | Casos | Origen |
|---|---|---|---|---|
| `planes/PantallaCrearMeta.test.tsx` | Crear meta: lista ordenada de micro-pasos, meta vacía con tono neutro, sin perfil y primer hábito. | 4 | CP-01, CP-02, UC-01 | RF |
| `planes/ListaMicroPasos.test.tsx` | La lista de micro-pasos: orden, paso en curso y lectura con TalkBack. | 4 | RF-03, RF-16 | RF |
| `planes/repositorioMetas.test.ts` | Pedir la meta al servidor: propuesta, sin internet y rechazos. | 4 | RF-03 | RF |
| `planes/plan-engine.test.ts` | El motor del plan: días, hora, nivel y segundo aviso según la encuesta. | 27 | — | Heredada (ampliada, D-10) |
| `planes/plan-review.test.ts` | Revisión del plan antes de confirmarlo (UC-15). | 17 | — | Heredada |
| `planes/plan-rows.test.ts` | Qué se guarda al confirmar un plan. | 8 | — | Heredada |
| `planes/detalle-plan.test.ts` | «Cómo vas» en el detalle de un plan. | 4 | — | Heredada |
| `planes/plan-format.test.ts` | Textos de la tarjeta de un plan. | 4 | — | Heredada |
| `planes/respuestas-plan.test.ts` | Respuestas que usa cada plan. | 2 | — | Heredada |
| `planes/sugerencias-plan.test.ts` | Sugerencias para agregar un hábito a un plan. | 2 | — | Heredada |
| `planes/tiempo-libre.test.ts` | Si un plan nuevo cabe en el tiempo libre del día. | 3 | — | Heredada |

### Hábitos

| Archivo | Qué revisa | Pruebas | Casos | Origen |
|---|---|---|---|---|
| `habitos/esquema-habito.test.ts` | Validación del hábito: sin hora no se guarda, ajuste de días y minutos y candado mínimo. | 18 | CP-05, CP-12, CP-14, RR-03 | Heredada (ampliada) |
| `habitos/use-check-in.test.tsx` | Al marcar un micro-paso: moneda «+10» en menos de 1.5 s y celebración de hitos. | 3 | CP-07, CP-09 | RF |
| `habitos/PantallaVerHabito.test.tsx` | Vista previa del hábito sin botón de editar. | 2 | — | Corrección D-13 |
| `habitos/DialogoAgregarHabito.test.tsx` | El «+» ofrece «Con micro-pasos» o «A mi manera». | 2 | — | Mejora de la revisión |
| `habitos/habitos-del-dia.test.ts` | Qué hábitos tocan cada día (pausados y archivados no). | 8 | — | Heredada |
| `habitos/horario.test.ts` | Cambiar un horario no altera las estadísticas pasadas. | 6 | RF-09 | Heredada |
| `habitos/presupuesto.test.ts` | Tiempo diario: suma de minutos y límites. | 9 | — | Heredada |
| `habitos/borrador-habito.test.ts` | Si se sale a medio crear un hábito, se retoma. | 5 | — | Heredada |
| `habitos/limite-habitos.test.ts` | Límite de 3 hábitos al empezar. | 4 | — | Heredada |
| `habitos/fechas.test.ts` · `formato.test.ts` · `valores-formulario.test.ts` | Fechas del asistente, textos de la tarjeta y valores iniciales. | 10 | — | Heredada |

### Recordatorios y agenda (M2)

| Archivo | Qué revisa | Pruebas | Casos | Origen |
|---|---|---|---|---|
| `recordatorios/planificar-avisos.test.ts` | Qué avisos se programan y a qué hora: diario a las 10:00, resumen de las 21:00 y reajuste a L-M-V. | 29 | CP-03, CP-06, CP-12, RF-18 | Heredada (ampliada) |
| `recordatorios/agenda.test.ts` | Un recordatorio en una franja ocupada se rechaza y se sugiere la siguiente hora libre. | 8 | CP-04, D-04 | RF |
| `recordatorios/agenda-dia.test.ts` | «Mi agenda» por día: orden, ratos libres y cambiar solo un día. | 7 | RF-02 | Corrección D-14 |
| `recordatorios/PantallaAgenda.test.tsx` | Al guardar un bloque, avisa del recordatorio que quedó adentro y lo mueve. | 4 | D-04 | Corrección D-04 |
| `recordatorios/aviso-motivacional.test.ts` | Aviso tras 3 días seguidos y máximo uno al día. | 3 | CP-08 | RF |
| `recordatorios/permiso.test.ts` | Permiso de avisos y de alarmas exactas. | 5 | RF-01 | Heredada (ampliada, D-05) |
| `recordatorios/semana-apoyo.test.ts` · `historial-plan.test.ts` | Apoyo extra en las semanas 3 y 4. | 5 | — | Heredada |

### Reajuste e introspección (M4)

| Archivo | Qué revisa | Pruebas | Casos | Origen |
|---|---|---|---|---|
| `reajuste/progresion.test.ts` | Cuándo subir o bajar un paso; con menos del 40 % en 7 días propone una meta intermedia; candado mínimo. | 32 | CP-11, RF-15, RR-03 | Heredada (ampliada) |
| `reajuste/meta-intermedia.test.tsx` | Aplicar la meta intermedia no borra el historial. | 1 | CP-11 | RF |
| `reajuste/meta-intermedia-tarjeta.test.tsx` | La meta intermedia se aplica en un toque, sin mensajes de fracaso. | 1 | CP-11 | RF |
| `reajuste/barreras.test.ts` | Lista de barreras: máximo 3 opciones; con «falta de tiempo», la versión ligera va primero. | 5 | CP-13 | RF |
| `reajuste/TarjetaBarreras.test.tsx` | La alternativa se aplica en un toque y sin palabras de culpa. | 2 | CP-13 | RF |
| `reajuste/introspeccion.test.ts` | 1 a 3 preguntas de valores, escala 1–5, sin palabras clínicas. | 4 | CP-10, RF-04 | RF |
| `reajuste/DialogoIntrospeccion.test.tsx` | Responder con la escala, saltar una pregunta y guardar. | 2 | CP-10 | RF |
| `reajuste/reprogramar.test.ts` · `texto-dia.test.ts` | Mover un día no hecho a otro día, sin contarlo como fallo. | 19 | — | Heredada |

### Plantas y recompensas (M3)

| Archivo | Qué revisa | Pruebas | Casos | Origen |
|---|---|---|---|---|
| `plantas/recompensas.test.ts` | XP, fases de la planta y monedas al completar; queda registrado. | 18 | CP-07, RF-08 | Heredada (ampliada) |
| `plantas/hitos.test.ts` | Hitos del 50 % (5 de 10) y del 80 % (8 de 10). | 4 | CP-09 | RF |
| `plantas/equipar.test.ts` · `estado-objeto.test.ts` | Tienda y accesorios: comprar y equipar. | 18 | — | Heredada |
| `plantas/planta-destacada.test.ts` | Qué planta sale en Hoy, incluida la que elige la persona. | 5 | — | Heredada (ampliada) |

### Progreso

| Archivo | Qué revisa | Pruebas | Casos | Origen |
|---|---|---|---|---|
| `progreso/cumplimiento.test.ts` | Cómo se cuenta el cumplimiento; los días en pausa no cuentan como fallo. | 22 | RF-09, RF-17 | Heredada |
| `progreso/rachas.test.ts` | Avance acumulado sin rachas que se borren. | 4 | RNF-07 | RF |
| `progreso/periodos.test.ts` · `texto-periodo.test.ts` | Semana, mes y año en Progreso, y sus textos. | 21 | — | Heredada |

### Modo enfoque (M5)

| Archivo | Qué revisa | Pruebas | Casos | Origen |
|---|---|---|---|---|
| `enfoque/enfoque.test.ts` | Durante la sesión la app no emite sus avisos; al terminar vuelven. | 4 | CP-15, CP-16 | RF |
| `enfoque/no-molestar.test.ts` | Android con permiso entra y sale de No Molestar; sin permiso o en iOS no se toca nada. | 5 | CP-15, CP-16 | Corrección D-03 |

### Backend

| Archivo | Qué revisa | Pruebas | Casos | Origen |
|---|---|---|---|---|
| `ia/reglasMicroPasos.spec.ts` | Reglas que la IA no puede romper: 3 a 5 pasos, el primero ≤ 5 min, cada uno ≤ triple del anterior, mínimo 2 min y solo días libres. | 16 | CP-01, RF-03, RR-03 | RF |
| `sync/constructorSql.spec.ts` | Armado seguro de las consultas de sincronización. | 9 | — | RF |
| `ia/combinarPlan.spec.ts` | Unir el hábito del motor con los micro-pasos de la IA. | 3 | — | RF |
| `auth/contrasena.spec.ts` | Las contraseñas se guardan con hash, nunca en claro. | 3 | RNF-05 | RF |
| `baseDatos/tiposPostgres.spec.ts` | Conversión de fechas y horas de la base. | 2 | — | RF |

## 6. Relación con los casos CP

| CP | Pruebas automáticas que lo respaldan | Estado (corrida 2) |
|---|---|---|
| CP-01 | `PantallaCrearMeta` · `reglasMicroPasos` (backend) | Aprobada |
| CP-02 | `PantallaCrearMeta` | Aprobada |
| CP-03 | `planificar-avisos` | Pendiente-dispositivo (iPhone) |
| CP-04 | `agenda` · `PantallaAgenda` | Aprobada |
| CP-05 | `esquema-habito` | Aprobada |
| CP-06 | `planificar-avisos` | Pendiente-dispositivo |
| CP-07 | `recompensas` · `use-check-in` | Aprobada |
| CP-08 | `aviso-motivacional` | Pendiente-dispositivo |
| CP-09 | `hitos` · `use-check-in` | Aprobada |
| CP-10 | `introspeccion` · `DialogoIntrospeccion` · `cifrado` | Aprobada |
| CP-11 | `progresion` · `meta-intermedia` · `meta-intermedia-tarjeta` | Aprobada |
| CP-12 | `esquema-habito` · `planificar-avisos` | Aprobada |
| CP-13 | `barreras` · `TarjetaBarreras` | Aprobada |
| CP-14 | `esquema-habito` · `reglasMicroPasos` | Aprobada |
| CP-15 | `enfoque` · `no-molestar` (+ emulador) | Aprobada |
| CP-16 | `enfoque` · `no-molestar` | Pendiente-dispositivo (iPhone) |

Las pruebas automáticas respaldan los 16 casos. Que un CP diga «Pendiente-dispositivo» no
significa que su prueba falle: su parte automática pasa, pero falta verlo en un teléfono. Los
detalles y los pasos manuales están en `resultados.md`.

## 7. Desglose de todas las pruebas automáticas

Las 515 pruebas, una por una, en el mismo orden de zonas del punto 5. Sale del reporte de la corrida del 25-nov-2026 (`pnpm jest --json` y `pnpm vitest run --reporter=json`), no se escribió a mano.

Cómo leer cada fila:

- **Qué comprueba**: el nombre de la prueba. Está escrito como el resultado esperado; si la app deja de hacer eso, la prueba falla.
- **Grupo**: el tema dentro del archivo.
- **Tipo**: *Lógica* (regla en TypeScript), *Pantalla* (se dibuja la pantalla y se simulan toques) o *Backend* (servidor).
- **Casos**: CP, RF, RR, UC o defecto que menciona la prueba.
- **Dispositivo**: «Sí» cuando el caso además necesita probarse en un teléfono (la parte automática no puede ver la notificación real ni un iPhone).

### 7.1 Base común (datos, sincronización, utilidades) (63 pruebas)

#### `mobile/src/comun/datos/__tests__/cifrado.test.ts`

- **Qué revisa:** La base del teléfono se cifra con una clave de 256 bits guardada en el almacén seguro.
- **Tipo:** Lógica · **Origen:** Corrección D-02 · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 1 | crea una clave aleatoria de 256 bits, la guarda en el almacén seguro y la reutiliza | CP-10: cifrado de la base local | CP-10 | — | Aprobada |
| 2 | con SQLCipher aplica la clave con PRAGMA key y la base queda cifrada | CP-10: cifrado de la base local | CP-10 | — | Aprobada |
| 3 | si la clave no abre el archivo (base vieja sin cifrar) pide recrearla | CP-10: cifrado de la base local | CP-10 | — | Aprobada |
| 4 | sin SQLCipher (Expo Go) no ejecuta PRAGMA key | CP-10: cifrado de la base local | CP-10 | — | Aprobada |

#### `mobile/src/comun/datos/__tests__/clienteApi.test.ts`

- **Qué revisa:** La conexión con el servidor: token, errores, sin internet y sesión caducada.
- **Tipo:** Lógica · **Origen:** RF · **Pruebas:** 6

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 5 | manda el token y arma la URL con los parámetros | pedirApi | — | — | Aprobada |
| 6 | un rechazo trae el code del backend (la cola lo descarta) | pedirApi | — | — | Aprobada |
| 7 | un error sin code se puede reintentar | pedirApi | — | — | Aprobada |
| 8 | sin red lanza ErrorSinRed | pedirApi | — | — | Aprobada |
| 9 | un 401 con sesión la cierra (caducó) | pedirApi | — | — | Aprobada |
| 10 | registro e inicio de sesión no llevan token | pedirApi | — | — | Aprobada |

#### `mobile/src/comun/datos/__tests__/dueno-base.test.ts`

- **Qué revisa:** Si entra otra cuenta en el mismo teléfono, se borran los datos de la anterior.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 3

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 11 | la misma cuenta conserva sus datos | dueño de la base local | — | — | Aprobada |
| 12 | otra cuenta vacía la base | dueño de la base local | — | — | Aprobada |
| 13 | sin dueño anotado, solo se anota | dueño de la base local | — | — | Aprobada |

#### `mobile/src/comun/logica/__tests__/fecha-hoy.test.ts`

- **Qué revisa:** Si cambia el día con la app abierta, la lista se actualiza una sola vez.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 2

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 14 | calcula lo que falta para la medianoche local | cambio de día con la app abierta | — | — | Aprobada |
| 15 | sin cambio de día no avisa; al cambiar, avisa una sola vez | cambio de día con la app abierta | — | — | Aprobada |

#### `mobile/src/comun/logica/sync/__tests__/sync-rules.test.ts`

- **Qué revisa:** Reglas para subir y bajar cambios cuando vuelve el internet (offline-first).
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 17

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 16 | quita un complete seguido de su uncomplete | compactar la cola (SDD 3.4) | — | — | Aprobada |
| 17 | no quita un uncomplete seguido de un complete (el check-in ya estaba en el servidor) | compactar la cola (SDD 3.4) | — | — | Aprobada |
| 18 | marcar, deshacer y volver a marcar deja solo el último complete | compactar la cola (SDD 3.4) | — | — | Aprobada |
| 19 | no quita un complete que ya se intentó enviar (pudo llegar al servidor sin respuesta) | compactar la cola (SDD 3.4) | — | — | Aprobada |
| 20 | no mezcla hábitos ni fechas distintas | compactar la cola (SDD 3.4) | — | — | Aprobada |
| 21 | {"code":"22008"} → true | rechazos del servidor | — | — | Aprobada |
| 22 | {"code":"PGRST116"} → true | rechazos del servidor | — | — | Aprobada |
| 23 | {"code":""} → false | rechazos del servidor | — | — | Aprobada |
| 24 | {"code":null} → false | rechazos del servidor | — | — | Aprobada |
| 25 | {} → false | rechazos del servidor | — | — | Aprobada |
| 26 | null → false | rechazos del servidor | — | — | Aprobada |
| 27 | no pisa filas con cambios locales pendientes | mezcla de filas descargadas | — | — | Aprobada |
| 28 | un update pendiente también protege su fila | mezcla de filas descargadas | — | — | Aprobada |
| 29 | los update no se compactan con los check-ins | mezcla de filas descargadas | — | — | Aprobada |
| 30 | toma el updated_at más reciente del servidor | cursor de descarga | — | — | Aprobada |
| 31 | compara microsegundos aunque la fracción tenga distinto largo | cursor de descarga | — | — | Aprobada |
| 32 | conserva el anterior si no llegó nada | cursor de descarga | — | — | Aprobada |

#### `mobile/src/comun/modelo/esquemas/__tests__/onboarding.test.ts`

- **Qué revisa:** Las respuestas válidas de la encuesta (P5 por día, P6 con varias respuestas).
- **Tipo:** Lógica · **Origen:** Heredada (ampliada) · **Pruebas:** 12

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 33 | cada objetivo pertenece a un área y no hay objetivos sueltos | claves del formulario | — | — | Aprobada |
| 34 | acepta el ejemplo del SDD 4 | respuestasSchema | — | — | Aprobada |
| 35 | exige de 1 a 2 áreas y objetivos | respuestasSchema | — | — | Aprobada |
| 36 | rechaza objetivos de un área no elegida | respuestasSchema | — | — | Aprobada |
| 37 | rechaza repetidos y claves desconocidas | respuestasSchema | — | — | Aprobada |
| 38 | las respuestas de la versión 3 se convierten al validarlas | versión 4: P5 por día y P6 con varias respuestas | — | — | Aprobada |
| 39 | «varía» de la versión 3 queda como cualquier momento: el aviso sigue siendo flexible | versión 4: P5 por día y P6 con varias respuestas | — | — | Aprobada |
| 40 | el momento principal es el primero que se repite en todos los días libres | versión 4: P5 por día y P6 con varias respuestas | — | — | Aprobada |
| 41 | pide al menos un momento en la semana y al menos un obstáculo | versión 4: P5 por día y P6 con varias respuestas | — | — | Aprobada |
| 42 | en días con mañana y noche libres reparte: el primer hábito mañana, el segundo noche | momento de un hábito según sus días | — | — | Aprobada |
| 43 | si incluye el sábado (solo noche), queda en la noche | momento de un hábito según sus días | — | — | Aprobada |
| 44 | dice qué días tienen libre cada momento | momento de un hábito según sus días | — | — | Aprobada |

#### `mobile/src/comun/modelo/esquemas/__tests__/plan.test.ts`

- **Qué revisa:** Qué respuestas de la IA se aceptan al armar un plan.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 8

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 45 | acepta exactamente los objetivos pedidos, en cualquier orden | respuesta de la IA (SDD 5.9) | — | — | Aprobada |
| 46 | rechaza: falta un objetivo | respuesta de la IA (SDD 5.9) | — | — | Aprobada |
| 47 | rechaza: objetivo repetido | respuesta de la IA (SDD 5.9) | — | — | Aprobada |
| 48 | rechaza: objetivo no pedido | respuesta de la IA (SDD 5.9) | — | — | Aprobada |
| 49 | rechaza: objetivo inventado | respuesta de la IA (SDD 5.9) | — | — | Aprobada |
| 50 | rechaza: título muy largo | respuesta de la IA (SDD 5.9) | — | — | Aprobada |
| 51 | rechaza: resumen muy largo | respuesta de la IA (SDD 5.9) | — | — | Aprobada |
| 52 | rechaza: no es un objeto | respuesta de la IA (SDD 5.9) | — | — | Aprobada |

#### `mobile/src/comun/presentacion/__tests__/candado.test.ts`

- **Qué revisa:** Un toque doble rápido no ejecuta dos veces la misma acción.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 53 | un toque doble rápido corre la acción una sola vez | un solo toque por acción | — | — | Aprobada |
| 54 | se libera después de la espera | un solo toque por acción | — | — | Aprobada |
| 55 | con una acción asíncrona espera a que termine | un solo toque por acción | — | — | Aprobada |
| 56 | si la acción falla, se libera igual | un solo toque por acción | — | — | Aprobada |

#### `mobile/src/comun/presentacion/ui/__tests__/ruedas-hora.test.tsx`

- **Qué revisa:** El selector de hora funciona igual en Android y en iPhone.
- **Tipo:** Pantalla · **Origen:** Corrección D-11 · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 57 | separan y arman "HH:MM" | partesDeHora y formatearHora | — | — | Aprobada |
| 58 | un valor raro queda en 00:00 | partesDeHora y formatearHora | — | — | Aprobada |
| 59 | «Aceptar» devuelve la hora elegida tocando otra opción | RuedasHora | — | — | Aprobada |
| 60 | «Elegir hora» muestra las ruedas y guarda la hora | ReminderDialog en iPhone | — | — | Aprobada |

#### `mobile/src/comun/util/__tests__/dates.test.ts`

- **Qué revisa:** Fechas: día de la semana y sumar días entre meses y años.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 3

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 61 | fechaLocal usa la fecha del teléfono | fechas de hábitos | — | — | Aprobada |
| 62 | suma y resta días cruzando meses y años | fechas de hábitos | — | — | Aprobada |
| 63 | día ISO: lunes = 1, domingo = 7 | fechas de hábitos | — | — | Aprobada |

### 7.2 Cuenta (26 pruebas)

#### `mobile/src/zonas/cuenta/logica/__tests__/auth-error-message.test.ts`

- **Qué revisa:** Los errores al entrar se explican en lenguaje claro, sin texto técnico.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 3

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 64 | traduce los estados conocidos del backend | authErrorMessage | — | — | Aprobada |
| 65 | reconoce los fallos de red | authErrorMessage | — | — | Aprobada |
| 66 | nunca muestra el texto técnico | authErrorMessage | — | — | Aprobada |

#### `mobile/src/zonas/cuenta/logica/__tests__/auth-schemas.test.ts`

- **Qué revisa:** Validación de correo y contraseña al registrarse y entrar.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 8

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 67 | normaliza el correo (espacios y mayúsculas) | loginSchema | — | — | Aprobada |
| 68 | pide el correo y la contraseña | loginSchema | — | — | Aprobada |
| 69 | rechaza un correo mal escrito | loginSchema | — | — | Aprobada |
| 70 | acepta hasta 50 caracteres y rechaza más (decisión del usuario) | loginSchema | — | — | Aprobada |
| 71 | rechaza dos «@» | loginSchema | — | — | Aprobada |
| 72 | acepta datos válidos | registerSchema | — | — | Aprobada |
| 73 | exige al menos 8 caracteres | registerSchema | — | — | Aprobada |
| 74 | marca el error en la confirmación si no coincide | registerSchema | — | — | Aprobada |

#### `mobile/src/zonas/cuenta/logica/__tests__/form-aviso.test.ts`

- **Qué revisa:** Un solo aviso claro cuando falta algo en el formulario.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 3

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 75 | sin errores no hay aviso | aviso único del formulario | — | — | Aprobada |
| 76 | si falta algún campo, avisa de los campos vacíos | aviso único del formulario | — | — | Aprobada |
| 77 | si no falta nada, muestra el primer error en orden | aviso único del formulario | — | — | Aprobada |

#### `mobile/src/zonas/cuenta/logica/__tests__/sesion-caducada.test.ts`

- **Qué revisa:** La sesión aguanta 60 días sin internet.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 5

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 78 | sigue abierta hasta 60 días sin conexión | sesión sin conexión | — | — | Aprobada |
| 79 | caduca pasados los 60 días | sesión sin conexión | — | — | Aprobada |
| 80 | sin registro de conexión no caduca | sesión sin conexión | — | — | Aprobada |
| 81 | le queda lo que falta para vencer | aviso de sesión caducada | — | — | Aprobada |
| 82 | vencido o sin mostrar, ya no se ve | aviso de sesión caducada | — | — | Aprobada |

#### `mobile/src/zonas/cuenta/logica/__tests__/session-route.test.ts`

- **Qué revisa:** A qué pantalla va cada persona: sin cuenta, sin encuesta o lista.
- **Tipo:** Lógica · **Origen:** Heredada (ampliada, D-08) · **Pruebas:** 7

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 83 | espera mientras se lee la sesión guardada | resolveAppZone | — | — | Aprobada |
| 84 | manda a la zona de cuenta sin sesión | resolveAppZone | — | — | Aprobada |
| 85 | espera al perfil antes de decidir | resolveAppZone | — | — | Aprobada |
| 86 | muestra el error si el perfil no carga | resolveAppZone | — | — | Aprobada |
| 87 | lleva a la bienvenida si aún no hay modo | resolveAppZone | — | — | Aprobada |
| 88 | UC-01: sin la encuesta no entra a las pestañas, aunque la cuenta ya tuviera modo «tradicional» | resolveAppZone | UC-01 | — | Aprobada |
| 89 | con la encuesta respondida y el plan confirmado entra a las pestañas | resolveAppZone | — | — | Aprobada |

### 7.3 Cuestionario (encuesta inicial) (19 pruebas)

#### `mobile/src/zonas/cuestionario/logica/__tests__/form-rules.test.ts`

- **Qué revisa:** Las 5 preguntas del perfil, cuándo se puede avanzar y los recorridos de la encuesta.
- **Tipo:** Lógica · **Origen:** Heredada (ampliada, D-09) · **Pruebas:** 17

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 90 | agrega y quita valores | alternarSeleccion | — | — | Aprobada |
| 91 | con el máximo elegido, el nuevo reemplaza al primero que se eligió | alternarSeleccion | — | — | Aprobada |
| 92 | al quitar un área descarta sus objetivos | alternarArea | — | — | Aprobada |
| 93 | un plan es de un área: elegir otra la reemplaza y descarta sus objetivos | alternarArea | — | — | Aprobada |
| 94 | la encuesta inicial tiene 5 preguntas; un plan con perfil, 2; sin perfil, las 7 | alternarArea | — | — | Aprobada |
| 95 | la encuesta inicial no pregunta área ni objetivos (UC-01) | alternarArea | UC-01 | — | Aprobada |
| 96 | un paso fuera del recorrido se acota | alternarArea | — | — | Aprobada |
| 97 | un tercer objetivo reemplaza al primero elegido | alternarObjetivo | — | — | Aprobada |
| 98 | cada paso pide su respuesta | pasoCompleto y respuestasCompletas | — | — | Aprobada |
| 99 | el perfil está completo sin área ni objetivos | pasoCompleto y respuestasCompletas | — | — | Aprobada |
| 100 | devuelve las respuestas solo si todo está completo | pasoCompleto y respuestasCompletas | — | — | Aprobada |
| 101 | acepta 1 a 7 y regresa al 1 con valores raros | leerPaso | — | — | Aprobada |
| 102 | un botón general marca el momento en los 7 días y, si ya estaba, lo quita de todos | P5 por día y P6 con varias respuestas | — | — | Aprobada |
| 103 | se pueden elegir varios momentos y quedan en orden del día | P5 por día y P6 con varias respuestas | — | — | Aprobada |
| 104 | la cuadrícula cambia un solo día y entonces ya no es igual todos los días | P5 por día y P6 con varias respuestas | — | — | Aprobada |
| 105 | la P5 está completa con al menos un momento en algún día; la P6, con al menos uno | P5 por día y P6 con varias respuestas | — | — | Aprobada |
| 106 | la P6 no tiene tope: se pueden marcar los seis | P5 por día y P6 con varias respuestas | — | — | Aprobada |

#### `mobile/src/zonas/cuestionario/logica/__tests__/retomar.test.ts`

- **Qué revisa:** Si se cierra la app a media encuesta, se vuelve a la misma pregunta.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 2

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 107 | en el paso 3: Empezar y los pasos 1 a 3 (UC-01: ya no hay elección de modo) | retomar el formulario | UC-01 | — | Aprobada |
| 108 | en la revisión: las 5 preguntas del perfil y la revisión al final | retomar el formulario | — | — | Aprobada |

### 7.4 Planes y «Crear meta» (M1) (79 pruebas)

#### `mobile/src/zonas/planes/datos/__tests__/repositorioMetas.test.ts`

- **Qué revisa:** Pedir la meta al servidor: propuesta, sin internet y rechazos.
- **Tipo:** Lógica · **Origen:** RF · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 109 | envía el texto y el área y devuelve la propuesta | descomponerMeta | — | — | Aprobada |
| 110 | sin conexión lo dice (generar necesita internet) | descomponerMeta | — | — | Aprobada |
| 111 | una meta no apropiada o la IA caída traen el mensaje del backend | descomponerMeta | — | — | Aprobada |
| 112 | cualquier otro error es genérico (sin texto técnico) | descomponerMeta | — | — | Aprobada |

#### `mobile/src/zonas/planes/logica/__tests__/detalle-plan.test.ts`

- **Qué revisa:** «Cómo vas» en el detalle de un plan.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 113 | «Cómo vas» cuenta los hábitos del plan en las últimas 2 semanas | detalle del plan | — | — | Aprobada |
| 114 | con menos de 4 días programados es pronto para medir | detalle del plan | — | — | Aprobada |
| 115 | no cuenta hoy ni lo de hace más de 2 semanas | detalle del plan | — | — | Aprobada |
| 116 | días para la revisión: desde la última o desde el inicio, nunca negativos | detalle del plan | — | — | Aprobada |

#### `mobile/src/zonas/planes/logica/__tests__/plan-engine.test.ts`

- **Qué revisa:** El motor del plan: días, hora, nivel y segundo aviso según la encuesta.
- **Tipo:** Lógica · **Origen:** Heredada (ampliada, D-10) · **Pruebas:** 27

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 117 | crea un hábito por objetivo, con su categoría, días y hora del momento elegido | generarPlan | — | — | Aprobada |
| 118 | «mantiene» empieza en nivel 2 si cabe en el presupuesto | generarPlan | — | — | Aprobada |
| 119 | un hábito sin duración no gasta del tiempo diario | generarPlan | — | — | Aprobada |
| 120 | un plan nuevo se acomoda en el tiempo que dejan libre los hábitos que ya tiene | generarPlan | — | — | Aprobada |
| 121 | baja de nivel cuando la duración no cabe | generarPlan | — | — | Aprobada |
| 122 | con un solo objetivo usa todo el presupuesto como máximo | generarPlan | — | — | Aprobada |
| 123 | «poco_tiempo» usa la duración reducida | generarPlan | — | — | Aprobada |
| 124 | el momento fijo del catálogo gana sobre la P5 | generarPlan | — | — | Aprobada |
| 125 | «varia» deja el aviso flexible, salvo con momento fijo | generarPlan | — | — | Aprobada |
| 126 | P5 con varios momentos: cada hábito toma uno distinto para no amontonar los avisos | generarPlan | — | — | Aprobada |
| 127 | P5 por día: los días del hábito se mueven a los días con un rato libre | generarPlan | — | — | Aprobada |
| 128 | P5 que cambia según el día (sin momento común): el aviso es flexible | generarPlan | — | — | Aprobada |
| 129 | P6 con varias respuestas: aplica todas (versión corta, sin equipo) y las guarda | generarPlan | — | — | Aprobada |
| 130 | con el estilo «minimo» los hábitos no avisan por defecto | generarPlan | — | — | Aprobada |
| 131 | falla con un mensaje claro si el catálogo no tiene la fila | generarPlan | — | — | Aprobada |
| 132 | olvido + recordatorio_suave + manana → true | segundo aviso (precedencia P7/P6, SDD 5.6) | — | — | Aprobada |
| 133 | olvido + recordatorio_y_animo + noche → true | segundo aviso (precedencia P7/P6, SDD 5.6) | — | — | Aprobada |
| 134 | olvido + minimo + manana → false | segundo aviso (precedencia P7/P6, SDD 5.6) | — | — | Aprobada |
| 135 | olvido + resumen_nocturno + manana → false | segundo aviso (precedencia P7/P6, SDD 5.6) | — | — | Aprobada |
| 136 | olvido + recordatorio_suave + varia → false | segundo aviso (precedencia P7/P6, SDD 5.6) | — | — | Aprobada |
| 137 | sin «olvido» no hay segundo aviso | segundo aviso (precedencia P7/P6, SDD 5.6) | — | — | Aprobada |
| 138 | con «recursos» usa la variante sin recursos si la base necesita equipo | elegirFilaCatalogo | — | — | Aprobada |
| 139 | si la base ya es sin recursos, la usa | elegirFilaCatalogo | — | — | Aprobada |
| 140 | trae los niveles más bajos de cada hábito para «Bajar nivel» | alternativasDeNivel | — | — | Aprobada |
| 141 | un hábito de nivel 1 no tiene alternativas | alternativasDeNivel | — | — | Aprobada |
| 142 | el mensaje solo lleva claves y números, sin datos personales | textos de la IA | — | — | Aprobada |
| 143 | cambia solo títulos y descripciones; los números siguen siendo del motor | textos de la IA | — | — | Aprobada |

#### `mobile/src/zonas/planes/logica/__tests__/plan-format.test.ts`

- **Qué revisa:** Textos de la tarjeta de un plan.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 144 | muestra duración, días y hora | textos de la tarjeta del plan | — | — | Aprobada |
| 145 | con aviso flexible muestra la ventana | textos de la tarjeta del plan | — | — | Aprobada |
| 146 | un hábito sin duración dice «Sin duración fija» | textos de la tarjeta del plan | — | — | Aprobada |
| 147 | los 7 días se leen como «Todos los días» | textos de la tarjeta del plan | — | — | Aprobada |

#### `mobile/src/zonas/planes/logica/__tests__/plan-review.test.ts`

- **Qué revisa:** Revisión del plan antes de confirmarlo (UC-15).
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 17

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 148 | cambiar la hora deja el aviso fijo y no toca el resto | revisión del plan | — | — | Aprobada |
| 149 | bajar nivel usa la versión anterior y conserva la hora elegida | revisión del plan | — | — | Aprobada |
| 150 | en el nivel 1 no se puede bajar más | revisión del plan | — | — | Aprobada |
| 151 | se puede quitar un hábito, pero el plan conserva al menos uno | revisión del plan | — | — | Aprobada |
| 152 | el interruptor cambia el segundo aviso | revisión del plan | — | — | Aprobada |
| 153 | olvido + recordatorio_suave + manana → true | cuándo se muestra el interruptor «Segundo aviso» (SDD 5.6) | — | — | Aprobada |
| 154 | olvido + minimo + manana → true | cuándo se muestra el interruptor «Segundo aviso» (SDD 5.6) | — | — | Aprobada |
| 155 | olvido + resumen_nocturno + manana → false | cuándo se muestra el interruptor «Segundo aviso» (SDD 5.6) | — | — | Aprobada |
| 156 | olvido + recordatorio_suave + varia → false | cuándo se muestra el interruptor «Segundo aviso» (SDD 5.6) | — | — | Aprobada |
| 157 | motivacion + recordatorio_suave + manana → false | cuándo se muestra el interruptor «Segundo aviso» (SDD 5.6) | — | — | Aprobada |
| 158 | la nota de apoyo profesional solo aparece con «manejar_estres» |  | — | — | Aprobada |
| 159 | convierte entre la hora "HH:MM" y la fecha del selector |  | — | — | Aprobada |
| 160 | las sugerencias omiten los objetivos que ya están en el plan | agregar y editar hábitos en la revisión | — | — | Aprobada |
| 161 | pagina de 4 en 4 y vuelve al principio | agregar y editar hábitos en la revisión | — | — | Aprobada |
| 162 | agrega hasta 3 hábitos y no repite objetivos | agregar y editar hábitos en la revisión | — | — | Aprobada |
| 163 | si se pasa del tiempo diario, este sube a la suma del día más cargado | agregar y editar hábitos en la revisión | — | — | Aprobada |
| 164 | editar cambia nombre, días, hora y aviso; sin hora conserva la anterior | agregar y editar hábitos en la revisión | — | — | Aprobada |

#### `mobile/src/zonas/planes/logica/__tests__/plan-rows.test.ts`

- **Qué revisa:** Qué se guarda al confirmar un plan.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 8

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 165 | liga plan, hábitos y horarios con los ids del cliente | filas que se guardan al pulsar «Empezar» | — | — | Aprobada |
| 166 | guarda un plan por área, con sus objetivos y el historial | filas que se guardan al pulsar «Empezar» | — | — | Aprobada |
| 167 | un horario flexible se guarda sin hora | filas que se guardan al pulsar «Empezar» | — | — | Aprobada |
| 168 | sin permiso de avisos, los hábitos se guardan sin recordatorio | filas que se guardan al pulsar «Empezar» | — | — | Aprobada |
| 169 | guarda los ajustes y las respuestas con la versión del formulario | filas que se guardan al pulsar «Empezar» | — | — | Aprobada |
| 170 | guarda la secuencia de micro-pasos y en qué paso va cada hábito | filas que se guardan al pulsar «Empezar» | — | — | Aprobada |
| 171 | un hábito quitado en la revisión no se guarda | filas que se guardan al pulsar «Empezar» | — | — | Aprobada |
| 172 | fechaLocal usa la fecha del teléfono |  | — | — | Aprobada |

#### `mobile/src/zonas/planes/logica/__tests__/respuestas-plan.test.ts`

- **Qué revisa:** Respuestas que usa cada plan.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 2

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 173 | usa el área, los objetivos y el historial del plan, y lo global del usuario | respuestas de un plan | — | — | Aprobada |
| 174 | sin respuestas propias, filtra los objetivos globales por el área | respuestas de un plan | — | — | Aprobada |

#### `mobile/src/zonas/planes/logica/__tests__/sugerencias-plan.test.ts`

- **Qué revisa:** Sugerencias para agregar un hábito a un plan.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 2

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 175 | trae las 3 versiones de cada meta libre, primero las más ligeras | sugerencias para agregar un hábito al plan | — | — | Aprobada |
| 176 | no sugiere metas de otras áreas | sugerencias para agregar un hábito al plan | — | — | Aprobada |

#### `mobile/src/zonas/planes/logica/__tests__/tiempo-libre.test.ts`

- **Qué revisa:** Si un plan nuevo cabe en el tiempo libre del día.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 3

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 177 | cabe: no hay exceso | plan nuevo en el tiempo libre | — | — | Aprobada |
| 178 | se suma día por día y avisa lo que pasa el día más cargado | plan nuevo en el tiempo libre | — | — | Aprobada |
| 179 | sin hábitos todavía, solo cuenta el plan | plan nuevo en el tiempo libre | — | — | Aprobada |

#### `mobile/src/zonas/planes/presentacion/__tests__/PantallaCrearMeta.test.tsx`

- **Qué revisa:** Crear meta: lista ordenada de micro-pasos, meta vacía con tono neutro, sin perfil y primer hábito.
- **Tipo:** Pantalla · **Origen:** RF · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 180 | CP-01: descompone la meta en una lista ordenada y guarda la secuencia desde el paso 1 | PantallaCrearMeta | CP-01 | — | Aprobada |
| 181 | CP-02: con la meta vacía no pide micro-pasos, avisa con tono neutro y conserva lo capturado | PantallaCrearMeta | CP-02 | — | Aprobada |
| 182 | UC-01: sin el perfil de la encuesta no se generan micro-pasos y se invita a responderla | PantallaCrearMeta | UC-01 | — | Aprobada |
| 183 | UC-01 → UC-02: recién hecha la encuesta invita a su primer hábito y deja dejarlo para después | PantallaCrearMeta | UC-01, UC-02 | — | Aprobada |

#### `mobile/src/zonas/planes/presentacion/componentes/__tests__/ListaMicroPasos.test.tsx`

- **Qué revisa:** La lista de micro-pasos: orden, paso en curso y lectura con TalkBack.
- **Tipo:** Pantalla · **Origen:** RF · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 184 | muestra los pasos en orden y anuncia el estado de cada uno con texto | ListaMicroPasos | — | — | Aprobada |
| 185 | si el hábito va en versión ligera, el paso en curso muestra sus minutos reales | ListaMicroPasos | — | — | Aprobada |
| 186 | RF-16: el paso en curso muestra cuántas veces lleva de 10 | ListaMicroPasos | RF-16 | — | Aprobada |
| 187 | sin secuencia no muestra nada | ListaMicroPasos | — | — | Aprobada |

### 7.5 Hábitos (67 pruebas)

#### `mobile/src/zonas/habitos/logica/__tests__/borrador-habito.test.ts`

- **Qué revisa:** Si se sale a medio crear un hábito, se retoma.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 5

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 188 | se retoma el de la misma cuenta, con su paso y lo escrito | borrador del asistente de hábito | — | — | Aprobada |
| 189 | no hay borrador si no existe o es de otra cuenta | borrador del asistente de hábito | — | — | Aprobada |
| 190 | dura 7 días | borrador del asistente de hábito | — | — | Aprobada |
| 191 | una fecha de inicio pasada pasa a hoy y un fin anterior se quita | borrador del asistente de hábito | — | — | Aprobada |
| 192 | una fecha de inicio futura se respeta | borrador del asistente de hábito | — | — | Aprobada |

#### `mobile/src/zonas/habitos/logica/__tests__/esquema-habito.test.ts`

- **Qué revisa:** Validación del hábito: sin hora no se guarda, ajuste de días y minutos y candado mínimo.
- **Tipo:** Lógica · **Origen:** Heredada (ampliada) · **Pruebas:** 18

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 193 | limpia y convierte los valores | asistente de hábito | — | — | Aprobada |
| 194 | pide categoría y al menos un día | asistente de hábito | — | — | Aprobada |
| 195 | valida el largo del nombre | asistente de hábito | — | — | Aprobada |
| 196 | acepta la duración 0 (0 es «Sin duración fija») | asistente de hábito | — | — | Aprobada |
| 197 | acepta la duración 25 (0 es «Sin duración fija») | asistente de hábito | — | — | Aprobada |
| 198 | acepta la duración 1439 (0 es «Sin duración fija») | asistente de hábito | — | — | Aprobada |
| 199 | rechaza la duración -1 | asistente de hábito | — | — | Aprobada |
| 200 | rechaza la duración 1440 | asistente de hábito | — | — | Aprobada |
| 201 | rechaza la duración 1.5 | asistente de hábito | — | — | Aprobada |
| 202 | sin recordatorio no necesita hora; con aviso sí, salvo el flexible del plan | asistente de hábito | — | — | Aprobada |
| 203 | la fecha de fin no puede ser anterior a la de inicio | asistente de hábito | — | — | Aprobada |
| 204 | no se guarda, el error queda en el campo hora y el mensaje es claro y sin culpa | CP-05 (RF-01): recordatorio sin hora | CP-05, RF-01 | — | Aprobada |
| 205 | al crear, 30 para el nombre y 100 para la descripción | límites de texto (decisión del usuario: 30 y 100) | — | — | Aprobada |
| 206 | al editar, un texto más largo se respeta pero no crece | límites de texto (decisión del usuario: 30 y 100) | — | — | Aprobada |
| 207 | los mensajes dicen el límite | límites de texto (decisión del usuario: 30 y 100) | — | — | Aprobada |
| 208 | CP-14: 0 días y 0 minutos no se guardan y se explica el mínimo con tono compasivo | candado mínimo al ajustar (RR-03) | RR-03, CP-14 | — | Aprobada |
| 209 | CP-12: bajar de 20 a 10 min en lunes, miércoles y viernes sí se guarda | candado mínimo al ajustar (RR-03) | RR-03, CP-12 | — | Aprobada |
| 210 | al crear (sin mínimo) se puede elegir «Sin duración fija» | candado mínimo al ajustar (RR-03) | RR-03 | — | Aprobada |

#### `mobile/src/zonas/habitos/logica/__tests__/fechas.test.ts`

- **Qué revisa:** Fechas del asistente, textos de la tarjeta y valores iniciales. (descripción compartida con otros archivos del mismo tema)
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 211 | cuenta los días de cada mes, con febrero bisiesto | fechas del asistente | — | — | Aprobada |
| 212 | deduce el año: la próxima vez que ocurre a partir de la mínima | fechas del asistente | — | — | Aprobada |
| 213 | ajusta el día al último del mes si no existe | fechas del asistente | — | — | Aprobada |
| 214 | formatea y separa la fecha | fechas del asistente | — | — | Aprobada |

#### `mobile/src/zonas/habitos/logica/__tests__/formato.test.ts`

- **Qué revisa:** Fechas del asistente, textos de la tarjeta y valores iniciales. (descripción compartida con otros archivos del mismo tema)
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 5

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 215 | muestra días, hora corta y duración | texto de la tarjeta de un hábito | — | — | Aprobada |
| 216 | los 7 días y el aviso flexible | texto de la tarjeta de un hábito | — | — | Aprobada |
| 217 | sin duración definida, no la muestra | texto de la tarjeta de un hábito | — | — | Aprobada |
| 218 | minutos, horas y horas con minutos | texto de la duración | — | — | Aprobada |
| 219 | 0 es «Sin duración fija» | texto de la duración | — | — | Aprobada |

#### `mobile/src/zonas/habitos/logica/__tests__/habitos-del-dia.test.ts`

- **Qué revisa:** Qué hábitos tocan cada día (pausados y archivados no).
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 8

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 220 | incluye solo los programados para ese día de la semana | hábitos del día (Hoy) | — | — | Aprobada |
| 221 | omite pausados y archivados | hábitos del día (Hoy) | — | — | Aprobada |
| 222 | usa el horario vigente en la fecha | hábitos del día (Hoy) | — | — | Aprobada |
| 223 | no muestra hábitos cuyo horario empieza después | hábitos del día (Hoy) | — | — | Aprobada |
| 224 | marca como hecho solo con un registro vigente de esa fecha | hábitos del día (Hoy) | — | — | Aprobada |
| 225 | respeta las reprogramaciones: sale del día original y llega al nuevo | hábitos del día (Hoy) | — | — | Aprobada |
| 226 | ordena por hora y deja los flexibles al final | hábitos del día (Hoy) | — | — | Aprobada |
| 227 | usa el vigente, o el próximo si no empieza, o el último si terminó | horario de referencia (mostrar y editar) | — | — | Aprobada |

#### `mobile/src/zonas/habitos/logica/__tests__/horario.test.ts`

- **Qué revisa:** Cambiar un horario no altera las estadísticas pasadas.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 6

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 228 | sin cambios no hace nada (la hora de Postgres trae segundos) | editar horario (versionado, SDD 4) | — | — | Aprobada |
| 229 | si cambia el patrón de un hábito ya empezado, cierra ayer y crea otro desde hoy | editar horario (versionado, SDD 4) | — | — | Aprobada |
| 230 | cambiar solo la fecha de fin no crea otra versión | editar horario (versionado, SDD 4) | — | — | Aprobada |
| 231 | un hábito que todavía no empieza se edita en su lugar, incluida la fecha de inicio | editar horario (versionado, SDD 4) | — | — | Aprobada |
| 232 | la fecha de inicio de un hábito ya empezado no cambia | editar horario (versionado, SDD 4) | — | — | Aprobada |
| 233 | sin recordatorio: sin hora y sin aviso; un flexible con aviso sigue flexible | editar horario (versionado, SDD 4) | — | — | Aprobada |

#### `mobile/src/zonas/habitos/logica/__tests__/limite-habitos.test.ts`

- **Qué revisa:** Límite de 3 hábitos al empezar.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 234 | empieza con 3 | límite de hábitos del usuario guiado | — | — | Aprobada |
| 235 | suma 1 por cada subida de nivel del plan | límite de hábitos del usuario guiado | — | — | Aprobada |
| 236 | sin límite con el plan desbloqueado o en modo tradicional | límite de hábitos del usuario guiado | — | — | Aprobada |
| 237 | se alcanza al tener tantos activos como el límite | límite de hábitos del usuario guiado | — | — | Aprobada |

#### `mobile/src/zonas/habitos/logica/__tests__/presupuesto.test.ts`

- **Qué revisa:** Tiempo diario: suma de minutos y límites.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 9

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 238 | suma los minutos de cada día de la semana | presupuesto diario (SDD 6.5) | — | — | Aprobada |
| 239 | sin hábitos no hay minutos | presupuesto diario (SDD 6.5) | — | — | Aprobada |
| 240 | si un día supera el presupuesto, sube a la suma real | presupuesto diario (SDD 6.5) | — | — | Aprobada |
| 241 | igualar el presupuesto no lo excede | presupuesto diario (SDD 6.5) | — | — | Aprobada |
| 242 | es el tiempo diario entre los hábitos del plan | límite de duración de un hábito del plan | — | — | Aprobada |
| 243 | nunca baja de lo que el hábito ya tiene | límite de duración de un hábito del plan | — | — | Aprobada |
| 244 | sin hábitos contados, todo el tiempo diario | límite de duración de un hábito del plan | — | — | Aprobada |
| 245 | es de 8 h | límite del tiempo diario en Perfil | — | — | Aprobada |
| 246 | respeta un tiempo que ya subió por encima de 8 h | límite del tiempo diario en Perfil | — | — | Aprobada |

#### `mobile/src/zonas/habitos/logica/__tests__/valores-formulario.test.ts`

- **Qué revisa:** Fechas del asistente, textos de la tarjeta y valores iniciales. (descripción compartida con otros archivos del mismo tema)
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 1

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 247 | empieza sin duración fija (0), todos los días y sin recordatorio | valores de un hábito nuevo | — | — | Aprobada |

#### `mobile/src/zonas/habitos/presentacion/__tests__/PantallaVerHabito.test.tsx`

- **Qué revisa:** Vista previa del hábito sin botón de editar.
- **Tipo:** Pantalla · **Origen:** Corrección D-13 · **Pruebas:** 2

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 248 | muestra los datos y los micro-pasos, sin abrir la edición | PantallaVerHabito | — | — | Aprobada |
| 249 | si el hábito ya no existe lo dice sin error | PantallaVerHabito | — | — | Aprobada |

#### `mobile/src/zonas/habitos/presentacion/__tests__/use-check-in.test.tsx`

- **Qué revisa:** Al marcar un micro-paso: moneda «+10» en menos de 1.5 s y celebración de hitos.
- **Tipo:** Pantalla · **Origen:** RF · **Pruebas:** 3

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 250 | CP-07: la moneda «+10» aparece en menos de 1.5 s y se quita sola | check-in de un micro-paso | CP-07 | — | Aprobada |
| 251 | CP-09: celebra el 50 % a los 5 de 10 y el 80 % a los 8 de 10, sin reiniciar | check-in de un micro-paso | CP-09 | — | Aprobada |
| 252 | CP-09: la celebración muestra el hito y el indicador, con vibración y sonido | check-in de un micro-paso | CP-09 | — | Aprobada |

#### `mobile/src/zonas/habitos/presentacion/componentes/__tests__/DialogoAgregarHabito.test.tsx`

- **Qué revisa:** El «+» ofrece «Con micro-pasos» o «A mi manera».
- **Tipo:** Pantalla · **Origen:** Mejora de la revisión · **Pruebas:** 2

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 253 | explica las dos opciones y marca micro-pasos como recomendada | DialogoAgregarHabito | — | — | Aprobada |
| 254 | cada opción lleva a su camino y «Cancelar» cierra | DialogoAgregarHabito | — | — | Aprobada |

### 7.6 Recordatorios y agenda (M2) (61 pruebas)

#### `mobile/src/zonas/recordatorios/logica/__tests__/agenda-dia.test.ts`

- **Qué revisa:** «Mi agenda» por día: orden, ratos libres y cambiar solo un día.
- **Tipo:** Lógica · **Origen:** Corrección D-14 · **Pruebas:** 7

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 255 | lunes es 1 y domingo es 7 | diaIso | — | — | Aprobada |
| 256 | solo los de ese día y ordenados por hora, aunque se hayan creado en otro orden | bloquesDelDia | — | — | Aprobada |
| 257 | muestra lo ocupado y los ratos libres entre bloques, de 06:00 a 23:00 | franjasDelDia | — | — | Aprobada |
| 258 | un día sin bloques es un solo rato libre | franjasDelDia | — | — | Aprobada |
| 259 | bloques encimados no dejan un rato libre falso | franjasDelDia | — | — | Aprobada |
| 260 | en un bloque de lunes a viernes, cambiar el miércoles lo separa y deja los demás igual | cambioSoloUnDia | — | — | Aprobada |
| 261 | si el bloque solo ocurre ese día, simplemente se edita | cambioSoloUnDia | — | — | Aprobada |

#### `mobile/src/zonas/recordatorios/logica/__tests__/agenda.test.ts`

- **Qué revisa:** Un recordatorio en una franja ocupada se rechaza y se sugiere la siguiente hora libre.
- **Tipo:** Lógica · **Origen:** RF · **Pruebas:** 8

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 262 | CP-04: 10:00 en la franja 10:00–11:00 se rechaza y se sugiere 11:00 | agenda de bloques ocupados | CP-04 | — | Aprobada |
| 263 | no choca en otro día ni fuera del bloque | agenda de bloques ocupados | — | — | Aprobada |
| 264 | el hábito no puede empezar justo antes y meterse al bloque | agenda de bloques ocupados | — | — | Aprobada |
| 265 | salta bloques seguidos hasta la primera hora libre | agenda de bloques ocupados | — | — | Aprobada |
| 266 | si ya no cabe ese día no sugiere nada | agenda de bloques ocupados | — | — | Aprobada |
| 267 | valida nombre, días y que el fin sea después del inicio | agenda de bloques ocupados | — | — | Aprobada |
| 268 | encuentra el que quedó dentro del bloque y le sugiere la primera hora libre | D-04: al guardar un bloque se revisan los recordatorios que ya existían | D-04 | — | Aprobada |
| 269 | sin choques no hay nada que revisar | D-04: al guardar un bloque se revisan los recordatorios que ya existían | D-04 | — | Aprobada |

#### `mobile/src/zonas/recordatorios/logica/__tests__/aviso-motivacional.test.ts`

- **Qué revisa:** Aviso tras 3 días seguidos y máximo uno al día.
- **Tipo:** Lógica · **Origen:** RF · **Pruebas:** 3

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 270 | cuenta los días seguidos hasta hoy | aviso motivacional | — | — | Aprobada |
| 271 | CP-08: a los 3 días seguidos toca avisar | aviso motivacional | CP-08 | Sí | Aprobada |
| 272 | máximo un aviso al día | aviso motivacional | — | — | Aprobada |

#### `mobile/src/zonas/recordatorios/logica/__tests__/historial-plan.test.ts`

- **Qué revisa:** Apoyo extra en las semanas 3 y 4. (descripción compartida con otros archivos del mismo tema)
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 2

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 273 | cada plan usa su historial; si no tiene, el global | apoyo de las semanas 3 y 4 con varios planes | — | — | Aprobada |
| 274 | toca si algún plan está en su semana 3 o 4 | apoyo de las semanas 3 y 4 con varios planes | — | — | Aprobada |

#### `mobile/src/zonas/recordatorios/logica/__tests__/permiso.test.ts`

- **Qué revisa:** Permiso de avisos y de alarmas exactas.
- **Tipo:** Lógica · **Origen:** Heredada (ampliada, D-05) · **Pruebas:** 5

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 275 | con el permiso dado no hay nada que hacer | siguientePaso | — | — | Aprobada |
| 276 | sin permiso, se pregunta si Android lo deja | siguientePaso | — | — | Aprobada |
| 277 | si Android ya no deja preguntar, se manda a Ajustes | siguientePaso | — | — | Aprobada |
| 278 | en Android sin el permiso se explica una vez por sesión | alarmas exactas (RF-01: el aviso llega a su hora) | RF-01 | — | Aprobada |
| 279 | con el permiso, o en iOS, no se pregunta nada | alarmas exactas (RF-01: el aviso llega a su hora) | RF-01 | — | Aprobada |

#### `mobile/src/zonas/recordatorios/logica/__tests__/planificar-avisos.test.ts`

- **Qué revisa:** Qué avisos se programan y a qué hora: diario a las 10:00, resumen de las 21:00 y reajuste a L-M-V.
- **Tipo:** Lógica · **Origen:** Heredada (ampliada) · **Pruebas:** 29

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 280 | recordatorio suave: un aviso por día a la hora del hábito, más la invitación final | planificarAvisos | — | — | Aprobada |
| 281 | no programa avisos que ya pasaron | planificarAvisos | — | — | Aprobada |
| 282 | no avisa un hábito ya hecho hoy | planificarAvisos | — | — | Aprobada |
| 283 | sin recordatorio («Ninguno») no hay avisos ni invitación | planificarAvisos | — | — | Aprobada |
| 284 | estilo mínimo: solo avisan los hábitos con recordatorio | planificarAvisos | — | — | Aprobada |
| 285 | no avisa hábitos pausados ni archivados | planificarAvisos | — | — | Aprobada |
| 286 | segundo aviso: 2 h después, solo hoy y mañana | planificarAvisos | — | — | Aprobada |
| 287 | el segundo aviso no pasa a la madrugada siguiente | planificarAvisos | — | — | Aprobada |
| 288 | distracción: nunca más de un aviso por hábito al día | planificarAvisos | — | — | Aprobada |
| 289 | ánimo rotativo: el mensaje de un hábito cambia de un día al siguiente | planificarAvisos | — | — | Aprobada |
| 290 | distracción con ánimo: una sola línea corta | planificarAvisos | — | — | Aprobada |
| 291 | momento flexible: a la hora de «Tarde» y 3 h después, el segundo solo hoy y mañana | planificarAvisos | — | — | Aprobada |
| 292 | momento flexible sigue la hora de «Tarde» de Perfil | planificarAvisos | — | — | Aprobada |
| 293 | momento flexible con distracción: solo el primer aviso | planificarAvisos | — | — | Aprobada |
| 294 | resumen nocturno: a las 21:00 con los hábitos de mañana | planificarAvisos | — | — | Aprobada |
| 295 | RF-18: el interruptor suma el resumen a los avisos por hábito | planificarAvisos | RF-18 | — | Aprobada |
| 296 | RF-18: sin el interruptor, el recordatorio suave no manda resumen | planificarAvisos | RF-18 | — | Aprobada |
| 297 | CP-03: «Tomar agua» a las 10:00 diario avisa a las 10:00 cada uno de los 7 días | planificarAvisos | CP-03 | Sí | Aprobada |
| 298 | CP-12: al ajustar a lunes, miércoles y viernes de 10 min, los avisos se acomodan solos | planificarAvisos | CP-12 | — | Aprobada |
| 299 | CP-06: el resumen de las 21:00 nombra los hábitos de mañana | planificarAvisos | CP-06 | Sí | Aprobada |
| 300 | resumen nocturno con un solo hábito | planificarAvisos | — | — | Aprobada |
| 301 | olvido con resumen: un aviso al día a la hora del momento | planificarAvisos | — | — | Aprobada |
| 302 | olvido con resumen y horario variable: a la hora de «Tarde» | planificarAvisos | — | — | Aprobada |
| 303 | una ocurrencia movida avisa en su nueva fecha y no en la original | planificarAvisos | — | — | Aprobada |
| 304 | tope de 60: se recortan los días más lejanos y la invitación cuenta | planificarAvisos | — | — | Aprobada |
| 305 | apoyo de la semana 3: el lunes, a la hora del momento | planificarAvisos | — | — | Aprobada |
| 306 | sin apoyo con el estilo mínimo | planificarAvisos | — | — | Aprobada |
| 307 | sin duración definida, los textos no mencionan minutos | planificarAvisos | — | — | Aprobada |
| 308 | una duración de más de una hora se escribe en horas | planificarAvisos | — | — | Aprobada |

#### `mobile/src/zonas/recordatorios/logica/__tests__/semana-apoyo.test.ts`

- **Qué revisa:** Apoyo extra en las semanas 3 y 4. (descripción compartida con otros archivos del mismo tema)
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 3

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 309 | cuenta las semanas desde que se creó el plan | semanaDeApoyo | — | — | Aprobada |
| 310 | solo aplica a quien suele soltar el hábito a las pocas semanas | semanaDeApoyo | — | — | Aprobada |
| 311 | sin plan no hay apoyo | semanaDeApoyo | — | — | Aprobada |

#### `mobile/src/zonas/recordatorios/presentacion/__tests__/PantallaAgenda.test.tsx`

- **Qué revisa:** Al guardar un bloque, avisa del recordatorio que quedó adentro y lo mueve.
- **Tipo:** Pantalla · **Origen:** Corrección D-04 · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 312 | avisa del recordatorio que quedó dentro del bloque nuevo y lo mueve a las 11:00 | PantallaAgenda (D-04) | D-04 | — | Aprobada |
| 313 | «Dejarlo así» no cambia el recordatorio | PantallaAgenda (D-04) | D-04 | — | Aprobada |
| 314 | vista por día: el miércoles muestra la clase y los ratos libres; cambiar solo ese día | PantallaAgenda (D-04) | D-04 | — | Aprobada |
| 315 | en un día sin bloques dice que está libre | PantallaAgenda (D-04) | D-04 | — | Aprobada |

### 7.7 Reajuste e introspección (M4) (66 pruebas)

#### `mobile/src/zonas/reajuste/logica/__tests__/barreras.test.ts`

- **Qué revisa:** Lista de barreras: máximo 3 opciones; con «falta de tiempo», la versión ligera va primero.
- **Tipo:** Lógica · **Origen:** RF · **Pruebas:** 5

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 316 | pregunta con máximo 3 opciones | lista de barreras | — | — | Aprobada |
| 317 | CP-13: con falta de tiempo, la versión ligera va primero | lista de barreras | CP-13 | — | Aprobada |
| 318 | si faltó algo o no se pudo llegar, otro día va primero | lista de barreras | — | — | Aprobada |
| 319 | sin día libre ni versión más ligera no ofrece nada (queda «Dejarlo así») | lista de barreras | — | — | Aprobada |
| 320 | mover lleva el primer día libre | lista de barreras | — | — | Aprobada |

#### `mobile/src/zonas/reajuste/logica/__tests__/introspeccion.test.ts`

- **Qué revisa:** 1 a 3 preguntas de valores, escala 1–5, sin palabras clínicas.
- **Tipo:** Lógica · **Origen:** RF · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 321 | RF-04: de 1 a 3 preguntas, cada una con su texto | introspección por valores | RF-04 | — | Aprobada |
| 322 | CP-10: la escala va de 1 a 5 | introspección por valores | CP-10 | — | Aprobada |
| 323 | nunca usa palabras clínicas ni de diagnóstico | introspección por valores | — | — | Aprobada |
| 324 | la semanal toca a los 7 días de la última o del primer uso | introspección por valores | — | — | Aprobada |

#### `mobile/src/zonas/reajuste/logica/__tests__/meta-intermedia.test.tsx`

- **Qué revisa:** Aplicar la meta intermedia no borra el historial.
- **Tipo:** Lógica · **Origen:** RF · **Pruebas:** 1

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 325 | al aplicarla solo cambia el hábito; el historial no se toca | CP-11: meta intermedia | CP-11 | — | Aprobada |

#### `mobile/src/zonas/reajuste/logica/__tests__/progresion.test.ts`

- **Qué revisa:** Cuándo subir o bajar un paso; con menos del 40 % en 7 días propone una meta intermedia; candado mínimo.
- **Tipo:** Lógica · **Origen:** Heredada (ampliada) · **Pruebas:** 32

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 326 | cada 7 días desde la última revisión o desde el inicio del plan | cuándo se revisa | — | — | Aprobada |
| 327 | últimos 14 días hasta ayer; hoy no cuenta | ventana de cumplimiento | — | — | Aprobada |
| 328 | con 1 o 2 días por semana usa 28 días | ventana de cumplimiento | — | — | Aprobada |
| 329 | solo cuenta desde el último cambio de nivel | ventana de cumplimiento | — | — | Aprobada |
| 330 | con menos de 4 ocurrencias no se evalúa | ventana de cumplimiento | — | — | Aprobada |
| 331 | 90 %: sube un nivel | tabla de 6.3 | — | — | Aprobada |
| 332 | 85 % justo sube; 84 % se mantiene | tabla de 6.3 | — | — | Aprobada |
| 333 | RF-15 (CP-11): 2 de 7 días (28 %) propone una meta intermedia | tabla de 6.3 | RF-15, CP-11 | — | Aprobada |
| 334 | RF-15: se mira solo la última semana, con el umbral de 40 % | tabla de 6.3 | RF-15 | — | Aprobada |
| 335 | en el nivel 1 baja a la versión corta; si ya la usa, solo apoyo | tabla de 6.3 | — | — | Aprobada |
| 336 | «Hacerlo más ligero» usa el mismo paso hacia abajo: nivel anterior, versión corta o nada | tabla de 6.3 | — | — | Aprobada |
| 337 | un hábito sin duración en el nivel 1 no tiene versión corta: solo apoyo | tabla de 6.3 | — | — | Aprobada |
| 338 | desde la versión corta, primero vuelve a la normal; con poco_tiempo sube de nivel | tabla de 6.3 | — | — | Aprobada |
| 339 | en el nivel 3 propone un hábito nuevo de tus áreas | hábito nuevo y presupuesto | — | — | Aprobada |
| 340 | con un plan por área, solo revisa los hábitos de ese plan | hábito nuevo y presupuesto | — | — | Aprobada |
| 341 | con un plan por área, el hábito nuevo solo se busca en esa área | hábito nuevo y presupuesto | — | — | Aprobada |
| 342 | si el siguiente nivel no cabe, propone un hábito nuevo; si tampoco cabe, «sin espacio» | hábito nuevo y presupuesto | — | — | Aprobada |
| 343 | no repite un objetivo que ya está en el plan | hábito nuevo y presupuesto | — | — | Aprobada |
| 344 | una sola propuesta de hábito nuevo por revisión | hábito nuevo y presupuesto | — | — | Aprobada |
| 345 | con el límite total de hábitos alcanzado no propone otro, salvo con una subida más | hábito nuevo y presupuesto | — | — | Aprobada |
| 346 | con 4 hábitos del plan no propone otro, salvo con el límite desbloqueado | hábito nuevo y presupuesto | — | — | Aprobada |
| 347 | los hábitos manuales nunca suben ni bajan | hábito nuevo y presupuesto | — | — | Aprobada |
| 348 | los pausados y archivados no se revisan | hábito nuevo y presupuesto | — | — | Aprobada |
| 349 | a los 90 días del plan con 85 % o más en los últimos 28 días | desbloqueo del límite | — | — | Aprobada |
| 350 | subir va al siguiente micro-paso sin cambiar el nivel del plan | micro-pasos (RF-03) | RF-03 | — | Aprobada |
| 351 | la meta intermedia es el micro-paso anterior | micro-pasos (RF-03) | RF-03 | — | Aprobada |
| 352 | en el primer paso propone la versión reducida, con sus minutos en el título | micro-pasos (RF-03) | RF-03 | — | Aprobada |
| 353 | en el último paso no hay a dónde subir | micro-pasos (RF-03) | RF-03 | — | Aprobada |
| 354 | sin paso más ligero en la secuencia, ofrece pedírselo a la IA (modelo pequeño) | micro-pasos (RF-03) | RF-03 | — | Aprobada |
| 355 | candado mínimo: un paso de 1 minuto no tiene versión más corta, solo apoyo | micro-pasos (RF-03) | RF-03 | — | Aprobada |
| 356 | ningún reajuste deja menos de 2 minutos ni menos de 1 día (decisión del 24-nov) | candado mínimo (RR-03) | RR-03 | — | Aprobada |
| 357 | un recordatorio (0 min) sigue sin duración | candado mínimo (RR-03) | RR-03 | — | Aprobada |

#### `mobile/src/zonas/reajuste/logica/__tests__/reprogramar.test.ts`

- **Qué revisa:** Mover un día no hecho a otro día, sin contarlo como fallo. (descripción compartida con otros archivos del mismo tema)
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 15

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 358 | ofrece el día más reciente sin hacer y guarda los anteriores | qué se ofrece reprogramar (SDD 6.2) | — | — | Aprobada |
| 359 | no cuenta los días hechos | qué se ofrece reprogramar (SDD 6.2) | — | — | Aprobada |
| 360 | no vuelve a ofrecer días que ya tienen ocurrencia | qué se ofrece reprogramar (SDD 6.2) | — | — | Aprobada |
| 361 | un hábito que llegó movido y no se hizo no se vuelve a mover | qué se ofrece reprogramar (SDD 6.2) | — | — | Aprobada |
| 362 | omite en silencio los hábitos de los 7 días | qué se ofrece reprogramar (SDD 6.2) | — | — | Aprobada |
| 363 | no cuenta hoy ni los días antes de que empiece el hábito | qué se ofrece reprogramar (SDD 6.2) | — | — | Aprobada |
| 364 | no ofrece hábitos pausados | qué se ofrece reprogramar (SDD 6.2) | — | — | Aprobada |
| 365 | son los días fuera del patrón, de hoy a 7 días adelante | días libres | — | — | Aprobada |
| 366 | respeta la fecha de fin del hábito | días libres | — | — | Aprobada |
| 367 | salta los días a los que ya llega otra ocurrencia del mismo hábito | días libres | — | — | Aprobada |
| 368 | no pasa del tiempo diario | días libres | — | — | Aprobada |
| 369 | un hábito sin duración fija siempre cabe | días libres | — | — | Aprobada |
| 370 | propone el primer día libre | propuestas | — | — | Aprobada |
| 371 | cuenta las propuestas anteriores para no pasar del tiempo diario | propuestas | — | — | Aprobada |
| 372 | sin días libres, la propuesta queda sin día | propuestas | — | — | Aprobada |

#### `mobile/src/zonas/reajuste/logica/__tests__/texto-dia.test.ts`

- **Qué revisa:** Mover un día no hecho a otro día, sin contarlo como fallo. (descripción compartida con otros archivos del mismo tema)
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 373 | en la tarjeta: a hoy, a mañana o al día con su número | nombre del día destino | — | — | Aprobada |
| 374 | en el aviso de éxito: para hoy, para mañana o para el día con su número | nombre del día destino | — | — | Aprobada |
| 375 | en el selector: Hoy, Mañana o el día corto | nombre del día destino | — | — | Aprobada |
| 376 | en la lista de barreras: ayer o el día con su número | nombre del día destino | — | — | Aprobada |

#### `mobile/src/zonas/reajuste/presentacion/__tests__/meta-intermedia-tarjeta.test.tsx`

- **Qué revisa:** La meta intermedia se aplica en un toque, sin mensajes de fracaso.
- **Tipo:** Pantalla · **Origen:** RF · **Pruebas:** 1

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 377 | se ofrece sin mensajes de fracaso y se aplica con un solo toque | CP-11: tarjeta de la meta intermedia | CP-11 | — | Aprobada |

#### `mobile/src/zonas/reajuste/presentacion/componentes/__tests__/DialogoIntrospeccion.test.tsx`

- **Qué revisa:** Responder con la escala, saltar una pregunta y guardar.
- **Tipo:** Pantalla · **Origen:** RF · **Pruebas:** 2

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 378 | CP-10: responde con la escala 1–5, salta una y guarda al terminar | DialogoIntrospeccion | CP-10 | — | Aprobada |
| 379 | al pausar empieza recordando que pausar también es cuidarse | DialogoIntrospeccion | — | — | Aprobada |

#### `mobile/src/zonas/reajuste/presentacion/componentes/__tests__/TarjetaBarreras.test.tsx`

- **Qué revisa:** La alternativa se aplica en un toque y sin palabras de culpa.
- **Tipo:** Pantalla · **Origen:** RF · **Pruebas:** 2

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 380 | pregunta qué se atravesó con 3 opciones y deja no decirlo | TarjetaBarreras | — | — | Aprobada |
| 381 | CP-13: con falta de tiempo ofrece la versión ligera en un toque | TarjetaBarreras | CP-13 | — | Aprobada |

### 7.8 Plantas y recompensas (M3) (45 pruebas)

#### `mobile/src/zonas/plantas/logica/__tests__/equipar.test.ts`

- **Qué revisa:** Tienda y accesorios: comprar y equipar. (descripción compartida con otros archivos del mismo tema)
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 12

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 382 | ponerlo en una planta quita el otro del mismo tipo, no los de otro tipo | equipar accesorios (SDD 6.4) | — | — | Aprobada |
| 383 | el mismo objeto puede ir en otra planta sin dejar la primera | equipar accesorios (SDD 6.4) | — | — | Aprobada |
| 384 | reemplaza solo en esa planta: el otro sigue en las demás | equipar accesorios (SDD 6.4) | — | — | Aprobada |
| 385 | quitarlo de una planta no lo quita de las otras | equipar accesorios (SDD 6.4) | — | — | Aprobada |
| 386 | sin cambios si ya está (o ya no está) en esa planta | equipar accesorios (SDD 6.4) | — | — | Aprobada |
| 387 | usa la planta de origen, aunque ya lleve ese tipo y no tenga hábitos | planta para «Equipar ahora» (SDD 9.4) | — | — | Aprobada |
| 388 | sin origen, prefiere la primera con hábitos y ese tipo libre | planta para «Equipar ahora» (SDD 9.4) | — | — | Aprobada |
| 389 | si todas las que tienen hábitos llevan ese tipo, usa la primera con hábitos | planta para «Equipar ahora» (SDD 9.4) | — | — | Aprobada |
| 390 | sin hábitos, usa la primera con ese tipo libre | planta para «Equipar ahora» (SDD 9.4) | — | — | Aprobada |
| 391 | si ninguna tiene hábitos ni el tipo libre, usa la primera | planta para «Equipar ahora» (SDD 9.4) | — | — | Aprobada |
| 392 | salta las plantas que ya llevan ese objeto; si todas lo llevan, elige entre todas | planta para «Equipar ahora» (SDD 9.4) | — | — | Aprobada |
| 393 | un origen que ya no existe se ignora, y sin plantas devuelve null | planta para «Equipar ahora» (SDD 9.4) | — | — | Aprobada |

#### `mobile/src/zonas/plantas/logica/__tests__/estado-objeto.test.ts`

- **Qué revisa:** Tienda y accesorios: comprar y equipar. (descripción compartida con otros archivos del mismo tema)
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 6

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 394 | con saldo suficiente es comprable y dice cuánto queda | estado de un objeto en la Tienda (SDD 6.4) | — | — | Aprobada |
| 395 | con el saldo exacto también se puede comprar | estado de un objeto en la Tienda (SDD 6.4) | — | — | Aprobada |
| 396 | sin saldo suficiente dice cuánto falta | estado de un objeto en la Tienda (SDD 6.4) | — | — | Aprobada |
| 397 | lo que ya es tuyo no se vuelve a ofrecer, tengas o no saldo | estado de un objeto en la Tienda (SDD 6.4) | — | — | Aprobada |
| 398 | distingue la actual, las alcanzadas y las bloqueadas | estado de una fase en Detalles (SDD 9.4) | — | — | Aprobada |
| 399 | una fase vuelve a bloquearse si la planta regresa de fase | estado de una fase en Detalles (SDD 9.4) | — | — | Aprobada |

#### `mobile/src/zonas/plantas/logica/__tests__/hitos.test.ts`

- **Qué revisa:** Hitos del 50 % (5 de 10) y del 80 % (8 de 10).
- **Tipo:** Lógica · **Origen:** RF · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 400 | CP-09: a los 5 de 10 es el hito del 50 % y a los 8 de 10 el del 80 % | hitos del micro-paso | CP-09 | — | Aprobada |
| 401 | entre hitos no hay refuerzo | hitos del micro-paso | — | — | Aprobada |
| 402 | si se cruzan dos de golpe, se celebra el más alto | hitos del micro-paso | — | — | Aprobada |
| 403 | el avance no pasa de la meta | hitos del micro-paso | — | — | Aprobada |

#### `mobile/src/zonas/plantas/logica/__tests__/planta-destacada.test.ts`

- **Qué revisa:** Qué planta sale en Hoy, incluida la que elige la persona.
- **Tipo:** Lógica · **Origen:** Heredada (ampliada) · **Pruebas:** 5

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 404 | elige la de fase más alta, aunque no tenga hábitos | planta destacada de Hoy (SDD 9.4) | — | — | Aprobada |
| 405 | en un empate prefiere una con hábitos | planta destacada de Hoy (SDD 9.4) | — | — | Aprobada |
| 406 | si el empate sigue, usa la primera según el orden de las áreas | planta destacada de Hoy (SDD 9.4) | — | — | Aprobada |
| 407 | sin plantas devuelve null | planta destacada de Hoy (SDD 9.4) | — | — | Aprobada |
| 408 | la que eligió en el Jardín gana aunque otra esté más avanzada | planta destacada de Hoy (SDD 9.4) | — | — | Aprobada |

#### `mobile/src/zonas/plantas/logica/__tests__/recompensas.test.ts`

- **Qué revisa:** XP, fases de la planta y monedas al completar; queda registrado.
- **Tipo:** Lógica · **Origen:** Heredada (ampliada) · **Pruebas:** 18

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 409 | 4 XP por nivel, fase 2 desde el 15 y fase 3 en el 30 | nivel y fase (SDD 6.1) | — | — | Aprobada |
| 410 | el XP no baja de 0 | nivel y fase (SDD 6.1) | — | — | Aprobada |
| 411 | el primero da XP y monedas | completar | — | — | Aprobada |
| 412 | un segundo hábito de la misma planta da monedas pero no XP | completar | — | — | Aprobada |
| 413 | el XP de otra planta no cuenta para el tope | completar | — | — | Aprobada |
| 414 | el sexto del día ya no da monedas | completar | — | — | Aprobada |
| 415 | en nivel 30 no suma XP y avisa el cambio de fase al llegar | completar | — | — | Aprobada |
| 416 | «Abrir el libro» da XP a la planta y monedas al instante, y queda registrado en el log | CP-07 (RF-08): recompensa al completar un micro-paso | CP-07, RF-08 | — | Aprobada |
| 417 | revierte y transfiere XP y monedas al que se quedó sin ellos | deshacer | — | — | Aprobada |
| 418 | si ya se gastaron las monedas, el saldo queda en 0 | deshacer | — | — | Aprobada |
| 419 | deshacer el hábito que cambió la fase la regresa | deshacer | — | — | Aprobada |
| 420 | sin registro activo no cambia nada | deshacer | — | — | Aprobada |
| 421 | el ciclo marcar, gastar, desmarcar y volver a marcar paga solo una vez | protección de monedas (SDD 6.1) | — | — | Aprobada |
| 422 | desmarcar con saldo devuelve todo y volver a marcar paga igual | protección de monedas (SDD 6.1) | — | — | Aprobada |
| 423 | sin devolución completa no se transfiere a otro registro | protección de monedas (SDD 6.1) | — | — | Aprobada |
| 424 | el tope cuenta los pagos no devueltos | protección de monedas (SDD 6.1) | — | — | Aprobada |
| 425 | eliminar devuelve lo que alcance y el pago sigue contando | protección de monedas (SDD 6.1) | — | — | Aprobada |
| 426 | eliminar un hábito sin marcar no cambia nada | protección de monedas (SDD 6.1) | — | — | Aprobada |

### 7.9 Progreso (47 pruebas)

#### `mobile/src/zonas/progreso/logica/__tests__/cumplimiento.test.ts`

- **Qué revisa:** Cómo se cuenta el cumplimiento; los días en pausa no cuentan como fallo.
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 22

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 427 | cuenta los días del patrón desde el inicio, con hecho o no hecho | ocurrencias para estadísticas | — | — | Aprobada |
| 428 | hoy solo suma si ya se hizo | ocurrencias para estadísticas | — | — | Aprobada |
| 429 | una movida cuenta en su fecha nueva y no en la original; una descartada cuenta como no hecha | ocurrencias para estadísticas | — | — | Aprobada |
| 430 | RF-17: una descartada con barrera no cuenta (no queda como fallo) | ocurrencias para estadísticas | RF-17 | — | Aprobada |
| 431 | un archivado cuenta hasta el día anterior a archivarlo | ocurrencias para estadísticas | — | — | Aprobada |
| 432 | uno en pausa cuenta hasta su último registro | ocurrencias para estadísticas | — | — | Aprobada |
| 433 | RF-09: los días en pausa no cuentan como fallo, ni después de reanudar | ocurrencias para estadísticas | RF-09 | — | Aprobada |
| 434 | RF-09: con la pausa abierta, desde que empezó ya nada cuenta | ocurrencias para estadísticas | RF-09 | — | Aprobada |
| 435 | RF-09: pausar y reanudar el mismo día deja una pausa vacía | ocurrencias para estadísticas | RF-09 | — | Aprobada |
| 436 | un registro deshecho no cuenta como hecho | ocurrencias para estadísticas | — | — | Aprobada |
| 437 | sin horarios no hay historial | ocurrencias para estadísticas | — | — | Aprobada |
| 438 | cuenta el total y cada día de la semana | resumen del periodo | — | — | Aprobada |
| 439 | agrupa los hábitos por área, en el orden de las áreas | resumen del periodo | — | — | Aprobada |
| 440 | cada hábito trae su conteo del periodo y su racha de todo el historial | resumen del periodo | — | — | Aprobada |
| 441 | sin filtro ofrece las áreas con hábitos y no filtra | resumen del periodo | — | — | Aprobada |
| 442 | con un área, el conteo y las secciones son solo de esa área | resumen del periodo | — | — | Aprobada |
| 443 | un área sin hábitos en el periodo se ignora y se muestra todo | resumen del periodo | — | — | Aprobada |
| 444 | un archivado sin días en el periodo no se lista; con días, sí | resumen del periodo | — | — | Aprobada |
| 445 | pasado hecho o sin marcar, hoy pendiente y futuro «te toca»; la movida lleva su marca | estados por día | — | — | Aprobada |
| 446 | uno en pausa solo tiene días hasta su último registro | estados por día | — | — | Aprobada |
| 447 | el rango no empieza antes del primer horario | estados por día | — | — | Aprobada |
| 448 | lo de un día, con su área y su estado | estados por día | — | — | Aprobada |

#### `mobile/src/zonas/progreso/logica/__tests__/periodos.test.ts`

- **Qué revisa:** Semana, mes y año en Progreso, y sus textos. (descripción compartida con otros archivos del mismo tema)
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 10

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 449 | la semana va de lunes a domingo y se parte en días | periodos de Progreso | — | — | Aprobada |
| 450 | la semana anterior cruza de mes y de año sin desfasarse | periodos de Progreso | — | — | Aprobada |
| 451 | el mes se parte en semanas recortadas a sus límites | periodos de Progreso | — | — | Aprobada |
| 452 | los meses anteriores cambian de año | periodos de Progreso | — | — | Aprobada |
| 453 | el año se parte en 12 meses | periodos de Progreso | — | — | Aprobada |
| 454 | se puede ir atrás hasta el primer horario y adelante hasta el actual | periodos de Progreso | — | — | Aprobada |
| 455 | la tira va por semanas de lunes a domingo, del primer horario a la de hoy + 7 | tira de días y calendario | — | — | Aprobada |
| 456 | cruza de mes y de año, con un año atrás como máximo | tira de días y calendario | — | — | Aprobada |
| 457 | al cambiar de semana se queda el mismo día de la semana | tira de días y calendario | — | — | Aprobada |
| 458 | el calendario del mes va de lunes a domingo con huecos | tira de días y calendario | — | — | Aprobada |

#### `mobile/src/zonas/progreso/logica/__tests__/rachas.test.ts`

- **Qué revisa:** Avance acumulado sin rachas que se borren.
- **Tipo:** Lógica · **Origen:** RF · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 459 | cuenta todas las veces completadas; un día sin hacerlo no resta | avance acumulado por hábito | — | — | Aprobada |
| 460 | nunca vuelve a 0: fallar al final no borra lo logrado | avance acumulado por hábito | — | — | Aprobada |
| 461 | el texto es igual para todos y no menciona rachas rotas | avance acumulado por hábito | — | — | Aprobada |
| 462 | la píldora muestra el total; sin ninguna, no hay píldora | avance acumulado por hábito | — | — | Aprobada |

#### `mobile/src/zonas/progreso/logica/__tests__/texto-periodo.test.ts`

- **Qué revisa:** Semana, mes y año en Progreso, y sus textos. (descripción compartida con otros archivos del mismo tema)
- **Tipo:** Lógica · **Origen:** Heredada · **Pruebas:** 11

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 463 | semana, mes y año | nombres de los periodos | — | — | Aprobada |
| 464 | las etiquetas de la semana marcan hoy y los días futuros | nombres de los periodos | — | — | Aprobada |
| 465 | las del mes son rangos de días; las del año, meses | nombres de los periodos | — | — | Aprobada |
| 466 | cuenta lo hecho, sin porcentajes, y cambia el tiempo en periodos pasados | resumen en texto | — | — | Aprobada |
| 467 | sin nada que contar, un texto amable | resumen en texto | — | — | Aprobada |
| 468 | el detalle para TalkBack nombra cada división | resumen en texto | — | — | Aprobada |
| 469 | fichas: «Hoy» y el día corto | textos de Diario | — | — | Aprobada |
| 470 | frases de hoy, de un día pasado y de uno futuro | textos de Diario | — | — | Aprobada |
| 471 | encabezados de la semana con letra y número | textos de Diario | — | — | Aprobada |
| 472 | una semana en un mes o entre dos | rango de la tira | — | — | Aprobada |
| 473 | una semana de un solo día dice el día, no «1–1» | rango de la tira | — | — | Aprobada |

### 7.10 Modo enfoque (M5) (9 pruebas)

#### `mobile/src/zonas/enfoque/logica/__tests__/enfoque.test.ts`

- **Qué revisa:** Durante la sesión la app no emite sus avisos; al terminar vuelven.
- **Tipo:** Lógica · **Origen:** RF · **Pruebas:** 4

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 474 | ofrece sesiones de 15, 25 y 45 minutos | modo enfoque | — | — | Aprobada |
| 475 | la sesión dura lo elegido y luego termina sola | modo enfoque | — | — | Aprobada |
| 476 | CP-15/16: durante la sesión no queda ningún aviso propio; después sí | modo enfoque | CP-15/16 | Sí | Aprobada |
| 477 | el contador muestra mm:ss y no baja de 00:00 | modo enfoque | — | — | Aprobada |

#### `mobile/src/zonas/enfoque/logica/__tests__/no-molestar.test.ts`

- **Qué revisa:** Android con permiso entra y sale de No Molestar; sin permiso o en iOS no se toca nada.
- **Tipo:** Lógica · **Origen:** Corrección D-03 · **Pruebas:** 5

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 478 | CP-15: Android con permiso pasa a No Molestar y al terminar vuelve al estado previo | No Molestar del modo enfoque | CP-15 | — | Aprobada |
| 479 | CP-15: si ya tenía un filtro propio, al terminar regresa a ese mismo | No Molestar del modo enfoque | CP-15 | — | Aprobada |
| 480 | CP-16: Android sin permiso no cambia nada y pide guiar a darlo | No Molestar del modo enfoque | CP-16 | Sí | Aprobada |
| 481 | CP-16: en iOS nunca se intenta, aunque hubiera un control | No Molestar del modo enfoque | CP-16 | Sí | Aprobada |
| 482 | sin el módulo nativo (Expo Go) solo queda la guía manual | No Molestar del modo enfoque | — | — | Aprobada |

### 7.11 Backend (33 pruebas)

#### `backend/src/auth/contrasena.spec.ts`

- **Qué revisa:** Las contraseñas se guardan con hash, nunca en claro.
- **Tipo:** Backend · **Origen:** RF · **Pruebas:** 3

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 483 | acepta la contraseña correcta y rechaza otra | contrasena | — | — | Aprobada |
| 484 | no guarda la contraseña y usa una sal distinta cada vez | contrasena | — | — | Aprobada |
| 485 | rechaza un hash con formato desconocido | contrasena | — | — | Aprobada |

#### `backend/src/baseDatos/tiposPostgres.spec.ts`

- **Qué revisa:** Conversión de fechas y horas de la base.
- **Tipo:** Backend · **Origen:** RF · **Pruebas:** 2

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 486 | conserva los microsegundos y completa la zona | convertirMarcaTiempo | — | — | Aprobada |
| 487 | respeta zonas con minutos | convertirMarcaTiempo | — | — | Aprobada |

#### `backend/src/ia/combinarPlan.spec.ts`

- **Qué revisa:** Unir el hábito del motor con los micro-pasos de la IA.
- **Tipo:** Backend · **Origen:** RF · **Pruebas:** 3

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 488 | con micro-pasos de la IA, el hábito toma el paso actual y conserva hora y aviso | combinarConMicroPasos | — | — | Aprobada |
| 489 | con el catálogo conserva los textos del motor y solo agrega la secuencia | combinarConMicroPasos | — | — | Aprobada |
| 490 | una descripción vacía queda como null, igual que en el catálogo | combinarConMicroPasos | — | — | Aprobada |

#### `backend/src/ia/reglasMicroPasos.spec.ts`

- **Qué revisa:** Reglas que la IA no puede romper: 3 a 5 pasos, el primero ≤ 5 min, cada uno ≤ triple del anterior, mínimo 2 min y solo días libres.
- **Tipo:** Backend · **Origen:** RF · **Pruebas:** 16

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 491 | deja igual un hábito que ya cumple las reglas | corregirHabito | — | — | Aprobada |
| 492 | corrige minutos: primer paso de 5 o menos, triple como máximo y sin pasar el tope | corregirHabito | — | — | Aprobada |
| 493 | respeta el candado mínimo en la versión reducida | corregirHabito | — | — | Aprobada |
| 494 | un paso de 1 minuto sube al candado mínimo de 2 min (RR-03) | corregirHabito | RR-03 | — | Aprobada |
| 495 | si recorta los minutos, el título dice los minutos reales | corregirHabito | — | — | Aprobada |
| 496 | con poco tiempo diario, nada pasa de ese tope | corregirHabito | — | — | Aprobada |
| 497 | un recordatorio (0 min) se queda sin duración en todos los pasos | corregirHabito | — | — | Aprobada |
| 498 | se queda con 5 pasos como máximo y ajusta el paso inicial | corregirHabito | — | — | Aprobada |
| 499 | rechaza menos de 3 pasos, pasos sin días válidos o sin título | corregirHabito | — | — | Aprobada |
| 500 | queda en 3 a 5 pasos ordenados, el primero de 5 min o menos y cada uno ≤ triple del anterior | CP-01 (RF-03): «Leer 20 minutos al día» | CP-01, RF-03 | — | Aprobada |
| 501 | quita los días sin rato libre que proponga la IA | días permitidos por la P5 (ratos libres) | — | — | Aprobada |
| 502 | si ningún día propuesto está libre, usa los permitidos | días permitidos por la P5 (ratos libres) | — | — | Aprobada |
| 503 | quita repetidos e inválidos y ordena | limpiarDias | — | — | Aprobada |
| 504 | siempre más corto que el actual y nunca menos de 2 min (RR-03) | paso más ligero (meta intermedia) | RR-03 | — | Aprobada |
| 505 | sin IA: la mitad del tiempo con el candado mínimo | paso más ligero (meta intermedia) | — | — | Aprobada |
| 506 | un recordatorio se aligera con menos días | paso más ligero (meta intermedia) | — | — | Aprobada |

#### `backend/src/sync/constructorSql.spec.ts`

- **Qué revisa:** Armado seguro de las consultas de sincronización.
- **Tipo:** Backend · **Origen:** RF · **Pruebas:** 9

| # | Qué comprueba | Grupo | Casos | Dispositivo | Resultado |
|---|---|---|---|---|---|
| 507 | inserta o actualiza las columnas que no son clave | construirUpsert | — | — | Aprobada |
| 508 | usa otra columna de conflicto y no hace nada si solo viene la clave | construirUpsert | — | — | Aprobada |
| 509 | envía los JSON como texto (también los arreglos) | construirUpsert | — | — | Aprobada |
| 510 | rechaza columnas inexistentes (no se puede inyectar SQL por el nombre) | construirUpsert | — | — | Aprobada |
| 511 | cambia columnas buscando por la clave completa | construirUpdate | — | — | Aprobada |
| 512 | rechaza una clave incompleta o cambiar la clave | construirUpdate | — | — | Aprobada |
| 513 | busca por la clave primaria | construirConsultaFila | — | — | Aprobada |
| 514 | desde un cursor, ordenado por updated_at y clave | construirConsultaCambios | — | — | Aprobada |
| 515 | primera descarga con filtro de fecha, o todo | construirConsultaCambios | — | — | Aprobada |

### 7.12 Totales por zona

| Zona | Archivos | Pruebas |
|---|---|---|
| Base común (datos, sincronización, utilidades) | 10 | 63 |
| Cuenta | 5 | 26 |
| Cuestionario (encuesta inicial) | 2 | 19 |
| Planes y «Crear meta» (M1) | 11 | 79 |
| Hábitos | 12 | 67 |
| Recordatorios y agenda (M2) | 8 | 61 |
| Reajuste e introspección (M4) | 9 | 66 |
| Plantas y recompensas (M3) | 5 | 45 |
| Progreso | 4 | 47 |
| Modo enfoque (M5) | 2 | 9 |
| Backend | 5 | 33 |
| **Total** | **73** | **515** (515 aprobadas) |
