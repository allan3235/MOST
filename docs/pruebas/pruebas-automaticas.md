# Pruebas automáticas de most.

Corrida del 25-nov-2026 sobre `main` (`7c21433`). Comandos: `cd mobile && pnpm jest` y `cd backend && pnpm test`.

| Proyecto | Archivos | Pruebas | Aprobadas | Fallidas |
|---|---|---|---|---|
| App (`mobile/`, Jest + jest-expo) | 68 | 482 | 482 | 0 |
| Backend (`backend/`, Vitest) | 5 | 33 | 33 | 0 |
| **Total** | **73** | **515** | **515** | **0** |

En la corrida 1 (23-nov) eran 454 (423 de la app y 31 del backend). Las nuevas cubren las correcciones D-02 a D-14 y las pantallas agregadas después. La columna «Casos» marca los CP, RF y defectos que menciona cada prueba. La misma lista está en `pruebas-automaticas.csv` para abrirla en una hoja de cálculo.


### `mobile/src/comun/datos/__tests__/cifrado.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 1 | CP-10: cifrado de la base local | crea una clave aleatoria de 256 bits, la guarda en el almacén seguro y la reutiliza | CP-10 | Aprobada |
| 2 | CP-10: cifrado de la base local | con SQLCipher aplica la clave con PRAGMA key y la base queda cifrada | CP-10 | Aprobada |
| 3 | CP-10: cifrado de la base local | si la clave no abre el archivo (base vieja sin cifrar) pide recrearla | CP-10 | Aprobada |
| 4 | CP-10: cifrado de la base local | sin SQLCipher (Expo Go) no ejecuta PRAGMA key | CP-10 | Aprobada |

### `mobile/src/comun/datos/__tests__/clienteApi.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 5 | pedirApi | manda el token y arma la URL con los parámetros |  | Aprobada |
| 6 | pedirApi | un rechazo trae el code del backend (la cola lo descarta) |  | Aprobada |
| 7 | pedirApi | un error sin code se puede reintentar |  | Aprobada |
| 8 | pedirApi | sin red lanza ErrorSinRed |  | Aprobada |
| 9 | pedirApi | un 401 con sesión la cierra (caducó) |  | Aprobada |
| 10 | pedirApi | registro e inicio de sesión no llevan token |  | Aprobada |

### `mobile/src/comun/datos/__tests__/dueno-base.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 11 | dueño de la base local | la misma cuenta conserva sus datos |  | Aprobada |
| 12 | dueño de la base local | otra cuenta vacía la base |  | Aprobada |
| 13 | dueño de la base local | sin dueño anotado, solo se anota |  | Aprobada |

### `mobile/src/comun/logica/__tests__/fecha-hoy.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 14 | cambio de día con la app abierta | calcula lo que falta para la medianoche local |  | Aprobada |
| 15 | cambio de día con la app abierta | sin cambio de día no avisa; al cambiar, avisa una sola vez |  | Aprobada |

### `mobile/src/comun/logica/sync/__tests__/sync-rules.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 16 | compactar la cola (SDD 3.4) | quita un complete seguido de su uncomplete |  | Aprobada |
| 17 | compactar la cola (SDD 3.4) | no quita un uncomplete seguido de un complete (el check-in ya estaba en el servidor) |  | Aprobada |
| 18 | compactar la cola (SDD 3.4) | marcar, deshacer y volver a marcar deja solo el último complete |  | Aprobada |
| 19 | compactar la cola (SDD 3.4) | no quita un complete que ya se intentó enviar (pudo llegar al servidor sin respuesta) |  | Aprobada |
| 20 | compactar la cola (SDD 3.4) | no mezcla hábitos ni fechas distintas |  | Aprobada |
| 21 | rechazos del servidor | {"code":"22008"} → true |  | Aprobada |
| 22 | rechazos del servidor | {"code":"PGRST116"} → true |  | Aprobada |
| 23 | rechazos del servidor | {"code":""} → false |  | Aprobada |
| 24 | rechazos del servidor | {"code":null} → false |  | Aprobada |
| 25 | rechazos del servidor | {} → false |  | Aprobada |
| 26 | rechazos del servidor | null → false |  | Aprobada |
| 27 | mezcla de filas descargadas | no pisa filas con cambios locales pendientes |  | Aprobada |
| 28 | mezcla de filas descargadas | un update pendiente también protege su fila |  | Aprobada |
| 29 | mezcla de filas descargadas | los update no se compactan con los check-ins |  | Aprobada |
| 30 | cursor de descarga | toma el updated_at más reciente del servidor |  | Aprobada |
| 31 | cursor de descarga | compara microsegundos aunque la fracción tenga distinto largo |  | Aprobada |
| 32 | cursor de descarga | conserva el anterior si no llegó nada |  | Aprobada |

### `mobile/src/comun/modelo/esquemas/__tests__/onboarding.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 33 | claves del formulario | cada objetivo pertenece a un área y no hay objetivos sueltos |  | Aprobada |
| 34 | respuestasSchema | acepta el ejemplo del SDD 4 |  | Aprobada |
| 35 | respuestasSchema | exige de 1 a 2 áreas y objetivos |  | Aprobada |
| 36 | respuestasSchema | rechaza objetivos de un área no elegida |  | Aprobada |
| 37 | respuestasSchema | rechaza repetidos y claves desconocidas |  | Aprobada |
| 38 | versión 4: P5 por día y P6 con varias respuestas | las respuestas de la versión 3 se convierten al validarlas |  | Aprobada |
| 39 | versión 4: P5 por día y P6 con varias respuestas | «varía» de la versión 3 queda como cualquier momento: el aviso sigue siendo flexible |  | Aprobada |
| 40 | versión 4: P5 por día y P6 con varias respuestas | el momento principal es el primero que se repite en todos los días libres |  | Aprobada |
| 41 | versión 4: P5 por día y P6 con varias respuestas | pide al menos un momento en la semana y al menos un obstáculo |  | Aprobada |
| 42 | momento de un hábito según sus días | en días con mañana y noche libres reparte: el primer hábito mañana, el segundo noche |  | Aprobada |
| 43 | momento de un hábito según sus días | si incluye el sábado (solo noche), queda en la noche |  | Aprobada |
| 44 | momento de un hábito según sus días | dice qué días tienen libre cada momento |  | Aprobada |

### `mobile/src/comun/modelo/esquemas/__tests__/plan.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 45 | respuesta de la IA (SDD 5.9) | acepta exactamente los objetivos pedidos, en cualquier orden |  | Aprobada |
| 46 | respuesta de la IA (SDD 5.9) | rechaza: falta un objetivo |  | Aprobada |
| 47 | respuesta de la IA (SDD 5.9) | rechaza: objetivo repetido |  | Aprobada |
| 48 | respuesta de la IA (SDD 5.9) | rechaza: objetivo no pedido |  | Aprobada |
| 49 | respuesta de la IA (SDD 5.9) | rechaza: objetivo inventado |  | Aprobada |
| 50 | respuesta de la IA (SDD 5.9) | rechaza: título muy largo |  | Aprobada |
| 51 | respuesta de la IA (SDD 5.9) | rechaza: resumen muy largo |  | Aprobada |
| 52 | respuesta de la IA (SDD 5.9) | rechaza: no es un objeto |  | Aprobada |

### `mobile/src/comun/presentacion/__tests__/candado.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 53 | un solo toque por acción | un toque doble rápido corre la acción una sola vez |  | Aprobada |
| 54 | un solo toque por acción | se libera después de la espera |  | Aprobada |
| 55 | un solo toque por acción | con una acción asíncrona espera a que termine |  | Aprobada |
| 56 | un solo toque por acción | si la acción falla, se libera igual |  | Aprobada |

### `mobile/src/comun/presentacion/ui/__tests__/ruedas-hora.test.tsx`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 57 | partesDeHora y formatearHora | separan y arman "HH:MM" |  | Aprobada |
| 58 | partesDeHora y formatearHora | un valor raro queda en 00:00 |  | Aprobada |
| 59 | RuedasHora | «Aceptar» devuelve la hora elegida tocando otra opción |  | Aprobada |
| 60 | ReminderDialog en iPhone | «Elegir hora» muestra las ruedas y guarda la hora |  | Aprobada |

### `mobile/src/comun/util/__tests__/dates.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 61 | fechas de hábitos | fechaLocal usa la fecha del teléfono |  | Aprobada |
| 62 | fechas de hábitos | suma y resta días cruzando meses y años |  | Aprobada |
| 63 | fechas de hábitos | día ISO: lunes = 1, domingo = 7 |  | Aprobada |

### `mobile/src/zonas/cuenta/logica/__tests__/auth-error-message.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 64 | authErrorMessage | traduce los estados conocidos del backend |  | Aprobada |
| 65 | authErrorMessage | reconoce los fallos de red |  | Aprobada |
| 66 | authErrorMessage | nunca muestra el texto técnico |  | Aprobada |

### `mobile/src/zonas/cuenta/logica/__tests__/auth-schemas.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 67 | loginSchema | normaliza el correo (espacios y mayúsculas) |  | Aprobada |
| 68 | loginSchema | pide el correo y la contraseña |  | Aprobada |
| 69 | loginSchema | rechaza un correo mal escrito |  | Aprobada |
| 70 | loginSchema | acepta hasta 50 caracteres y rechaza más (decisión del usuario) |  | Aprobada |
| 71 | loginSchema | rechaza dos «@» |  | Aprobada |
| 72 | registerSchema | acepta datos válidos |  | Aprobada |
| 73 | registerSchema | exige al menos 8 caracteres |  | Aprobada |
| 74 | registerSchema | marca el error en la confirmación si no coincide |  | Aprobada |

### `mobile/src/zonas/cuenta/logica/__tests__/form-aviso.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 75 | aviso único del formulario | sin errores no hay aviso |  | Aprobada |
| 76 | aviso único del formulario | si falta algún campo, avisa de los campos vacíos |  | Aprobada |
| 77 | aviso único del formulario | si no falta nada, muestra el primer error en orden |  | Aprobada |

### `mobile/src/zonas/cuenta/logica/__tests__/sesion-caducada.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 78 | sesión sin conexión | sigue abierta hasta 60 días sin conexión |  | Aprobada |
| 79 | sesión sin conexión | caduca pasados los 60 días |  | Aprobada |
| 80 | sesión sin conexión | sin registro de conexión no caduca |  | Aprobada |
| 81 | aviso de sesión caducada | le queda lo que falta para vencer |  | Aprobada |
| 82 | aviso de sesión caducada | vencido o sin mostrar, ya no se ve |  | Aprobada |

### `mobile/src/zonas/cuenta/logica/__tests__/session-route.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 83 | resolveAppZone | espera mientras se lee la sesión guardada |  | Aprobada |
| 84 | resolveAppZone | manda a la zona de cuenta sin sesión |  | Aprobada |
| 85 | resolveAppZone | espera al perfil antes de decidir |  | Aprobada |
| 86 | resolveAppZone | muestra el error si el perfil no carga |  | Aprobada |
| 87 | resolveAppZone | lleva a la bienvenida si aún no hay modo |  | Aprobada |
| 88 | resolveAppZone | UC-01: sin la encuesta no entra a las pestañas, aunque la cuenta ya tuviera modo «tradicional» | UC-01 | Aprobada |
| 89 | resolveAppZone | con la encuesta respondida y el plan confirmado entra a las pestañas |  | Aprobada |

### `mobile/src/zonas/cuestionario/logica/__tests__/form-rules.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 90 | alternarSeleccion | agrega y quita valores |  | Aprobada |
| 91 | alternarSeleccion | con el máximo elegido, el nuevo reemplaza al primero que se eligió |  | Aprobada |
| 92 | alternarArea | al quitar un área descarta sus objetivos |  | Aprobada |
| 93 | alternarArea | un plan es de un área: elegir otra la reemplaza y descarta sus objetivos |  | Aprobada |
| 94 | alternarArea | la encuesta inicial tiene 5 preguntas; un plan con perfil, 2; sin perfil, las 7 |  | Aprobada |
| 95 | alternarArea | la encuesta inicial no pregunta área ni objetivos (UC-01) | UC-01 | Aprobada |
| 96 | alternarArea | un paso fuera del recorrido se acota |  | Aprobada |
| 97 | alternarObjetivo | un tercer objetivo reemplaza al primero elegido |  | Aprobada |
| 98 | pasoCompleto y respuestasCompletas | cada paso pide su respuesta |  | Aprobada |
| 99 | pasoCompleto y respuestasCompletas | el perfil está completo sin área ni objetivos |  | Aprobada |
| 100 | pasoCompleto y respuestasCompletas | devuelve las respuestas solo si todo está completo |  | Aprobada |
| 101 | leerPaso | acepta 1 a 7 y regresa al 1 con valores raros |  | Aprobada |
| 102 | P5 por día y P6 con varias respuestas | un botón general marca el momento en los 7 días y, si ya estaba, lo quita de todos |  | Aprobada |
| 103 | P5 por día y P6 con varias respuestas | se pueden elegir varios momentos y quedan en orden del día |  | Aprobada |
| 104 | P5 por día y P6 con varias respuestas | la cuadrícula cambia un solo día y entonces ya no es igual todos los días |  | Aprobada |
| 105 | P5 por día y P6 con varias respuestas | la P5 está completa con al menos un momento en algún día; la P6, con al menos uno |  | Aprobada |
| 106 | P5 por día y P6 con varias respuestas | la P6 no tiene tope: se pueden marcar los seis |  | Aprobada |

### `mobile/src/zonas/cuestionario/logica/__tests__/retomar.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 107 | retomar el formulario | en el paso 3: Empezar y los pasos 1 a 3 (UC-01: ya no hay elección de modo) | UC-01 | Aprobada |
| 108 | retomar el formulario | en la revisión: las 5 preguntas del perfil y la revisión al final |  | Aprobada |

### `mobile/src/zonas/enfoque/logica/__tests__/enfoque.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 109 | modo enfoque | ofrece sesiones de 15, 25 y 45 minutos |  | Aprobada |
| 110 | modo enfoque | la sesión dura lo elegido y luego termina sola |  | Aprobada |
| 111 | modo enfoque | CP-15/16: durante la sesión no queda ningún aviso propio; después sí | CP-15/16 | Aprobada |
| 112 | modo enfoque | el contador muestra mm:ss y no baja de 00:00 |  | Aprobada |

### `mobile/src/zonas/enfoque/logica/__tests__/no-molestar.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 113 | No Molestar del modo enfoque | CP-15: Android con permiso pasa a No Molestar y al terminar vuelve al estado previo | CP-15 | Aprobada |
| 114 | No Molestar del modo enfoque | CP-15: si ya tenía un filtro propio, al terminar regresa a ese mismo | CP-15 | Aprobada |
| 115 | No Molestar del modo enfoque | CP-16: Android sin permiso no cambia nada y pide guiar a darlo | CP-16 | Aprobada |
| 116 | No Molestar del modo enfoque | CP-16: en iOS nunca se intenta, aunque hubiera un control | CP-16 | Aprobada |
| 117 | No Molestar del modo enfoque | sin el módulo nativo (Expo Go) solo queda la guía manual |  | Aprobada |

### `mobile/src/zonas/habitos/logica/__tests__/borrador-habito.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 118 | borrador del asistente de hábito | se retoma el de la misma cuenta, con su paso y lo escrito |  | Aprobada |
| 119 | borrador del asistente de hábito | no hay borrador si no existe o es de otra cuenta |  | Aprobada |
| 120 | borrador del asistente de hábito | dura 7 días |  | Aprobada |
| 121 | borrador del asistente de hábito | una fecha de inicio pasada pasa a hoy y un fin anterior se quita |  | Aprobada |
| 122 | borrador del asistente de hábito | una fecha de inicio futura se respeta |  | Aprobada |

### `mobile/src/zonas/habitos/logica/__tests__/esquema-habito.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 123 | asistente de hábito | limpia y convierte los valores |  | Aprobada |
| 124 | asistente de hábito | pide categoría y al menos un día |  | Aprobada |
| 125 | asistente de hábito | valida el largo del nombre |  | Aprobada |
| 126 | asistente de hábito | acepta la duración 0 (0 es «Sin duración fija») |  | Aprobada |
| 127 | asistente de hábito | acepta la duración 25 (0 es «Sin duración fija») |  | Aprobada |
| 128 | asistente de hábito | acepta la duración 1439 (0 es «Sin duración fija») |  | Aprobada |
| 129 | asistente de hábito | rechaza la duración -1 |  | Aprobada |
| 130 | asistente de hábito | rechaza la duración 1440 |  | Aprobada |
| 131 | asistente de hábito | rechaza la duración 1.5 |  | Aprobada |
| 132 | asistente de hábito | sin recordatorio no necesita hora; con aviso sí, salvo el flexible del plan |  | Aprobada |
| 133 | asistente de hábito | la fecha de fin no puede ser anterior a la de inicio |  | Aprobada |
| 134 | CP-05 (RF-01): recordatorio sin hora | no se guarda, el error queda en el campo hora y el mensaje es claro y sin culpa | CP-05, RF-01 | Aprobada |
| 135 | límites de texto (decisión del usuario: 30 y 100) | al crear, 30 para el nombre y 100 para la descripción |  | Aprobada |
| 136 | límites de texto (decisión del usuario: 30 y 100) | al editar, un texto más largo se respeta pero no crece |  | Aprobada |
| 137 | límites de texto (decisión del usuario: 30 y 100) | los mensajes dicen el límite |  | Aprobada |
| 138 | candado mínimo al ajustar (RR-03) | CP-14: 0 días y 0 minutos no se guardan y se explica el mínimo con tono compasivo | RR-03, CP-14 | Aprobada |
| 139 | candado mínimo al ajustar (RR-03) | CP-12: bajar de 20 a 10 min en lunes, miércoles y viernes sí se guarda | RR-03, CP-12 | Aprobada |
| 140 | candado mínimo al ajustar (RR-03) | al crear (sin mínimo) se puede elegir «Sin duración fija» | RR-03 | Aprobada |

### `mobile/src/zonas/habitos/logica/__tests__/fechas.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 141 | fechas del asistente | cuenta los días de cada mes, con febrero bisiesto |  | Aprobada |
| 142 | fechas del asistente | deduce el año: la próxima vez que ocurre a partir de la mínima |  | Aprobada |
| 143 | fechas del asistente | ajusta el día al último del mes si no existe |  | Aprobada |
| 144 | fechas del asistente | formatea y separa la fecha |  | Aprobada |

### `mobile/src/zonas/habitos/logica/__tests__/formato.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 145 | texto de la tarjeta de un hábito | muestra días, hora corta y duración |  | Aprobada |
| 146 | texto de la tarjeta de un hábito | los 7 días y el aviso flexible |  | Aprobada |
| 147 | texto de la tarjeta de un hábito | sin duración definida, no la muestra |  | Aprobada |
| 148 | texto de la duración | minutos, horas y horas con minutos |  | Aprobada |
| 149 | texto de la duración | 0 es «Sin duración fija» |  | Aprobada |

### `mobile/src/zonas/habitos/logica/__tests__/habitos-del-dia.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 150 | hábitos del día (Hoy) | incluye solo los programados para ese día de la semana |  | Aprobada |
| 151 | hábitos del día (Hoy) | omite pausados y archivados |  | Aprobada |
| 152 | hábitos del día (Hoy) | usa el horario vigente en la fecha |  | Aprobada |
| 153 | hábitos del día (Hoy) | no muestra hábitos cuyo horario empieza después |  | Aprobada |
| 154 | hábitos del día (Hoy) | marca como hecho solo con un registro vigente de esa fecha |  | Aprobada |
| 155 | hábitos del día (Hoy) | respeta las reprogramaciones: sale del día original y llega al nuevo |  | Aprobada |
| 156 | hábitos del día (Hoy) | ordena por hora y deja los flexibles al final |  | Aprobada |
| 157 | horario de referencia (mostrar y editar) | usa el vigente, o el próximo si no empieza, o el último si terminó |  | Aprobada |

### `mobile/src/zonas/habitos/logica/__tests__/horario.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 158 | editar horario (versionado, SDD 4) | sin cambios no hace nada (la hora de Postgres trae segundos) |  | Aprobada |
| 159 | editar horario (versionado, SDD 4) | si cambia el patrón de un hábito ya empezado, cierra ayer y crea otro desde hoy |  | Aprobada |
| 160 | editar horario (versionado, SDD 4) | cambiar solo la fecha de fin no crea otra versión |  | Aprobada |
| 161 | editar horario (versionado, SDD 4) | un hábito que todavía no empieza se edita en su lugar, incluida la fecha de inicio |  | Aprobada |
| 162 | editar horario (versionado, SDD 4) | la fecha de inicio de un hábito ya empezado no cambia |  | Aprobada |
| 163 | editar horario (versionado, SDD 4) | sin recordatorio: sin hora y sin aviso; un flexible con aviso sigue flexible |  | Aprobada |

### `mobile/src/zonas/habitos/logica/__tests__/limite-habitos.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 164 | límite de hábitos del usuario guiado | empieza con 3 |  | Aprobada |
| 165 | límite de hábitos del usuario guiado | suma 1 por cada subida de nivel del plan |  | Aprobada |
| 166 | límite de hábitos del usuario guiado | sin límite con el plan desbloqueado o en modo tradicional |  | Aprobada |
| 167 | límite de hábitos del usuario guiado | se alcanza al tener tantos activos como el límite |  | Aprobada |

### `mobile/src/zonas/habitos/logica/__tests__/presupuesto.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 168 | presupuesto diario (SDD 6.5) | suma los minutos de cada día de la semana |  | Aprobada |
| 169 | presupuesto diario (SDD 6.5) | sin hábitos no hay minutos |  | Aprobada |
| 170 | presupuesto diario (SDD 6.5) | si un día supera el presupuesto, sube a la suma real |  | Aprobada |
| 171 | presupuesto diario (SDD 6.5) | igualar el presupuesto no lo excede |  | Aprobada |
| 172 | límite de duración de un hábito del plan | es el tiempo diario entre los hábitos del plan |  | Aprobada |
| 173 | límite de duración de un hábito del plan | nunca baja de lo que el hábito ya tiene |  | Aprobada |
| 174 | límite de duración de un hábito del plan | sin hábitos contados, todo el tiempo diario |  | Aprobada |
| 175 | límite del tiempo diario en Perfil | es de 8 h |  | Aprobada |
| 176 | límite del tiempo diario en Perfil | respeta un tiempo que ya subió por encima de 8 h |  | Aprobada |

### `mobile/src/zonas/habitos/logica/__tests__/valores-formulario.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 177 | valores de un hábito nuevo | empieza sin duración fija (0), todos los días y sin recordatorio |  | Aprobada |

### `mobile/src/zonas/habitos/presentacion/__tests__/PantallaVerHabito.test.tsx`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 178 | PantallaVerHabito | muestra los datos y los micro-pasos, sin abrir la edición |  | Aprobada |
| 179 | PantallaVerHabito | si el hábito ya no existe lo dice sin error |  | Aprobada |

### `mobile/src/zonas/habitos/presentacion/__tests__/use-check-in.test.tsx`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 180 | check-in de un micro-paso | CP-07: la moneda «+10» aparece en menos de 1.5 s y se quita sola | CP-07 | Aprobada |
| 181 | check-in de un micro-paso | CP-09: celebra el 50 % a los 5 de 10 y el 80 % a los 8 de 10, sin reiniciar | CP-09 | Aprobada |
| 182 | check-in de un micro-paso | CP-09: la celebración muestra el hito y el indicador, con vibración y sonido | CP-09 | Aprobada |

### `mobile/src/zonas/habitos/presentacion/componentes/__tests__/DialogoAgregarHabito.test.tsx`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 183 | DialogoAgregarHabito | explica las dos opciones y marca micro-pasos como recomendada |  | Aprobada |
| 184 | DialogoAgregarHabito | cada opción lleva a su camino y «Cancelar» cierra |  | Aprobada |

### `mobile/src/zonas/planes/datos/__tests__/repositorioMetas.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 185 | descomponerMeta | envía el texto y el área y devuelve la propuesta |  | Aprobada |
| 186 | descomponerMeta | sin conexión lo dice (generar necesita internet) |  | Aprobada |
| 187 | descomponerMeta | una meta no apropiada o la IA caída traen el mensaje del backend |  | Aprobada |
| 188 | descomponerMeta | cualquier otro error es genérico (sin texto técnico) |  | Aprobada |

### `mobile/src/zonas/planes/logica/__tests__/detalle-plan.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 189 | detalle del plan | «Cómo vas» cuenta los hábitos del plan en las últimas 2 semanas |  | Aprobada |
| 190 | detalle del plan | con menos de 4 días programados es pronto para medir |  | Aprobada |
| 191 | detalle del plan | no cuenta hoy ni lo de hace más de 2 semanas |  | Aprobada |
| 192 | detalle del plan | días para la revisión: desde la última o desde el inicio, nunca negativos |  | Aprobada |

### `mobile/src/zonas/planes/logica/__tests__/plan-engine.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 193 | generarPlan | crea un hábito por objetivo, con su categoría, días y hora del momento elegido |  | Aprobada |
| 194 | generarPlan | «mantiene» empieza en nivel 2 si cabe en el presupuesto |  | Aprobada |
| 195 | generarPlan | un hábito sin duración no gasta del tiempo diario |  | Aprobada |
| 196 | generarPlan | un plan nuevo se acomoda en el tiempo que dejan libre los hábitos que ya tiene |  | Aprobada |
| 197 | generarPlan | baja de nivel cuando la duración no cabe |  | Aprobada |
| 198 | generarPlan | con un solo objetivo usa todo el presupuesto como máximo |  | Aprobada |
| 199 | generarPlan | «poco_tiempo» usa la duración reducida |  | Aprobada |
| 200 | generarPlan | el momento fijo del catálogo gana sobre la P5 |  | Aprobada |
| 201 | generarPlan | «varia» deja el aviso flexible, salvo con momento fijo |  | Aprobada |
| 202 | generarPlan | P5 con varios momentos: cada hábito toma uno distinto para no amontonar los avisos |  | Aprobada |
| 203 | generarPlan | P5 por día: los días del hábito se mueven a los días con un rato libre |  | Aprobada |
| 204 | generarPlan | P5 que cambia según el día (sin momento común): el aviso es flexible |  | Aprobada |
| 205 | generarPlan | P6 con varias respuestas: aplica todas (versión corta, sin equipo) y las guarda |  | Aprobada |
| 206 | generarPlan | con el estilo «minimo» los hábitos no avisan por defecto |  | Aprobada |
| 207 | generarPlan | falla con un mensaje claro si el catálogo no tiene la fila |  | Aprobada |
| 208 | segundo aviso (precedencia P7/P6, SDD 5.6) | olvido + recordatorio_suave + manana → true |  | Aprobada |
| 209 | segundo aviso (precedencia P7/P6, SDD 5.6) | olvido + recordatorio_y_animo + noche → true |  | Aprobada |
| 210 | segundo aviso (precedencia P7/P6, SDD 5.6) | olvido + minimo + manana → false |  | Aprobada |
| 211 | segundo aviso (precedencia P7/P6, SDD 5.6) | olvido + resumen_nocturno + manana → false |  | Aprobada |
| 212 | segundo aviso (precedencia P7/P6, SDD 5.6) | olvido + recordatorio_suave + varia → false |  | Aprobada |
| 213 | segundo aviso (precedencia P7/P6, SDD 5.6) | sin «olvido» no hay segundo aviso |  | Aprobada |
| 214 | elegirFilaCatalogo | con «recursos» usa la variante sin recursos si la base necesita equipo |  | Aprobada |
| 215 | elegirFilaCatalogo | si la base ya es sin recursos, la usa |  | Aprobada |
| 216 | alternativasDeNivel | trae los niveles más bajos de cada hábito para «Bajar nivel» |  | Aprobada |
| 217 | alternativasDeNivel | un hábito de nivel 1 no tiene alternativas |  | Aprobada |
| 218 | textos de la IA | el mensaje solo lleva claves y números, sin datos personales |  | Aprobada |
| 219 | textos de la IA | cambia solo títulos y descripciones; los números siguen siendo del motor |  | Aprobada |

### `mobile/src/zonas/planes/logica/__tests__/plan-format.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 220 | textos de la tarjeta del plan | muestra duración, días y hora |  | Aprobada |
| 221 | textos de la tarjeta del plan | con aviso flexible muestra la ventana |  | Aprobada |
| 222 | textos de la tarjeta del plan | un hábito sin duración dice «Sin duración fija» |  | Aprobada |
| 223 | textos de la tarjeta del plan | los 7 días se leen como «Todos los días» |  | Aprobada |

### `mobile/src/zonas/planes/logica/__tests__/plan-review.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 224 | revisión del plan | cambiar la hora deja el aviso fijo y no toca el resto |  | Aprobada |
| 225 | revisión del plan | bajar nivel usa la versión anterior y conserva la hora elegida |  | Aprobada |
| 226 | revisión del plan | en el nivel 1 no se puede bajar más |  | Aprobada |
| 227 | revisión del plan | se puede quitar un hábito, pero el plan conserva al menos uno |  | Aprobada |
| 228 | revisión del plan | el interruptor cambia el segundo aviso |  | Aprobada |
| 229 | cuándo se muestra el interruptor «Segundo aviso» (SDD 5.6) | olvido + recordatorio_suave + manana → true |  | Aprobada |
| 230 | cuándo se muestra el interruptor «Segundo aviso» (SDD 5.6) | olvido + minimo + manana → true |  | Aprobada |
| 231 | cuándo se muestra el interruptor «Segundo aviso» (SDD 5.6) | olvido + resumen_nocturno + manana → false |  | Aprobada |
| 232 | cuándo se muestra el interruptor «Segundo aviso» (SDD 5.6) | olvido + recordatorio_suave + varia → false |  | Aprobada |
| 233 | cuándo se muestra el interruptor «Segundo aviso» (SDD 5.6) | motivacion + recordatorio_suave + manana → false |  | Aprobada |
| 234 |  | la nota de apoyo profesional solo aparece con «manejar_estres» |  | Aprobada |
| 235 |  | convierte entre la hora "HH:MM" y la fecha del selector |  | Aprobada |
| 236 | agregar y editar hábitos en la revisión | las sugerencias omiten los objetivos que ya están en el plan |  | Aprobada |
| 237 | agregar y editar hábitos en la revisión | pagina de 4 en 4 y vuelve al principio |  | Aprobada |
| 238 | agregar y editar hábitos en la revisión | agrega hasta 3 hábitos y no repite objetivos |  | Aprobada |
| 239 | agregar y editar hábitos en la revisión | si se pasa del tiempo diario, este sube a la suma del día más cargado |  | Aprobada |
| 240 | agregar y editar hábitos en la revisión | editar cambia nombre, días, hora y aviso; sin hora conserva la anterior |  | Aprobada |

### `mobile/src/zonas/planes/logica/__tests__/plan-rows.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 241 | filas que se guardan al pulsar «Empezar» | liga plan, hábitos y horarios con los ids del cliente |  | Aprobada |
| 242 | filas que se guardan al pulsar «Empezar» | guarda un plan por área, con sus objetivos y el historial |  | Aprobada |
| 243 | filas que se guardan al pulsar «Empezar» | un horario flexible se guarda sin hora |  | Aprobada |
| 244 | filas que se guardan al pulsar «Empezar» | sin permiso de avisos, los hábitos se guardan sin recordatorio |  | Aprobada |
| 245 | filas que se guardan al pulsar «Empezar» | guarda los ajustes y las respuestas con la versión del formulario |  | Aprobada |
| 246 | filas que se guardan al pulsar «Empezar» | guarda la secuencia de micro-pasos y en qué paso va cada hábito |  | Aprobada |
| 247 | filas que se guardan al pulsar «Empezar» | un hábito quitado en la revisión no se guarda |  | Aprobada |
| 248 |  | fechaLocal usa la fecha del teléfono |  | Aprobada |

### `mobile/src/zonas/planes/logica/__tests__/respuestas-plan.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 249 | respuestas de un plan | usa el área, los objetivos y el historial del plan, y lo global del usuario |  | Aprobada |
| 250 | respuestas de un plan | sin respuestas propias, filtra los objetivos globales por el área |  | Aprobada |

### `mobile/src/zonas/planes/logica/__tests__/sugerencias-plan.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 251 | sugerencias para agregar un hábito al plan | trae las 3 versiones de cada meta libre, primero las más ligeras |  | Aprobada |
| 252 | sugerencias para agregar un hábito al plan | no sugiere metas de otras áreas |  | Aprobada |

### `mobile/src/zonas/planes/logica/__tests__/tiempo-libre.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 253 | plan nuevo en el tiempo libre | cabe: no hay exceso |  | Aprobada |
| 254 | plan nuevo en el tiempo libre | se suma día por día y avisa lo que pasa el día más cargado |  | Aprobada |
| 255 | plan nuevo en el tiempo libre | sin hábitos todavía, solo cuenta el plan |  | Aprobada |

### `mobile/src/zonas/planes/presentacion/__tests__/PantallaCrearMeta.test.tsx`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 256 | PantallaCrearMeta | CP-01: descompone la meta en una lista ordenada y guarda la secuencia desde el paso 1 | CP-01 | Aprobada |
| 257 | PantallaCrearMeta | CP-02: con la meta vacía no pide micro-pasos, avisa con tono neutro y conserva lo capturado | CP-02 | Aprobada |
| 258 | PantallaCrearMeta | UC-01: sin el perfil de la encuesta no se generan micro-pasos y se invita a responderla | UC-01 | Aprobada |
| 259 | PantallaCrearMeta | UC-01 → UC-02: recién hecha la encuesta invita a su primer hábito y deja dejarlo para después | UC-01, UC-02 | Aprobada |

### `mobile/src/zonas/planes/presentacion/componentes/__tests__/ListaMicroPasos.test.tsx`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 260 | ListaMicroPasos | muestra los pasos en orden y anuncia el estado de cada uno con texto |  | Aprobada |
| 261 | ListaMicroPasos | si el hábito va en versión ligera, el paso en curso muestra sus minutos reales |  | Aprobada |
| 262 | ListaMicroPasos | RF-16: el paso en curso muestra cuántas veces lleva de 10 | RF-16 | Aprobada |
| 263 | ListaMicroPasos | sin secuencia no muestra nada |  | Aprobada |

### `mobile/src/zonas/plantas/logica/__tests__/equipar.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 264 | equipar accesorios (SDD 6.4) | ponerlo en una planta quita el otro del mismo tipo, no los de otro tipo |  | Aprobada |
| 265 | equipar accesorios (SDD 6.4) | el mismo objeto puede ir en otra planta sin dejar la primera |  | Aprobada |
| 266 | equipar accesorios (SDD 6.4) | reemplaza solo en esa planta: el otro sigue en las demás |  | Aprobada |
| 267 | equipar accesorios (SDD 6.4) | quitarlo de una planta no lo quita de las otras |  | Aprobada |
| 268 | equipar accesorios (SDD 6.4) | sin cambios si ya está (o ya no está) en esa planta |  | Aprobada |
| 269 | planta para «Equipar ahora» (SDD 9.4) | usa la planta de origen, aunque ya lleve ese tipo y no tenga hábitos |  | Aprobada |
| 270 | planta para «Equipar ahora» (SDD 9.4) | sin origen, prefiere la primera con hábitos y ese tipo libre |  | Aprobada |
| 271 | planta para «Equipar ahora» (SDD 9.4) | si todas las que tienen hábitos llevan ese tipo, usa la primera con hábitos |  | Aprobada |
| 272 | planta para «Equipar ahora» (SDD 9.4) | sin hábitos, usa la primera con ese tipo libre |  | Aprobada |
| 273 | planta para «Equipar ahora» (SDD 9.4) | si ninguna tiene hábitos ni el tipo libre, usa la primera |  | Aprobada |
| 274 | planta para «Equipar ahora» (SDD 9.4) | salta las plantas que ya llevan ese objeto; si todas lo llevan, elige entre todas |  | Aprobada |
| 275 | planta para «Equipar ahora» (SDD 9.4) | un origen que ya no existe se ignora, y sin plantas devuelve null |  | Aprobada |

### `mobile/src/zonas/plantas/logica/__tests__/estado-objeto.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 276 | estado de un objeto en la Tienda (SDD 6.4) | con saldo suficiente es comprable y dice cuánto queda |  | Aprobada |
| 277 | estado de un objeto en la Tienda (SDD 6.4) | con el saldo exacto también se puede comprar |  | Aprobada |
| 278 | estado de un objeto en la Tienda (SDD 6.4) | sin saldo suficiente dice cuánto falta |  | Aprobada |
| 279 | estado de un objeto en la Tienda (SDD 6.4) | lo que ya es tuyo no se vuelve a ofrecer, tengas o no saldo |  | Aprobada |
| 280 | estado de una fase en Detalles (SDD 9.4) | distingue la actual, las alcanzadas y las bloqueadas |  | Aprobada |
| 281 | estado de una fase en Detalles (SDD 9.4) | una fase vuelve a bloquearse si la planta regresa de fase |  | Aprobada |

### `mobile/src/zonas/plantas/logica/__tests__/hitos.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 282 | hitos del micro-paso | CP-09: a los 5 de 10 es el hito del 50 % y a los 8 de 10 el del 80 % | CP-09 | Aprobada |
| 283 | hitos del micro-paso | entre hitos no hay refuerzo |  | Aprobada |
| 284 | hitos del micro-paso | si se cruzan dos de golpe, se celebra el más alto |  | Aprobada |
| 285 | hitos del micro-paso | el avance no pasa de la meta |  | Aprobada |

### `mobile/src/zonas/plantas/logica/__tests__/planta-destacada.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 286 | planta destacada de Hoy (SDD 9.4) | elige la de fase más alta, aunque no tenga hábitos |  | Aprobada |
| 287 | planta destacada de Hoy (SDD 9.4) | en un empate prefiere una con hábitos |  | Aprobada |
| 288 | planta destacada de Hoy (SDD 9.4) | si el empate sigue, usa la primera según el orden de las áreas |  | Aprobada |
| 289 | planta destacada de Hoy (SDD 9.4) | sin plantas devuelve null |  | Aprobada |
| 290 | planta destacada de Hoy (SDD 9.4) | la que eligió en el Jardín gana aunque otra esté más avanzada |  | Aprobada |

### `mobile/src/zonas/plantas/logica/__tests__/recompensas.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 291 | nivel y fase (SDD 6.1) | 4 XP por nivel, fase 2 desde el 15 y fase 3 en el 30 |  | Aprobada |
| 292 | nivel y fase (SDD 6.1) | el XP no baja de 0 |  | Aprobada |
| 293 | completar | el primero da XP y monedas |  | Aprobada |
| 294 | completar | un segundo hábito de la misma planta da monedas pero no XP |  | Aprobada |
| 295 | completar | el XP de otra planta no cuenta para el tope |  | Aprobada |
| 296 | completar | el sexto del día ya no da monedas |  | Aprobada |
| 297 | completar | en nivel 30 no suma XP y avisa el cambio de fase al llegar |  | Aprobada |
| 298 | CP-07 (RF-08): recompensa al completar un micro-paso | «Abrir el libro» da XP a la planta y monedas al instante, y queda registrado en el log | CP-07, RF-08 | Aprobada |
| 299 | deshacer | revierte y transfiere XP y monedas al que se quedó sin ellos |  | Aprobada |
| 300 | deshacer | si ya se gastaron las monedas, el saldo queda en 0 |  | Aprobada |
| 301 | deshacer | deshacer el hábito que cambió la fase la regresa |  | Aprobada |
| 302 | deshacer | sin registro activo no cambia nada |  | Aprobada |
| 303 | protección de monedas (SDD 6.1) | el ciclo marcar, gastar, desmarcar y volver a marcar paga solo una vez |  | Aprobada |
| 304 | protección de monedas (SDD 6.1) | desmarcar con saldo devuelve todo y volver a marcar paga igual |  | Aprobada |
| 305 | protección de monedas (SDD 6.1) | sin devolución completa no se transfiere a otro registro |  | Aprobada |
| 306 | protección de monedas (SDD 6.1) | el tope cuenta los pagos no devueltos |  | Aprobada |
| 307 | protección de monedas (SDD 6.1) | eliminar devuelve lo que alcance y el pago sigue contando |  | Aprobada |
| 308 | protección de monedas (SDD 6.1) | eliminar un hábito sin marcar no cambia nada |  | Aprobada |

### `mobile/src/zonas/progreso/logica/__tests__/cumplimiento.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 309 | ocurrencias para estadísticas | cuenta los días del patrón desde el inicio, con hecho o no hecho |  | Aprobada |
| 310 | ocurrencias para estadísticas | hoy solo suma si ya se hizo |  | Aprobada |
| 311 | ocurrencias para estadísticas | una movida cuenta en su fecha nueva y no en la original; una descartada cuenta como no hecha |  | Aprobada |
| 312 | ocurrencias para estadísticas | RF-17: una descartada con barrera no cuenta (no queda como fallo) | RF-17 | Aprobada |
| 313 | ocurrencias para estadísticas | un archivado cuenta hasta el día anterior a archivarlo |  | Aprobada |
| 314 | ocurrencias para estadísticas | uno en pausa cuenta hasta su último registro |  | Aprobada |
| 315 | ocurrencias para estadísticas | RF-09: los días en pausa no cuentan como fallo, ni después de reanudar | RF-09 | Aprobada |
| 316 | ocurrencias para estadísticas | RF-09: con la pausa abierta, desde que empezó ya nada cuenta | RF-09 | Aprobada |
| 317 | ocurrencias para estadísticas | RF-09: pausar y reanudar el mismo día deja una pausa vacía | RF-09 | Aprobada |
| 318 | ocurrencias para estadísticas | un registro deshecho no cuenta como hecho |  | Aprobada |
| 319 | ocurrencias para estadísticas | sin horarios no hay historial |  | Aprobada |
| 320 | resumen del periodo | cuenta el total y cada día de la semana |  | Aprobada |
| 321 | resumen del periodo | agrupa los hábitos por área, en el orden de las áreas |  | Aprobada |
| 322 | resumen del periodo | cada hábito trae su conteo del periodo y su racha de todo el historial |  | Aprobada |
| 323 | resumen del periodo | sin filtro ofrece las áreas con hábitos y no filtra |  | Aprobada |
| 324 | resumen del periodo | con un área, el conteo y las secciones son solo de esa área |  | Aprobada |
| 325 | resumen del periodo | un área sin hábitos en el periodo se ignora y se muestra todo |  | Aprobada |
| 326 | resumen del periodo | un archivado sin días en el periodo no se lista; con días, sí |  | Aprobada |
| 327 | estados por día | pasado hecho o sin marcar, hoy pendiente y futuro «te toca»; la movida lleva su marca |  | Aprobada |
| 328 | estados por día | uno en pausa solo tiene días hasta su último registro |  | Aprobada |
| 329 | estados por día | el rango no empieza antes del primer horario |  | Aprobada |
| 330 | estados por día | lo de un día, con su área y su estado |  | Aprobada |

### `mobile/src/zonas/progreso/logica/__tests__/periodos.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 331 | periodos de Progreso | la semana va de lunes a domingo y se parte en días |  | Aprobada |
| 332 | periodos de Progreso | la semana anterior cruza de mes y de año sin desfasarse |  | Aprobada |
| 333 | periodos de Progreso | el mes se parte en semanas recortadas a sus límites |  | Aprobada |
| 334 | periodos de Progreso | los meses anteriores cambian de año |  | Aprobada |
| 335 | periodos de Progreso | el año se parte en 12 meses |  | Aprobada |
| 336 | periodos de Progreso | se puede ir atrás hasta el primer horario y adelante hasta el actual |  | Aprobada |
| 337 | tira de días y calendario | la tira va por semanas de lunes a domingo, del primer horario a la de hoy + 7 |  | Aprobada |
| 338 | tira de días y calendario | cruza de mes y de año, con un año atrás como máximo |  | Aprobada |
| 339 | tira de días y calendario | al cambiar de semana se queda el mismo día de la semana |  | Aprobada |
| 340 | tira de días y calendario | el calendario del mes va de lunes a domingo con huecos |  | Aprobada |

### `mobile/src/zonas/progreso/logica/__tests__/rachas.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 341 | avance acumulado por hábito | cuenta todas las veces completadas; un día sin hacerlo no resta |  | Aprobada |
| 342 | avance acumulado por hábito | nunca vuelve a 0: fallar al final no borra lo logrado |  | Aprobada |
| 343 | avance acumulado por hábito | el texto es igual para todos y no menciona rachas rotas |  | Aprobada |
| 344 | avance acumulado por hábito | la píldora muestra el total; sin ninguna, no hay píldora |  | Aprobada |

### `mobile/src/zonas/progreso/logica/__tests__/texto-periodo.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 345 | nombres de los periodos | semana, mes y año |  | Aprobada |
| 346 | nombres de los periodos | las etiquetas de la semana marcan hoy y los días futuros |  | Aprobada |
| 347 | nombres de los periodos | las del mes son rangos de días; las del año, meses |  | Aprobada |
| 348 | resumen en texto | cuenta lo hecho, sin porcentajes, y cambia el tiempo en periodos pasados |  | Aprobada |
| 349 | resumen en texto | sin nada que contar, un texto amable |  | Aprobada |
| 350 | resumen en texto | el detalle para TalkBack nombra cada división |  | Aprobada |
| 351 | textos de Diario | fichas: «Hoy» y el día corto |  | Aprobada |
| 352 | textos de Diario | frases de hoy, de un día pasado y de uno futuro |  | Aprobada |
| 353 | textos de Diario | encabezados de la semana con letra y número |  | Aprobada |
| 354 | rango de la tira | una semana en un mes o entre dos |  | Aprobada |
| 355 | rango de la tira | una semana de un solo día dice el día, no «1–1» |  | Aprobada |

### `mobile/src/zonas/reajuste/logica/__tests__/barreras.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 356 | lista de barreras | pregunta con máximo 3 opciones |  | Aprobada |
| 357 | lista de barreras | CP-13: con falta de tiempo, la versión ligera va primero | CP-13 | Aprobada |
| 358 | lista de barreras | si faltó algo o no se pudo llegar, otro día va primero |  | Aprobada |
| 359 | lista de barreras | sin día libre ni versión más ligera no ofrece nada (queda «Dejarlo así») |  | Aprobada |
| 360 | lista de barreras | mover lleva el primer día libre |  | Aprobada |

### `mobile/src/zonas/reajuste/logica/__tests__/introspeccion.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 361 | introspección por valores | RF-04: de 1 a 3 preguntas, cada una con su texto | RF-04 | Aprobada |
| 362 | introspección por valores | CP-10: la escala va de 1 a 5 | CP-10 | Aprobada |
| 363 | introspección por valores | nunca usa palabras clínicas ni de diagnóstico |  | Aprobada |
| 364 | introspección por valores | la semanal toca a los 7 días de la última o del primer uso |  | Aprobada |

### `mobile/src/zonas/reajuste/logica/__tests__/meta-intermedia.test.tsx`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 365 | CP-11: meta intermedia | al aplicarla solo cambia el hábito; el historial no se toca | CP-11 | Aprobada |

### `mobile/src/zonas/reajuste/logica/__tests__/progresion.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 366 | cuándo se revisa | cada 7 días desde la última revisión o desde el inicio del plan |  | Aprobada |
| 367 | ventana de cumplimiento | últimos 14 días hasta ayer; hoy no cuenta |  | Aprobada |
| 368 | ventana de cumplimiento | con 1 o 2 días por semana usa 28 días |  | Aprobada |
| 369 | ventana de cumplimiento | solo cuenta desde el último cambio de nivel |  | Aprobada |
| 370 | ventana de cumplimiento | con menos de 4 ocurrencias no se evalúa |  | Aprobada |
| 371 | tabla de 6.3 | 90 %: sube un nivel |  | Aprobada |
| 372 | tabla de 6.3 | 85 % justo sube; 84 % se mantiene |  | Aprobada |
| 373 | tabla de 6.3 | RF-15 (CP-11): 2 de 7 días (28 %) propone una meta intermedia | RF-15, CP-11 | Aprobada |
| 374 | tabla de 6.3 | RF-15: se mira solo la última semana, con el umbral de 40 % | RF-15 | Aprobada |
| 375 | tabla de 6.3 | en el nivel 1 baja a la versión corta; si ya la usa, solo apoyo |  | Aprobada |
| 376 | tabla de 6.3 | «Hacerlo más ligero» usa el mismo paso hacia abajo: nivel anterior, versión corta o nada |  | Aprobada |
| 377 | tabla de 6.3 | un hábito sin duración en el nivel 1 no tiene versión corta: solo apoyo |  | Aprobada |
| 378 | tabla de 6.3 | desde la versión corta, primero vuelve a la normal; con poco_tiempo sube de nivel |  | Aprobada |
| 379 | hábito nuevo y presupuesto | en el nivel 3 propone un hábito nuevo de tus áreas |  | Aprobada |
| 380 | hábito nuevo y presupuesto | con un plan por área, solo revisa los hábitos de ese plan |  | Aprobada |
| 381 | hábito nuevo y presupuesto | con un plan por área, el hábito nuevo solo se busca en esa área |  | Aprobada |
| 382 | hábito nuevo y presupuesto | si el siguiente nivel no cabe, propone un hábito nuevo; si tampoco cabe, «sin espacio» |  | Aprobada |
| 383 | hábito nuevo y presupuesto | no repite un objetivo que ya está en el plan |  | Aprobada |
| 384 | hábito nuevo y presupuesto | una sola propuesta de hábito nuevo por revisión |  | Aprobada |
| 385 | hábito nuevo y presupuesto | con el límite total de hábitos alcanzado no propone otro, salvo con una subida más |  | Aprobada |
| 386 | hábito nuevo y presupuesto | con 4 hábitos del plan no propone otro, salvo con el límite desbloqueado |  | Aprobada |
| 387 | hábito nuevo y presupuesto | los hábitos manuales nunca suben ni bajan |  | Aprobada |
| 388 | hábito nuevo y presupuesto | los pausados y archivados no se revisan |  | Aprobada |
| 389 | desbloqueo del límite | a los 90 días del plan con 85 % o más en los últimos 28 días |  | Aprobada |
| 390 | micro-pasos (RF-03) | subir va al siguiente micro-paso sin cambiar el nivel del plan | RF-03 | Aprobada |
| 391 | micro-pasos (RF-03) | la meta intermedia es el micro-paso anterior | RF-03 | Aprobada |
| 392 | micro-pasos (RF-03) | en el primer paso propone la versión reducida, con sus minutos en el título | RF-03 | Aprobada |
| 393 | micro-pasos (RF-03) | en el último paso no hay a dónde subir | RF-03 | Aprobada |
| 394 | micro-pasos (RF-03) | sin paso más ligero en la secuencia, ofrece pedírselo a la IA (modelo pequeño) | RF-03 | Aprobada |
| 395 | micro-pasos (RF-03) | candado mínimo: un paso de 1 minuto no tiene versión más corta, solo apoyo | RF-03 | Aprobada |
| 396 | candado mínimo (RR-03) | ningún reajuste deja menos de 2 minutos ni menos de 1 día (decisión del 24-nov) | RR-03 | Aprobada |
| 397 | candado mínimo (RR-03) | un recordatorio (0 min) sigue sin duración | RR-03 | Aprobada |

### `mobile/src/zonas/reajuste/logica/__tests__/reprogramar.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 398 | qué se ofrece reprogramar (SDD 6.2) | ofrece el día más reciente sin hacer y guarda los anteriores |  | Aprobada |
| 399 | qué se ofrece reprogramar (SDD 6.2) | no cuenta los días hechos |  | Aprobada |
| 400 | qué se ofrece reprogramar (SDD 6.2) | no vuelve a ofrecer días que ya tienen ocurrencia |  | Aprobada |
| 401 | qué se ofrece reprogramar (SDD 6.2) | un hábito que llegó movido y no se hizo no se vuelve a mover |  | Aprobada |
| 402 | qué se ofrece reprogramar (SDD 6.2) | omite en silencio los hábitos de los 7 días |  | Aprobada |
| 403 | qué se ofrece reprogramar (SDD 6.2) | no cuenta hoy ni los días antes de que empiece el hábito |  | Aprobada |
| 404 | qué se ofrece reprogramar (SDD 6.2) | no ofrece hábitos pausados |  | Aprobada |
| 405 | días libres | son los días fuera del patrón, de hoy a 7 días adelante |  | Aprobada |
| 406 | días libres | respeta la fecha de fin del hábito |  | Aprobada |
| 407 | días libres | salta los días a los que ya llega otra ocurrencia del mismo hábito |  | Aprobada |
| 408 | días libres | no pasa del tiempo diario |  | Aprobada |
| 409 | días libres | un hábito sin duración fija siempre cabe |  | Aprobada |
| 410 | propuestas | propone el primer día libre |  | Aprobada |
| 411 | propuestas | cuenta las propuestas anteriores para no pasar del tiempo diario |  | Aprobada |
| 412 | propuestas | sin días libres, la propuesta queda sin día |  | Aprobada |

### `mobile/src/zonas/reajuste/logica/__tests__/texto-dia.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 413 | nombre del día destino | en la tarjeta: a hoy, a mañana o al día con su número |  | Aprobada |
| 414 | nombre del día destino | en el aviso de éxito: para hoy, para mañana o para el día con su número |  | Aprobada |
| 415 | nombre del día destino | en el selector: Hoy, Mañana o el día corto |  | Aprobada |
| 416 | nombre del día destino | en la lista de barreras: ayer o el día con su número |  | Aprobada |

### `mobile/src/zonas/reajuste/presentacion/__tests__/meta-intermedia-tarjeta.test.tsx`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 417 | CP-11: tarjeta de la meta intermedia | se ofrece sin mensajes de fracaso y se aplica con un solo toque | CP-11 | Aprobada |

### `mobile/src/zonas/reajuste/presentacion/componentes/__tests__/DialogoIntrospeccion.test.tsx`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 418 | DialogoIntrospeccion | CP-10: responde con la escala 1–5, salta una y guarda al terminar | CP-10 | Aprobada |
| 419 | DialogoIntrospeccion | al pausar empieza recordando que pausar también es cuidarse |  | Aprobada |

### `mobile/src/zonas/reajuste/presentacion/componentes/__tests__/TarjetaBarreras.test.tsx`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 420 | TarjetaBarreras | pregunta qué se atravesó con 3 opciones y deja no decirlo |  | Aprobada |
| 421 | TarjetaBarreras | CP-13: con falta de tiempo ofrece la versión ligera en un toque | CP-13 | Aprobada |

### `mobile/src/zonas/recordatorios/logica/__tests__/agenda-dia.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 422 | diaIso | lunes es 1 y domingo es 7 |  | Aprobada |
| 423 | bloquesDelDia | solo los de ese día y ordenados por hora, aunque se hayan creado en otro orden |  | Aprobada |
| 424 | franjasDelDia | muestra lo ocupado y los ratos libres entre bloques, de 06:00 a 23:00 |  | Aprobada |
| 425 | franjasDelDia | un día sin bloques es un solo rato libre |  | Aprobada |
| 426 | franjasDelDia | bloques encimados no dejan un rato libre falso |  | Aprobada |
| 427 | cambioSoloUnDia | en un bloque de lunes a viernes, cambiar el miércoles lo separa y deja los demás igual |  | Aprobada |
| 428 | cambioSoloUnDia | si el bloque solo ocurre ese día, simplemente se edita |  | Aprobada |

### `mobile/src/zonas/recordatorios/logica/__tests__/agenda.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 429 | agenda de bloques ocupados | CP-04: 10:00 en la franja 10:00–11:00 se rechaza y se sugiere 11:00 | CP-04 | Aprobada |
| 430 | agenda de bloques ocupados | no choca en otro día ni fuera del bloque |  | Aprobada |
| 431 | agenda de bloques ocupados | el hábito no puede empezar justo antes y meterse al bloque |  | Aprobada |
| 432 | agenda de bloques ocupados | salta bloques seguidos hasta la primera hora libre |  | Aprobada |
| 433 | agenda de bloques ocupados | si ya no cabe ese día no sugiere nada |  | Aprobada |
| 434 | agenda de bloques ocupados | valida nombre, días y que el fin sea después del inicio |  | Aprobada |
| 435 | D-04: al guardar un bloque se revisan los recordatorios que ya existían | encuentra el que quedó dentro del bloque y le sugiere la primera hora libre | D-04 | Aprobada |
| 436 | D-04: al guardar un bloque se revisan los recordatorios que ya existían | sin choques no hay nada que revisar | D-04 | Aprobada |

### `mobile/src/zonas/recordatorios/logica/__tests__/aviso-motivacional.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 437 | aviso motivacional | cuenta los días seguidos hasta hoy |  | Aprobada |
| 438 | aviso motivacional | CP-08: a los 3 días seguidos toca avisar | CP-08 | Aprobada |
| 439 | aviso motivacional | máximo un aviso al día |  | Aprobada |

### `mobile/src/zonas/recordatorios/logica/__tests__/historial-plan.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 440 | apoyo de las semanas 3 y 4 con varios planes | cada plan usa su historial; si no tiene, el global |  | Aprobada |
| 441 | apoyo de las semanas 3 y 4 con varios planes | toca si algún plan está en su semana 3 o 4 |  | Aprobada |

### `mobile/src/zonas/recordatorios/logica/__tests__/permiso.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 442 | siguientePaso | con el permiso dado no hay nada que hacer |  | Aprobada |
| 443 | siguientePaso | sin permiso, se pregunta si Android lo deja |  | Aprobada |
| 444 | siguientePaso | si Android ya no deja preguntar, se manda a Ajustes |  | Aprobada |
| 445 | alarmas exactas (RF-01: el aviso llega a su hora) | en Android sin el permiso se explica una vez por sesión | RF-01 | Aprobada |
| 446 | alarmas exactas (RF-01: el aviso llega a su hora) | con el permiso, o en iOS, no se pregunta nada | RF-01 | Aprobada |

### `mobile/src/zonas/recordatorios/logica/__tests__/planificar-avisos.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 447 | planificarAvisos | recordatorio suave: un aviso por día a la hora del hábito, más la invitación final |  | Aprobada |
| 448 | planificarAvisos | no programa avisos que ya pasaron |  | Aprobada |
| 449 | planificarAvisos | no avisa un hábito ya hecho hoy |  | Aprobada |
| 450 | planificarAvisos | sin recordatorio («Ninguno») no hay avisos ni invitación |  | Aprobada |
| 451 | planificarAvisos | estilo mínimo: solo avisan los hábitos con recordatorio |  | Aprobada |
| 452 | planificarAvisos | no avisa hábitos pausados ni archivados |  | Aprobada |
| 453 | planificarAvisos | segundo aviso: 2 h después, solo hoy y mañana |  | Aprobada |
| 454 | planificarAvisos | el segundo aviso no pasa a la madrugada siguiente |  | Aprobada |
| 455 | planificarAvisos | distracción: nunca más de un aviso por hábito al día |  | Aprobada |
| 456 | planificarAvisos | ánimo rotativo: el mensaje de un hábito cambia de un día al siguiente |  | Aprobada |
| 457 | planificarAvisos | distracción con ánimo: una sola línea corta |  | Aprobada |
| 458 | planificarAvisos | momento flexible: a la hora de «Tarde» y 3 h después, el segundo solo hoy y mañana |  | Aprobada |
| 459 | planificarAvisos | momento flexible sigue la hora de «Tarde» de Perfil |  | Aprobada |
| 460 | planificarAvisos | momento flexible con distracción: solo el primer aviso |  | Aprobada |
| 461 | planificarAvisos | resumen nocturno: a las 21:00 con los hábitos de mañana |  | Aprobada |
| 462 | planificarAvisos | RF-18: el interruptor suma el resumen a los avisos por hábito | RF-18 | Aprobada |
| 463 | planificarAvisos | RF-18: sin el interruptor, el recordatorio suave no manda resumen | RF-18 | Aprobada |
| 464 | planificarAvisos | CP-03: «Tomar agua» a las 10:00 diario avisa a las 10:00 cada uno de los 7 días | CP-03 | Aprobada |
| 465 | planificarAvisos | CP-12: al ajustar a lunes, miércoles y viernes de 10 min, los avisos se acomodan solos | CP-12 | Aprobada |
| 466 | planificarAvisos | CP-06: el resumen de las 21:00 nombra los hábitos de mañana | CP-06 | Aprobada |
| 467 | planificarAvisos | resumen nocturno con un solo hábito |  | Aprobada |
| 468 | planificarAvisos | olvido con resumen: un aviso al día a la hora del momento |  | Aprobada |
| 469 | planificarAvisos | olvido con resumen y horario variable: a la hora de «Tarde» |  | Aprobada |
| 470 | planificarAvisos | una ocurrencia movida avisa en su nueva fecha y no en la original |  | Aprobada |
| 471 | planificarAvisos | tope de 60: se recortan los días más lejanos y la invitación cuenta |  | Aprobada |
| 472 | planificarAvisos | apoyo de la semana 3: el lunes, a la hora del momento |  | Aprobada |
| 473 | planificarAvisos | sin apoyo con el estilo mínimo |  | Aprobada |
| 474 | planificarAvisos | sin duración definida, los textos no mencionan minutos |  | Aprobada |
| 475 | planificarAvisos | una duración de más de una hora se escribe en horas |  | Aprobada |

### `mobile/src/zonas/recordatorios/logica/__tests__/semana-apoyo.test.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 476 | semanaDeApoyo | cuenta las semanas desde que se creó el plan |  | Aprobada |
| 477 | semanaDeApoyo | solo aplica a quien suele soltar el hábito a las pocas semanas |  | Aprobada |
| 478 | semanaDeApoyo | sin plan no hay apoyo |  | Aprobada |

### `mobile/src/zonas/recordatorios/presentacion/__tests__/PantallaAgenda.test.tsx`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 479 | PantallaAgenda (D-04) | avisa del recordatorio que quedó dentro del bloque nuevo y lo mueve a las 11:00 | D-04 | Aprobada |
| 480 | PantallaAgenda (D-04) | «Dejarlo así» no cambia el recordatorio | D-04 | Aprobada |
| 481 | PantallaAgenda (D-04) | vista por día: el miércoles muestra la clase y los ratos libres; cambiar solo ese día | D-04 | Aprobada |
| 482 | PantallaAgenda (D-04) | en un día sin bloques dice que está libre | D-04 | Aprobada |

### `backend/src/auth/contrasena.spec.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 483 | contrasena | acepta la contraseña correcta y rechaza otra |  | Aprobada |
| 484 | contrasena | no guarda la contraseña y usa una sal distinta cada vez |  | Aprobada |
| 485 | contrasena | rechaza un hash con formato desconocido |  | Aprobada |

### `backend/src/baseDatos/tiposPostgres.spec.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 486 | convertirMarcaTiempo | conserva los microsegundos y completa la zona |  | Aprobada |
| 487 | convertirMarcaTiempo | respeta zonas con minutos |  | Aprobada |

### `backend/src/ia/combinarPlan.spec.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 488 | combinarConMicroPasos | con micro-pasos de la IA, el hábito toma el paso actual y conserva hora y aviso |  | Aprobada |
| 489 | combinarConMicroPasos | con el catálogo conserva los textos del motor y solo agrega la secuencia |  | Aprobada |
| 490 | combinarConMicroPasos | una descripción vacía queda como null, igual que en el catálogo |  | Aprobada |

### `backend/src/ia/reglasMicroPasos.spec.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 491 | corregirHabito | deja igual un hábito que ya cumple las reglas |  | Aprobada |
| 492 | corregirHabito | corrige minutos: primer paso de 5 o menos, triple como máximo y sin pasar el tope |  | Aprobada |
| 493 | corregirHabito | respeta el candado mínimo en la versión reducida |  | Aprobada |
| 494 | corregirHabito | un paso de 1 minuto sube al candado mínimo de 2 min (RR-03) | RR-03 | Aprobada |
| 495 | corregirHabito | si recorta los minutos, el título dice los minutos reales |  | Aprobada |
| 496 | corregirHabito | con poco tiempo diario, nada pasa de ese tope |  | Aprobada |
| 497 | corregirHabito | un recordatorio (0 min) se queda sin duración en todos los pasos |  | Aprobada |
| 498 | corregirHabito | se queda con 5 pasos como máximo y ajusta el paso inicial |  | Aprobada |
| 499 | corregirHabito | rechaza menos de 3 pasos, pasos sin días válidos o sin título |  | Aprobada |
| 500 | CP-01 (RF-03): «Leer 20 minutos al día» | queda en 3 a 5 pasos ordenados, el primero de 5 min o menos y cada uno ≤ triple del anterior | CP-01, RF-03 | Aprobada |
| 501 | días permitidos por la P5 (ratos libres) | quita los días sin rato libre que proponga la IA |  | Aprobada |
| 502 | días permitidos por la P5 (ratos libres) | si ningún día propuesto está libre, usa los permitidos |  | Aprobada |
| 503 | limpiarDias | quita repetidos e inválidos y ordena |  | Aprobada |
| 504 | paso más ligero (meta intermedia) | siempre más corto que el actual y nunca menos de 2 min (RR-03) | RR-03 | Aprobada |
| 505 | paso más ligero (meta intermedia) | sin IA: la mitad del tiempo con el candado mínimo |  | Aprobada |
| 506 | paso más ligero (meta intermedia) | un recordatorio se aligera con menos días |  | Aprobada |

### `backend/src/sync/constructorSql.spec.ts`

| # | Grupo | Prueba | Casos | Resultado |
|---|---|---|---|---|
| 507 | construirUpsert | inserta o actualiza las columnas que no son clave |  | Aprobada |
| 508 | construirUpsert | usa otra columna de conflicto y no hace nada si solo viene la clave |  | Aprobada |
| 509 | construirUpsert | envía los JSON como texto (también los arreglos) |  | Aprobada |
| 510 | construirUpsert | rechaza columnas inexistentes (no se puede inyectar SQL por el nombre) |  | Aprobada |
| 511 | construirUpdate | cambia columnas buscando por la clave completa |  | Aprobada |
| 512 | construirUpdate | rechaza una clave incompleta o cambiar la clave |  | Aprobada |
| 513 | construirConsultaFila | busca por la clave primaria |  | Aprobada |
| 514 | construirConsultaCambios | desde un cursor, ordenado por updated_at y clave |  | Aprobada |
| 515 | construirConsultaCambios | primera descarga con filtro de fecha, o todo |  | Aprobada |
