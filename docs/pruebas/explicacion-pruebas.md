# Pruebas automáticas de most.: de dónde salen y qué revisan

Para: Kimberly (Product Owner, plan de pruebas). Acompaña a la lista completa
[`pruebas-automaticas.md`](pruebas-automaticas.md) (también en [`.csv`](pruebas-automaticas.csv)
para hoja de cálculo) y a los resultados de los CP en [`resultados.md`](resultados.md).

Corrida del 25-nov-2026 sobre `main`: **515 pruebas, 515 aprobadas, 0 fallidas**.

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
