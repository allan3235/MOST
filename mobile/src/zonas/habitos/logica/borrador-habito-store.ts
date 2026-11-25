import { almacenSincrono } from '@/comun/datos/almacen-local';

import { borradorParaHoy, type BorradorHabito } from './borrador-habito';

// Dónde vive el borrador del asistente: el almacén clave-valor de expo-sqlite, como las respuestas
// del formulario inicial. Se usa la versión síncrona para tenerlo antes de dibujar la pantalla.

const CLAVE = 'most-borrador-habito';

export function leerBorradorHabito(userId: string, hoy: string): BorradorHabito | null {
  try {
    // El almacén es síncrono: devuelve el texto al momento (nunca una promesa).
    const texto = almacenSincrono.getItem(CLAVE) as string | null;
    return borradorParaHoy(texto ? (JSON.parse(texto) as BorradorHabito) : null, userId, hoy);
  } catch {
    return null;
  }
}

export function guardarBorradorHabito(borrador: BorradorHabito): void {
  try {
    void almacenSincrono.setItem(CLAVE, JSON.stringify(borrador));
  } catch {
    // Sin borrador la app funciona igual: solo no se podría retomar.
  }
}

export function borrarBorradorHabito(): void {
  try {
    void almacenSincrono.removeItem(CLAVE);
  } catch {
    // Nada que borrar.
  }
}
