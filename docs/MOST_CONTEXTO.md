# MOST (most.) — Contexto completo del proyecto para Claude Code

> Fuente: unidad compartida de Drive "MOST" (SRS v4.0, Lista consolidada, Plan de Negocios, Lean Canvas, MOST.pptx, Estándar de Codificación, Plan de Pruebas, Retrospectiva 11, diagramas). Actualizado: 22-nov-2026.

## 1. Qué es
**most.** ("Menos app, más enfoque"; lema: *Pequeños pasos. Grandes cambios.*) es una app móvil (Android 10+ / iOS 14+) para **crear y mantener hábitos sin culpa**. Descompone metas en **micro-pasos de bajo esfuerzo**, da refuerzo positivo inmediato y **reajusta metas sin penalizar recaídas** (base: TCC y ACT, validado con 2 psicólogas).

- **Problema:** formar un hábito toma tiempo variable (Lally 2010: 18–254 días); las apps dan planes fijos y penalizan el fallo → >50 % las abandona el primer mes; solo 51 % mantiene un hábito un año.
- **Usuario:** 22–45 años. Primeros usuarios: universitarios (horarios dispersos, fatiga); también adultos jóvenes profesionistas.
- **Diferenciador:** plan en micro-pasos que se reajusta; el micro-paso se hace **más pequeño, no desaparece**; la gamificación solo recompensa, nunca castiga. Competencia: Habitica, Forest, Finch, Habits Garden, IÁbitos.
- **Propuesta de valor (a enfatizar): micro-pasos.** "Un micro-paso a la vez, sin culpa."
- **Equipo:** Allan Sebastian Zepeda Fragoso (Developer), Naín Santiago Ayón Nava (Scrum Master, backend/BD), Kimberly Montes Solis (Product Owner, SRS/pruebas). UABC, ISTE, grupo 972, semestre 2026-2.

## 2. Stack y repo
- Repo **MOST**, carpetas `mobile/` y `backend/`. Gestor: **pnpm**.
- **mobile/**: React Native + **Expo**, **TypeScript 5**, React Navigation, Expo Notifications, SQLite cifrado (AES-256), Expo SecureStore. Build de desarrollo (las notificaciones NO son confiables en Expo Go).
- **backend/**: **NestJS** (conexión app↔backend↔BD en proceso, a cargo de Naín).
- ⚠ El diagrama de arquitectura (v4.0) dice "MVP 100 % local, backend = fase futura (sync, TLS 1.3)". El desarrollo real ya tiene backend NestJS. **Confirmar con el equipo qué es MVP:** diseñar con repositorio de datos abstraído para que sirva local-first y luego sync.
- Gestión: ClickUp (backlog/defectos), sprints de 1 semana, Figma para diseño.
- Prototipo Figma: https://www.figma.com/design/ExyYWWnrQu27psMcsnAhZO/most--Proyecto-?node-id=2350-1201

## 3. Arquitectura en capas (diagrama oficial)
1. **Presentación:** pantallas onboarding, plan diario, detalle de hábito, progreso, ajustes (RN + Expo + React Navigation).
2. **Lógica de negocio (TypeScript):** Servicio de Planes, **Motor de Reajuste**, Recompensas e Hitos, Introspección y Barreras, banco de mensajes con tono TCC/ACT. Única capa que lee/escribe datos y usa servicios del dispositivo.
3. **Datos:** usuario, hábitos, micro-pasos, registros; SQLite cifrado + SecureStore.
4. **Servicios del dispositivo:** notificaciones locales (con acción "Completado"), modo No Molestar.
- Componentes: UI, Perfil y Onboarding, Generador de Planes, Motor de Reajuste, Introspección y Checklist de Barreras, Modo Enfoque, Recompensas y Progreso, Gestor de Recordatorios, Repositorio de Datos (IAlmacenamiento).
- Los datos de introspección **no salen del teléfono** (RR-04).

## 4. Módulos y requerimientos funcionales (SRS v4.0: 19 RF; 13 activos)
Estado al 15-nov: M1 y M4 concluidos (vibecoding), M2 y M3 iniciados (manual), M5 sin iniciar. (M2/M3/M5 siguen "en proceso" en la Retro 11.)

**M1 Plan de hábitos y micro-pasos**
- RF-03 (Must): descomponer meta en secuencia ordenada de micro-pasos de bajo esfuerzo (propuesto ≤ 5 min c/u; definir quién los crea, sistema o persona).

**M2 Recordatorios y horarios**
- RF-01 (Must): asignar hora y frecuencia a un hábito → notificación local.
- RF-02 (Must): gestionar horarios; recordatorio en bloque libre sin traslapes; si hay cruce, rechazar y sugerir bloque alterno. *(Pendiente: cómo se registra la agenda/tiempos libres.)*
- RF-18 (Should): resumen nocturno configurable (ej. 21:00) con hábitos/micro-pasos de mañana y acceso directo al plan.

**M3 Refuerzo positivo y motivación**
- RF-08 (Must): recompensa visual inmediata (≤ 1.5 s) al completar un micro-paso (animación/puntos/medalla; plantas, monedas, tienda).
- RF-13 (Must): notificación motivacional tras 3 días consecutivos; máx. 1 aviso/día (banner, no bloquea).
- RF-16 (Should): refuerzo visual/sonoro en hitos de avance. ⚠ RF-16 dice 50 %/80 %, RI-03 dice 50 %/100 %: **igualar** (el plan de pruebas CP-09 usa 50/80).

**M4 Introspección y reajuste adaptativo**
- RF-04 (Must): 1–3 preguntas autorreflexivas basadas en **valores**, nunca diagnóstico ni etiqueta clínica.
- RF-09 (Must): ajuste manual de días/intensidad sin penalización ni mensajes de fracaso; recordatorios se redistribuyen y se conserva el progreso. *(Se decidió separar en cambio manual UC-08 y ajuste automático.)*
- RF-15 (Must): si cumplimiento < 40 % en 7 días → meta intermedia aplicable en un toque, sin reiniciar historial.
- RF-17 (Should) + RF-19 (Must): al incumplir (vence hora límite) mostrar checklist de ≤ 3 preguntas (barreras: tiempo, recursos, acceso), proponer alternativa en un toque (ej. paso ligero de 2 min) sin marcar el día como fallido, ≤ 1.5 s. *(Decisión: unir RF-17 con RF-19.)*
- **RR-03 candado mínimo:** el reajuste no puede bajar de un mínimo de exigencia (días/minutos). ⚠ Valor numérico aún sin definir; el código del estándar usa `META_MINIMA = 1`.

**M5 Modo enfoque**
- RF-14 (Must) **redefinido (Retro 10):** la app silencia **solo sus propias notificaciones** durante la sesión y guía al usuario a activar manualmente el modo del celular. En Android con permiso especial puede activar "No Molestar"; **iOS no permite activarlo desde una app** → no intentarlo.

**Trabajo futuro (Won't have v1):** RF-05 temporizadores/Pomodoro, RF-06 micro-hábitos sin horario, RF-07 estudio compartido/presencia, RF-10/RF-12 recordatorios simples (duplican RF-01), RF-11 notificación a las 48 h sin actividad.

## 5. Casos de uso (UC)
UC-01 Completar perfil (incluye UC-02) · UC-02 Generar plan (incluye UC-15) · UC-03 Consultar plan/micro-pasos · UC-04 Marcar micro-paso (incluye UC-05) · UC-05 Recibir recompensa · UC-06 Configurar recordatorios · UC-07 Recibir recordatorio (SO) · UC-08 Ajustar/pausar meta · UC-09 Reevaluar con punto medio (condición: <40 %/7 días) · UC-10 Checklist de barreras (condición: hábito no completado a hora límite) · UC-11 Pregunta de introspección (extiende UC-08) · UC-12 Consultar progreso (no punitivo) · UC-13 Activar modo enfoque · UC-14 Resumen nocturno (extiende UC-07) · UC-15 Confirmar plan generado (obligatorio para activar).
- Flujo de onboarding: **encuesta inicial de 7 pasos** que personaliza el plan → plan generado → confirmación explícita.
- Tipos de usuario del sistema completo: visitante, nuevo, registrado.

## 6. Requerimientos no funcionales (resumen)
- RNF-01: acciones locales reflejadas ≤ **1.5 s**. RNF-02: cold start ≤ **2.0 s**. RNF-04: batería < **3 %**/día. RNF-03: ≤ 15 MB datos/día (⚠ menciona "presencia virtual", que depende de RF-07 futuro → ajustar).
- RNF-05: cifrado en reposo y tránsito (AES-256 / TLS 1.3, OWASP).
- RNF-06: notificaciones no invasivas y configurables. RNF-07: **cero penalización** ni indicadores visuales negativos. RNF-08 (Could): bajar 20 % alertas tras 21 días de cumplimiento. RNF-09: **tono autocompasivo** TCC/ACT en 100 % de microcopia.
- RNF-10: disponibilidad 99 %. RNF-11: **100 % paridad Android/iOS**.
- Interfaz: RI-01 UI limpia/color prudente; RI-02 formularios rápidos (escala o elección única); RI-03 hitos visuales con audio opcional; RI-04 completar micro-paso **desde la notificación**; RI-05 gamificación no punitiva (estrés ≤ 2/10); RI-06 notificaciones cortas, claras, no punitivas; RI-07 APIs nativas de notificaciones/No Molestar (Expo).
- Restricciones: RR-01 tecnologías web/móviles; RR-02 MVP dentro del ciclo 2026-2; RR-03 candado mínimo; RR-04 anonimato/confidencialidad de introspección (sin diagnósticos médicos explícitos).
- Atributos de calidad prioritarios (Alta): funcionalidad, confiabilidad (offline resiliente), usabilidad (flujos de 1–2 toques), eficiencia, seguridad.

## 7. Reglas de producto / tono (críticas)
- **Nunca** castigar: sin "fallaste", sin rachas que se borren, sin mensajes de fracaso, sin pérdida de progreso al ajustar/pausar.
- Días en pausa **no cuentan como fallo**.
- Lenguaje empático, autocompasivo, corto. Preguntas de introspección basadas en valores, sin diagnóstico.
- La recaída es parte del proceso (concepto central).
- Gamificación: plantas que crecen, monedas, tienda de artículos; solo recompensa.

## 8. Modelo de negocio (para pantallas de plan/paywall y web)
- Freemium: **Gratis** ($0: 2 hábitos, recordatorios, reajuste sin castigo, planta básica, con anuncios) · **MOST Plus $49 MXN/mes** (anual ≈ $399–500; ilimitado, plantas/artículos exclusivos, respaldo/sincronización, sin anuncios). Precio en MXN, no USD.
- Neto por suscripción ≈ $41.65 (15 % comisión tiendas). Punto de equilibrio: 61 suscripciones (operación $2,500/mes), 605 (recuperar inversión), 1,026 (operación + salario mínimo ×3). Conversión de referencia 5 %.
- Métrica clave: **retención a 30 días**. Canales: campus UABC (20–30 beta testers), TikTok/Instagram, alianzas con psicólogos, tiendas (ASO), referidos con monedas.
- Costos: MVP 9 semanas ≈ $2,500 MXN en efectivo; proyecto completo 6 meses ≈ $272,300 MXN.

## 9. Estándar de codificación ECM-TS v1.0 (obligatorio)
- TypeScript 5. **Identificadores en español**, sin acentos ni ñ (`anio`).
- `camelCase` variables/funciones (funciones inician con verbo: `calcularCumplimiento`); booleanos con `es/tiene/puede` (`esCompletado`); `PascalCase` clases/interfaces/tipos/componentes (interfaces **sin** prefijo `I`); constantes `MAYUSCULAS_CON_GUION_BAJO`.
- Archivos: `camelCase` lógica (`motorReajuste.ts`), `PascalCase` componentes (`TarjetaMicroPaso.tsx`).
- **Encabezado obligatorio** en cada `.ts/.tsx` (bloque `/** */` con `@file @proyecto @descripcion @autor @fecha @version @historial`), antes de los imports.
- Orden del archivo: encabezado → imports (externos, línea en blanco, internos) → tipos → constantes → funciones auxiliares → principal → estilos (`StyleSheet.create`). Separadores `// ===== Nombre =====`.
- JSDoc (`@param`, `@returns`) en todo lo exportado; sin código comentado; `// TODO(autor): ...` (también en ClickUp).
- `const` por defecto, nunca `var`; `===`/`!==`; `;` siempre; comillas simples; sin `any`; tipos explícitos en funciones exportadas; **sin números mágicos** (constantes con nombre); siempre llaves en `if`.
- Prettier: `printWidth 100, tabWidth 2, useTabs false, singleQuote true, semi true, trailingComma all`. ESLint + typescript-eslint (`naming-convention`).
- Carpetas de ejemplo: `../tipos/habito`, `../servicios/servicioPlanes`, `../datos/repositorioRegistros`.
- Ejemplo de dominio: `UMBRAL_CUMPLIMIENTO = 0.4`, `DIAS_EVALUADOS = 7`, `META_MINIMA = 1`; `evaluarHabito` reduce `diasPorSemana` a `max(ceil(d/2), META_MINIMA)` si cumplimiento < 40 %.

## 10. Plan de pruebas (16 casos, funcional manual, dispositivos reales)
CP-01/02 (RF-03 éxito/fallo meta sin nombre) · CP-03/05 (RF-01 recordatorio 10:00 diario / sin hora) · CP-04 (RF-02 franja ocupada 10:00-11:00 → sugerir 11:00) · CP-06 (RF-18, 21:00) · CP-07 (RF-08, ≤1.5 s) · CP-08 (RF-13, 3 días) · CP-09 (RF-16, 5/10 y 8/10) · CP-10 (RF-04, escala 1–5) · CP-11 (RF-15, 2/7 = 28 %) · CP-12 (RF-09, L-M-V, 20→10 min) · CP-13 (RF-17/19, barrera "falta de tiempo") · CP-14 (RF-09/15 + RR-03, 0 días/0 min rechazado) · CP-15/16 (RF-14 Android con permiso / iOS o sin permiso).
Criterio: 100 % Alta aprobados, ≥ 90 % Media. Ejecución 18–27 nov; defectos en ClickUp con ID del caso. CP-15/16 bloqueados hasta iniciar M5.

## 11. Discrepancias / decisiones abiertas
1. **Backend vs 100 % local** (diagrama dice local; se desarrolla NestJS).
2. **Candado mínimo** (RR-03) sin valor definido.
3. **Registro de agenda/tiempos libres** (RF-02) sin definir.
4. Hitos 50/80 (RF-16) vs 50/100 (RI-03).
5. RR-01 habla de "PWA/móvil web"; el producto es app Expo nativa (la web es aparte, ver abajo).
6. Entrevistas de validación: **2 (ambas psicólogas)**, no 6 como dicen algunos documentos.
7. Expo Go no sirve para notificaciones ni No Molestar → usar build de desarrollo.

## 12. Siguientes entregables del equipo (Retro 11)
- **Web que centralice la info y publicidad de MOST** (qué es, propuesta de valor basada en micro-pasos, equipo, contacto) — responsable Allan, primera versión **29-nov-2026**.
- Concluir M2, M3 y M5 (Allan/equipo); conexión app↔backend↔BD (Naín); ejecutar plan de pruebas y matriz (Kimberly, 27-nov); corregir defectos Alta.
- Registro de ejecución: resultado de cada prueba el mismo día; casos dependientes de funciones sin terminar = Bloqueado.

## 13. Cómo usar este archivo con Claude Code
Colócalo como `CLAUDE.md` (o `docs/CONTEXTO.md` y referenciarlo desde `CLAUDE.md`) en la raíz del repo MOST. Sugerido: pedir primero un plan por módulo (M2, M3, M5) respetando ECM-TS y las reglas de tono de la sección 7.

---

## 14. Flujo de trabajo del equipo (cómo debe trabajar Claude Code)
- **Scrum**, sprints de 1 semana; retrospectiva semanal (próxima: dom 29-nov-2026). Roles: Naín = Scrum Master, Kimberly = Product Owner, Allan = Developer.
- **Backlog y defectos en ClickUp.** Todo `TODO` del código también va al backlog. Defecto de prueba = ticket con el ID del caso (CP-xx).
- **Definición de Terminado (DoD) por historia:** (1) cumple el criterio de verificación del RF; (2) cumple ECM-TS (Prettier + ESLint al guardar); (3) revisión de código por otro integrante; (4) probado en dispositivo real (build de desarrollo, no Expo Go); (5) resultado registrado el mismo día en el documento de ejecución de pruebas.
- **Código generado con IA (vibecoding):** M1 y M4 se hicieron así. Lecciones: los RF ambiguos o con varias tareas producen código duplicado o inviable (RF-09 vs RF-19; APIs de No Molestar no permitidas en iOS/Expo Go). Regla: antes de generar, dejar el RF con métrica y una sola responsabilidad; **revisar el código generado por otro integrante**; eliminar duplicados.
- **Orden recomendado de desarrollo:** 1) base (Repositorio de Datos cifrado + tipos `habito`) → 2) cerrar M2 (RF-01, RF-02, RF-18) → 3) cerrar M3 (RF-08, RF-13, RF-16) → 4) M5 (RF-14 redefinido) → 5) conexión con backend/BD → 6) pruebas CP-01…CP-16 → 7) corregir defectos Alta.
- **Cada módulo:** leer RF + criterio de verificación (sección 15) → implementar en capa de lógica (TypeScript puro, testeable) → UI → notificaciones (si aplica) → probar su CP.
- Documentar cambios de requerimientos en el SRS (versión + historial) y en la matriz de trazabilidad.

### Flujo de usuario en la app (de los casos de uso)
1. **Onboarding:** encuesta inicial de 7 pasos (UC-01) → se genera plan (UC-02) → usuario confirma (UC-15) → plan activo.
2. **Día a día:** dashboard/plan diario (UC-03) → recibe recordatorio (UC-06/07) → marca micro-paso, también desde la notificación (UC-04) → recompensa inmediata (UC-05) → hitos y progreso (UC-12).
3. **Si baja el ritmo:** vence hora límite → checklist de barreras (UC-10) → alternativa en un toque; <40 % en 7 días → meta intermedia (UC-09); ajuste/pausa manual (UC-08); preguntas de introspección (UC-11). Siempre con candado mínimo (RR-03) y sin penalización.
4. **Extras:** resumen nocturno (UC-14), modo enfoque (UC-13).

## 15. Requerimientos con criterio de verificación (SRS v4.0)
| RF | Prioridad | Debe hacer | Criterio de verificación |
|---|---|---|---|
| RF-01 | Must | Recordatorios con hora y frecuencia para hábitos | Asignar hora y frecuencia diaria y guardar → la notificación se emite a la hora y días programados |
| RF-02 | Must | Gestión de horarios sin traslapes | Con agenda configurada, el recordatorio queda en bloque libre; en franja ocupada se rechaza y sugiere alterno |
| RF-03 | Must | Meta → micro-pasos progresivos de bajo esfuerzo | Crear meta y "descomponer" → lista ordenada de micro-pasos registrables uno a uno |
| RF-04 | Must | Preguntas autorreflexivas basadas en valores | En seguimiento aparecen preguntas de valores; nunca diagnóstico ni etiqueta clínica |
| RF-08 | Must | Recompensa inmediata al completar micro-paso | Marcar micro-paso → recompensa visual de inmediato (≤ 1.5 s) |
| RF-09 | Must | Ajuste flexible de días/intensidad sin penalización | Cambio de agenda → recordatorios se redistribuyen sin reprogramar toda la rutina ni perder progreso |
| RF-13 | Must | Notificaciones motivacionales periódicas | 3 días consecutivos → banner con refuerzo y acceso directo; máx. 1 aviso/día |
| RF-14 | Must | Reducir distracciones (redefinido: silenciar notificaciones propias + guía de No Molestar) | Sesión de enfoque → la app no emite sus notificaciones; con permiso Android pasa a No Molestar; se restaura al terminar/cancelar; iOS sin intento de activarlo |
| RF-15 | Must | Reevaluación con punto medio | Cumplimiento < 40 % durante 7 días → meta intermedia en un toque, sin reiniciar historial |
| RF-16 | Should | Refuerzo (visual/audio) en hitos | Hitos 50 % y 80 % (igualar con RI-03) → refuerzo y actualización del indicador sin reiniciar la app |
| RF-17 | Should | Checklist de barreras al incumplir | Vence hora límite → checklist ≤ 3 preguntas; alternativa sin marcar día fallido |
| RF-18 | Should | Resumen nocturno | Activar a las 21:00 → notificación con hábitos/micro-pasos de mañana y acceso al plan |
| RF-19 | Must | Formulario de reajuste con selección rápida | Registrar incumplimiento y causa → sugerencia de ajuste en un toque, sin penalización (meta ≤ 1.5 s; unir con RF-17) |

Futuros (Won't v1): RF-05 temporizador 25/5 con descanso obligatorio · RF-06 micro-hábitos sin horario · RF-07 presencia "hay N personas completando este hábito" con privacidad · RF-10/RF-12 recordatorios simples (integrar en RF-01) · RF-11 mensaje empático tras 48 h sin actividad.

Mejoras de redacción pendientes en el SRS (ISO 29148): fijar ≤ 5 min por micro-paso (RF-03), "inmediato" = ≤ 1.5 s (RF-08), un aviso/día (RF-13), unir RF-17+RF-19, separar RF-09 en manual y automático, quitar la dependencia de RF-07 en RNF-03.
