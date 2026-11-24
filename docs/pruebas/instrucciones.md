Instrucciones para Claude Code — MOST (desarrollo + validación con pruebas)

Pega esto como primer mensaje en Claude Code (con MOST_CONTEXTO.md ya guardado como CLAUDE.md en la raíz del repo).

Prompt

Lee CLAUDE.md completo (contexto, requerimientos, estándar ECM-TS, reglas de tono). Trabajarás en el repo MOST (mobile/ Expo + React Native + TypeScript, backend/ NestJS, pnpm). Objetivo: terminar los módulos pendientes (M2, M3, M5) y validar cada requerimiento con los casos de prueba CP-01 a CP-16 de esta lista, rehaciéndolos todos desde cero, aunque en el documento del equipo algunos aparezcan como ejecutados (ninguno tiene resultado válido; CP-01 se corrió en Expo Go).

Reglas de trabajo
Antes de programar, revisa el estado del repo (qué existe de M1 y M4, estructura de carpetas, dependencias) y dame un plan corto por módulo. Pregúntame solo lo que bloquee.
Orden: base de datos/tipos (habito, microPaso, registro, recordatorio) → M1 (revisar) → M2 → M3 → M4 (revisar) → M5.
Cada módulo se cierra así: implementar la lógica en TypeScript puro (testeable) → UI → escribir pruebas automatizadas → correrlas → reportar resultado. No marques nada como "Aprobada" sin haberlo ejecutado y mostrado la salida.
Cumple ECM-TS: identificadores en español sin acentos, encabezado @file/@proyecto/@descripcion/@autor/@fecha/@version/@historial, tipos explícitos, sin any, sin números mágicos (constantes con nombre), const, ===, Prettier + ESLint. Corre pnpm lint y pnpm format antes de reportar.
Tono (RNF-07/09): ningún texto punitivo ("fallaste", "perdiste tu racha", etc.). Los mensajes de validación son neutros y compasivos. Un día en pausa no cuenta como fallo.
Pruebas automatizadas con Jest (jest-expo) y @testing-library/react-native para UI; la lógica (motor de reajuste, descomposición, hitos, anti-traslape de horarios) con pruebas unitarias. Notificaciones: mockear expo-notifications en las pruebas automáticas y marcar el caso como "requiere dispositivo".
Decisiones abiertas — no las inventes en silencio; propón un valor, declara el supuesto en el código (constante con nombre) y en el reporte:
Candado mínimo (RR-03): propongo DIAS_MINIMOS_POR_SEMANA = 1 y MINUTOS_MINIMOS = 2.
Hitos RF-16: usar 50 % y 80 %.
Registro de agenda para RF-02: proponer un modelo simple (bloques ocupados por día/hora) y pedirme confirmación.
Backend vs 100 % local: abstraer el acceso a datos tras IAlmacenamiento/repositorio para que funcione local-first y luego sincronice.
Nunca intentes activar "No Molestar" en iOS. En Android solo con permiso especial otorgado.
Entregables de validación

Crea docs/pruebas/resultados.md y actualízalo en cada corrida con esta tabla:

CP	RF	Tipo (auto / dispositivo)	Estado (Aprobada / Fallida / Bloqueada / Pendiente-dispositivo)	Evidencia (comando + salida resumida)	Defecto
Aprobada: obtenido = esperado, ejecutado por ti con salida visible.
Fallida: describe el defecto (severidad Alta/Media/Baja), arréglalo y re-ejecuta; deja ambas corridas anotadas.
Bloqueada: la funcionalidad aún no existe.
Pendiente-dispositivo: pasa la parte automática pero necesita probarse en Android/iPhone reales con build de desarrollo (no Expo Go); deja los pasos manuales listos en el mismo archivo.
Al final: conteo por estado, % de Alta aprobadas (meta 100 %) y % de Media aprobadas (meta ≥ 90 %), y la matriz RF ↔ CP (un RF está verificado solo si todos sus CP están aprobados).
Lista aparte "Defectos para ClickUp" con ID de caso, descripción y severidad.
Casos de prueba a ejecutar (todos, desde cero)

Prioridad Alta = Must, Media = Should. "Auto" = prueba automatizada posible; "Disp." = además requiere dispositivo real.

M1 — Plan de hábitos y micro-pasos

CP-01 · RF-03 · Éxito · Alta · Auto

Precondición: no existe una meta con el mismo nombre.
Pasos: Nueva meta → nombre → "Descomponer en micro-pasos" → confirmar → abrir plan y registrar el primer micro-paso.
Entrada: meta "Leer 20 minutos al día".
Esperado: lista ordenada de 3 a 5 micro-pasos de menor a mayor esfuerzo; el primero ≤ 5 min y cada uno a lo mucho el triple del anterior (decisión del 23-nov-2026; antes decía «cada uno ≤ 5 min»); cada uno se marca individualmente.
Postcondición: meta guardada con su secuencia; primer micro-paso completado, el resto pendientes.

CP-02 · RF-03 · Fallo · Alta · Auto

Pasos: Nueva meta → nombre vacío → Descomponer → confirmar.
Esperado: no se generan micro-pasos; campo resaltado con mensaje neutro y autocompasivo; el formulario conserva lo capturado.
Postcondición: no se crea ninguna meta; la lista no cambia.
M2 — Recordatorios y horarios

CP-03 · RF-01 · Éxito · Alta · Auto + Disp.

Precondición: hábito "Tomar agua"; permiso de notificaciones; build de desarrollo.
Pasos: abrir hábito → Agregar recordatorio → hora y frecuencia → Guardar → app en segundo plano → esperar la hora.
Entrada: 10:00, diaria.
Esperado: recordatorio guardado y listado en el hábito; a las 10:00 se emite la notificación local en los días programados.
Auto: verifica que se llama a la programación con trigger diario 10:00 y que el recordatorio persiste.

CP-04 · RF-02 · Alterno · Alta · Auto

Precondición: agenda con bloque ocupado 10:00–11:00 ("Clase"); hábito "Estirar".
Pasos: Horarios → programar "Estirar" → Guardar → aceptar la sugerencia.
Entrada: 10:30 (dentro del bloque).
Esperado: no se programa a las 10:30; avisa que la franja está ocupada; sugiere siguiente bloque libre (11:00); al aceptar queda sin traslapes.
Postcondición: ningún recordatorio dentro de un bloque ocupado.

CP-05 · RF-01 · Fallo · Alta · Auto

Pasos: abrir hábito → Agregar recordatorio → frecuencia sin hora → Guardar.
Esperado: no se guarda; campo de hora resaltado con mensaje claro; no se programa ninguna notificación; la lista de recordatorios no cambia.

CP-06 · RF-18 · Éxito · Media · Auto + Disp.

Precondición: dos hábitos con micro-pasos para mañana ("Tomar agua", "Leer 20 minutos"); permiso de notificaciones.
Pasos: Ajustes → Resumen nocturno → activar y fijar hora → Guardar → esperar → tocar la notificación.
Entrada: 21:00.
Esperado: a las 21:00 llega notificación con los hábitos y micro-pasos de la mañana siguiente; al tocarla abre el plan. La configuración persiste.
M3 — Refuerzo positivo y motivación

CP-07 · RF-08 · Éxito · Alta · Auto

Precondición: meta con micro-pasos pendientes (CP-01).
Pasos: abrir meta → marcar el primer micro-paso → observar y medir tiempo.
Entrada: micro-paso "Abrir el libro".
Esperado: recompensa visual (animación/puntos/medalla) en ≤ 1.5 s, sin mensajes negativos; recompensa registrada en el progreso.

CP-08 · RF-13 · Éxito · Alta · Auto + Disp.

Precondición: cumplimiento registrado días 1 y 2 (fechas de prueba); permiso de notificaciones.
Pasos: registrar cumplimiento del día 3 → app en segundo plano → esperar notificación → tocar acceso directo.
Entrada: "Tomar agua", 3 días consecutivos.
Esperado: banner motivacional con acceso directo, sin bloquear la pantalla; máximo un aviso al día; aviso registrado como enviado en esa fecha.
Auto: usa reloj falso (fake timers/fecha inyectada).

CP-09 · RF-16 · Éxito · Media · Auto

Precondición: meta cuantificable con avance 0.
Pasos: registrar avance a 5/10 → observar refuerzo → a 8/10 → observar refuerzo e indicador.
Entrada: "Leer 10 capítulos".
Esperado: refuerzo gráfico y/o sonoro en cada hito (50 % y 80 %); indicador actualizado sin reiniciar la app; hitos marcados como alcanzados.
M4 — Introspección y reajuste adaptativo

CP-10 · RF-04 · Éxito · Alta · Auto

Precondición: hábito con seguimiento activo.
Pasos: abrir seguimiento → leer preguntas → responder con escala.
Entrada: respuestas 1–5.
Esperado: 1 a 3 preguntas basadas en valores; ningún diagnóstico ni etiqueta clínica; respuestas guardadas local/cifradas.

CP-11 · RF-15 · Éxito · Alta · Auto

Precondición: cumplimiento simulado < 40 % durante 7 días.
Pasos: abrir hábito → leer sugerencia → aplicar con un toque → revisar historial.
Entrada: meta original 5 días/semana; cumplimiento 2 de 7 (28 %).
Esperado: meta intermedia aplicable en un toque; historial intacto; sin mensajes de fracaso.

CP-12 · RF-09 · Alterno · Alta · Auto

Precondición: hábito con recordatorios de lunes a viernes y progreso previo.
Pasos: abrir meta → Ajustar → cambiar días e intensidad → Guardar → revisar recordatorios y progreso.
Entrada: lunes, miércoles, viernes; de 20 a 10 minutos.
Esperado: ajuste guardado sin penalización ni mensajes de fracaso; recordatorios se redistribuyen sin reprogramar toda la rutina; progreso previo intacto.

CP-13 · RF-17 + RF-19 · Éxito · Alta · Auto

Precondición: hábito con hora límite y sin registro de cumplimiento.
Pasos: dejar vencer la hora límite → abrir app/notificación → responder checklist → aplicar sugerencia.
Entrada: "Leer 20 minutos", hora límite 20:00, barrera "Falta de tiempo".
Esperado: checklist de ≤ 3 preguntas en ≤ 1.5 s; alternativa aplicable en un toque (ej. paso ligero de 2 min); el día no se marca como fallido; barrera registrada.

CP-14 · RF-09 + RF-15 + RR-03 · Fallo · Alta · Auto

Precondición: meta vigente y candado mínimo definido.
Pasos: abrir meta → Ajustar → reducir días e intensidad al mínimo posible → Guardar.
Entrada: 0 días/semana, 0 minutos.
Esperado: el ajuste no se guarda; informa el mínimo permitido con tono compasivo; la meta conserva los valores anteriores.
M5 — Modo enfoque (RF-14 redefinido)

CP-15 · RF-14 · Éxito · Alta · Auto + Disp. (Android)

Precondición: build de desarrollo en Android; permisos otorgados; recordatorio programado dentro de la sesión.
Pasos: Modo enfoque → iniciar → esperar la hora del recordatorio → terminar → verificar notificaciones.
Entrada: sesión de 25 min; recordatorio a los 10 min.
Esperado: la app no emite notificaciones propias durante la sesión; con permiso, el dispositivo pasa a "No Molestar"; al terminar o cancelar se restaura el estado previo; sesión registrada.

CP-16 · RF-14 · Alterno · Alta · Auto + Disp. (iPhone / Android sin permiso)

Pasos: Modo enfoque → iniciar → leer la guía → terminar.
Entrada: 25 min en iOS o Android sin permiso.
Esperado: la app no intenta activar "No Molestar"; silencia solo sus propias notificaciones; muestra guía para activar manualmente el modo del celular; sin errores ni cierres; notificaciones restauradas al final; sin cambios en la configuración del dispositivo.
Criterio de aceptación

100 % de los casos Alta aprobados y ≥ 90 % de los Media (CP-06, CP-09). Cierra con el resumen de resultados, la matriz RF ↔ CP, los defectos para ClickUp y la lista de pasos manuales que quedan pendientes en dispositivo real.