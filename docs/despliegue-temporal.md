# Despliegue temporal de most. (Expo Go + backend en Dokploy)

> Estado al 24-nov-2026. **Es temporal:** sirve para probar la app en Expo Go sin tener la PC prendida.
> No es una app compilada (APK/IPA ni build de EAS) y no sustituye la build de desarrollo que piden
> el DoD y las pruebas en dispositivo (CP-03, CP-06, CP-08, CP-15, CP-16). Las notificaciones y
> "No Molestar" no son confiables en Expo Go.

## Qué hay desplegado

Todo vive en el proyecto **MOST** de Dokploy (`https://dokploy.allan3235.com`), dentro de una sola
aplicación tipo **Compose** llamada `most` (appName `most-krdm5w`, composeId `hN87S0C_F11V5cl_JTT6N`).
Se construye desde GitHub con la rama **`main`** y el archivo `despliegue/docker-compose.yml`. Cada
push a `main` la redespliega sola.

```
Teléfono (Expo Go) ─HTTPS─▶ Cloudflare ─túnel─▶ cloudflared ─┬─▶ metro:8081  most-expo.allan3235.com
                                                             └─▶ api:3001    most-api.allan3235.com
                                               api ──dokploy-network──▶ Postgres "most-db"
```

| Pieza | Qué es | Archivo |
|---|---|---|
| `api` | Backend NestJS. Al arrancar corre `prisma migrate deploy` y luego la API | `despliegue/backend.Dockerfile` |
| `metro` | Servidor de desarrollo de Expo (`expo start --go`) que sirve la app a Expo Go | `despliegue/metro.Dockerfile` |
| `cloudflared` | Túnel de Cloudflare propio de MOST. Da los dominios públicos con HTTPS | imagen `cloudflare/cloudflared` |
| `most-db` | PostgreSQL 17 administrado por Dokploy (fuera del compose) | — |

No se publica ningún puerto en el servidor, que está detrás de NAT. Todo sale por el túnel.

- URL para Expo Go: `exps://most-expo.allan3235.com`
- API pública: `https://most-api.allan3235.com`. Prueba de salud: `GET /salud` → `{"estado":"ok","baseDatos":true}`

## Cómo funciona lo de Expo Go

- `EXPO_PACKAGER_PROXY_URL=https://most-expo.allan3235.com` hace que Metro anuncie el dominio público
  en el manifiesto, no la IP interna del contenedor. Por eso no se usa `expo start --tunnel` (ngrok),
  que daba una URL distinta en cada reinicio.
- `EXPO_PUBLIC_API_URL=https://most-api.allan3235.com` queda incrustada en el JavaScript. La app solo
  lee esa variable (`mobile/src/comun/config/env.ts`).
- `EXPO_TOKEN` deja a Metro con sesión de Expo. El manifiesto solo sale firmado si además
  `mobile/app.json` tiene `owner`, `slug` y `extra.eas.projectId`, cosa que ya cumple
  (`nueve_36/HabitGreen`).
- `CI=1` en el contenedor: sin preguntas interactivas y sin recarga al cambiar archivos.
- `--go` es obligatorio porque la app tiene `expo-dev-client`. Sin esa opción, Metro serviría al
  cliente de desarrollo y no a Expo Go.

## Variables (solo en el Environment de Dokploy, nunca en el repo)

`DATABASE_URL`, `JWT_SECRETO`, `JWT_EXPIRA`, `ANTHROPIC_API_KEY` (api) ·
`EXPO_PACKAGER_PROXY_URL`, `EXPO_PUBLIC_API_URL`, `EXPO_TOKEN` (metro) ·
`CLOUDFLARE_TUNNEL_TOKEN`, `COMPOSE_PROFILES=tunel` (cloudflared solo arranca con ese perfil).

Los hostnames del túnel se configuran en Cloudflare Zero Trust → Networks → Tunnels: `most-expo` →
`http://metro:8081` y `most-api` → `http://api:3001`.

## Limitaciones

- **Solo abre la cuenta de Expo del token.** Expo Go exige que la cuenta con sesión en el teléfono
  sea la misma que la de Metro. Para cualquier otra persona, la salida es un APK de EAS
  (`pnpm build:preview` en `mobile/`).
- **Solo Android.** El proyecto usa SDK 58 y el Expo Go de la App Store llega hasta SDK 54. En
  Android se instala el Expo Go del SDK correcto desde https://expo.dev/go.
- Es modo desarrollo: más lento que una app compilada. La primera carga arma el bundle (~13 s); se
  puede precalentar pidiendo una vez la `launchAsset.url` del manifiesto.
- **Pendiente:** el `EXPO_TOKEN` actual es de la cuenta `allanfragoso`, que no tiene acceso al
  proyecto `nueve_36/HabitGreen`. El manifiesto sale anónimo (`@anonymous/...`) y Expo Go pide
  iniciar sesión. Para resolverlo: agregar `allanfragoso` a `nueve_36`, o usar un token de
  `nueve_36`.

## Verificar

```bash
D="--doh-url https://1.1.1.1/dns-query"
curl -s $D https://most-api.allan3235.com/salud          # {"estado":"ok","baseDatos":true}
curl -s $D https://most-expo.allan3235.com/status        # packager-status:running
curl -s $D https://most-expo.allan3235.com/ -H "expo-platform: android" \
  -H "Accept: multipart/mixed,application/expo+json,application/json" \
  -H 'expo-expect-signature: sig, keyid="expo-root", alg="rsa-v1_5-sha256"' \
  | grep -o '"scopeKey":"[^"]*"'                         # bien: "@nueve_36/HabitGreen"
```

## Si cambias algo

- Código de la app o del backend: push a `main` y Dokploy redespliega. Las migraciones nuevas de
  Prisma se aplican solas al arrancar `api`.
- Variables de entorno: se editan en Dokploy y luego hay que hacer Redeploy.
- No hay recarga en caliente: Metro sirve el código del último despliegue.
