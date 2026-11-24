// Qué hacer con el permiso de avisos (SDD 7.1). Función pura: el estado real lo lee `avisos.ts`.
// Los recordatorios necesitan el permiso, así que se pide cada vez que la persona elige una hora
// sin tenerlo: no es insistir, es el momento en que lo necesita.

export type EstadoPermiso = {
  concedido: boolean;
  /** Android todavía deja mostrar su pregunta (si se negó dos veces, ya no). */
  puedePreguntar: boolean;
};

/** listo: ya está dado · preguntar: se puede pedir · ajustes: solo se activa en Ajustes. */
export type SiguientePaso = 'listo' | 'preguntar' | 'ajustes';

export function siguientePaso(estado: EstadoPermiso): SiguientePaso {
  if (estado.concedido) return 'listo';
  return estado.puedePreguntar ? 'preguntar' : 'ajustes';
}

/** Lo que se sabe para decidir si pedir el permiso de alarmas exactas. */
export type EstadoAlarmasExactas = {
  plataforma: string;
  /** Ya se puede programar a la hora exacta. */
  permitidas: boolean;
  /** Ya se preguntó en esta sesión (para no insistir, RNF-06). */
  yaPreguntado: boolean;
};

/**
 * Si conviene explicar y pedir «Alarmas y recordatorios» (RF-01: el aviso llega a su hora). Solo
 * en Android, solo si falta, y una vez por sesión.
 * @param estado Plataforma, permiso y si ya se preguntó.
 * @returns true si hay que mostrar la explicación.
 */
export function debePedirAlarmasExactas(estado: EstadoAlarmasExactas): boolean {
  return estado.plataforma === 'android' && !estado.permitidas && !estado.yaPreguntado;
}
