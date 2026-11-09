# Proyecto MOST: documentación de avance

Aplicación móvil con backend propio. Este documento describe el trabajo realizado en la fase de preparación del entorno, los requisitos técnicos, el estado actual y las decisiones tomadas.

## 1. Resumen

El proyecto se compone de dos partes independientes:

| Parte | Carpeta | Tecnología |
|---|---|---|
| Aplicación móvil | `mobile/` | React Native con Expo (SDK 57), TypeScript, ejecutada en Expo Go |
| Servidor (backend) | `backend/` | NestJS, TypeScript |

Ambas usan **pnpm** como gestor de paquetes. Las pruebas de la aplicación se hacen en un **emulador de Android** (Android Studio). En esta fase solo se preparó el entorno. Aún no se desarrolla ninguna funcionalidad propia del proyecto.

## 2. Qué se ha hecho

1. **Revisión del entorno.** Se verificó qué herramientas estaban instaladas. Android Studio, el SDK de Android, `adb`, el emulador y la imagen de Android 36 ya existían, por lo que no fue necesario descargarlos.
2. **Backend.** Se creó el proyecto NestJS en `backend/` con el CLI oficial. Se comprobó que el servidor arranca y responde "Hello World!" en `http://localhost:3000`.
3. **Aplicación móvil.** Se creó el proyecto Expo en `mobile/` con la plantilla por defecto (TypeScript y expo-router). Se configuró pnpm en modo `hoisted` (ver sección 5) y se reinstalaron las dependencias.
4. **Emulador.** Se creó un dispositivo virtual propio, `MOST_Pixel_8` (Pixel 8, Android 36), y se arrancó correctamente.
5. **Prueba de integración del entorno.** Se inició el servidor de desarrollo de Expo. Expo Go se instaló en el emulador y mostró la pantalla inicial "Welcome to Expo" (SDK 57.0.0).
6. **Control de versiones.** Se añadió un `.gitignore` en la raíz (`node_modules`, `dist`, `.expo`, `.env`, `*.log`).

## 3. Puntos y requisitos necesarios

### Herramientas (verificadas en el equipo de desarrollo)

| Herramienta | Versión |
|---|---|
| Node.js | v24.19.0 |
| pnpm | 12.8.1 |
| Java | 26.0.2 |
| Android Studio y SDK | instalados (`ANDROID_HOME` configurado) |
| Imagen del emulador | android-36, `google_apis_playstore`, x86_64 |

### Comandos de uso

| Acción | Comando |
|---|---|
| Iniciar el backend | `cd backend` y `pnpm start:dev` |
| Iniciar la app móvil | `cd mobile` y `pnpm exec expo start --android` |
| Iniciar el emulador | `emulator -avd MOST_Pixel_8` |

### Dato de red importante
Desde el emulador, el backend **no** se alcanza con `localhost`, sino con `http://10.0.2.2:3000`.

### Por definir (pendiente del cliente o equipo)
- Requisitos funcionales de la aplicación.
- Base de datos y modelo de datos.
- Autenticación y manejo de usuarios.
- Diseño de pantallas.
- Plan de despliegue.

## 4. Estado y avance

| Elemento | Estado |
|---|---|
| Entorno de desarrollo | Listo |
| Backend NestJS base | Creado y probado |
| App Expo base | Creada y probada en el emulador |
| Emulador Android | Creado y funcionando |
| Comunicación app con backend | No probada |
| Base de datos | Pendiente |
| Autenticación | Pendiente |
| Funcionalidades del proyecto | Pendientes (requisitos por recibir) |
| Commits en git | Ninguno todavía (los archivos están sin seguimiento) |

**Siguientes pasos:** recibir los requisitos funcionales, definir base de datos y autenticación, conectar la app con el backend y hacer el primer commit.

## 5. Decisiones técnicas

- **Carpetas separadas (`backend/` y `mobile/`).** Cada parte tiene su propio `package.json` y su propio `pnpm-lock.yaml`. Así pueden evolucionar y desplegarse por separado. No se usó un monorepo para mantener la configuración simple.
- **pnpm con `node-linker=hoisted` en `mobile/`.** Por defecto pnpm enlaza las dependencias con enlaces simbólicos, y Metro (el empaquetador de React Native) no los maneja bien. Esta opción se fijó en `mobile/.npmrc`.
- **Expo Go como entorno de pruebas.** Evita compilar código nativo, lo que acelera el desarrollo inicial.
- **Dispositivo virtual propio (`MOST_Pixel_8`).** Se creó uno nuevo para no modificar el dispositivo de otro proyecto que ya existía en el equipo.
- **Reutilización del SDK de Android existente.** Evita descargas duplicadas.

## 6. Uso de inteligencia artificial por módulo

Criterios:
- El porcentaje es una **estimación por módulo**, no una medición exacta. Indica qué parte del trabajo de ese módulo realizó la IA (Claude Code) y qué parte el desarrollador.
- El código que generan las herramientas oficiales (plantillas de Nest CLI y create-expo-app) **no se cuenta** ni como IA ni como manual.
- La tabla se actualiza cada vez que se termina un módulo.

| Módulo / tarea | Origen | % IA | % manual | Observaciones |
|---|---|---|---|---|
| Revisión del entorno (herramientas instaladas) | IA | 100 | 0 | A petición del desarrollador. |
| Estructura de carpetas `backend/` y `mobile/` | IA | 100 | 0 | Ejecutó los CLI oficiales. |
| Código base de `backend/` | Plantilla Nest CLI | n/a | n/a | No se cuenta. |
| Código base de `mobile/` | Plantilla create-expo-app | n/a | n/a | No se cuenta. |
| Configuración de pnpm en `mobile/` (`.npmrc`) | IA | 100 | 0 | Ajuste de compatibilidad con Metro. |
| Emulador Android `MOST_Pixel_8` | IA | 100 | 0 | Creado con `avdmanager`. |
| `.gitignore` | IA | 100 | 0 | |
| Documentación (este archivo) | IA | 100 | 0 | Redactado por la IA; el desarrollador definió formato y contenido. |
| Módulos funcionales de la aplicación | Pendiente | n/a | n/a | Aún sin requisitos. Se registrarán al desarrollarlos. |

En esta fase toda la ejecución técnica la hizo la IA bajo la dirección del desarrollador, quien definió el alcance, las herramientas y aprobó cada paso. Aún no hay código funcional propio del proyecto.

## 7. Incidencias encontradas

- Al probar Expo se definió por error una variable de entorno `CI` vacía, y el servidor falló con `GetEnv.NoBoolean`. Se eliminó la variable y funcionó. No afecta al proyecto.
