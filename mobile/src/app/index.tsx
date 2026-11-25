import { ZoneRedirect } from '@/zonas/cuenta/presentacion/componentes/zone-redirect';

// Entrada de la app (most:/// o exp://.../--/). No tiene contenido: manda a la zona que
// corresponde según la sesión.

export default function Index() {
  return <ZoneRedirect />;
}
