import { es, formatear } from '@/comun/i18n/es';
import { diaIso, diasEntre } from '@/comun/logica/dates';

// Cómo se nombra el día destino de una reprogramación: «a hoy», «a mañana», «al jueves 19» en la
// tarjeta, «para hoy», «para mañana», «para el jueves 19» en el aviso de éxito, y «Hoy», «Mañana»,
// «Jue 19» en el selector de días.

type TextosDia = Pick<
  typeof es.reprogramar,
  | 'destinoHoy'
  | 'destinoManana'
  | 'destinoDia'
  | 'cortoHoy'
  | 'cortoManana'
  | 'cortoDia'
  | 'quedoHoy'
  | 'quedoManana'
  | 'quedoDia'
  | 'dias'
  | 'diasCortos'
>;

type TextosFue = Pick<typeof es.reprogramar, 'fueAyer' | 'fueDia' | 'dias'>;

export function destinoDia(fecha: string, hoy: string, t: TextosDia = es.reprogramar): string {
  const distancia = diasEntre(hoy, fecha);
  if (distancia === 0) return t.destinoHoy;
  if (distancia === 1) return t.destinoManana;
  return formatear(t.destinoDia, { dia: t.dias[diaIso(fecha) - 1], n: Number(fecha.slice(8)) });
}

export function quedoPara(fecha: string, hoy: string, t: TextosDia = es.reprogramar): string {
  const distancia = diasEntre(hoy, fecha);
  if (distancia === 0) return t.quedoHoy;
  if (distancia === 1) return t.quedoManana;
  return formatear(t.quedoDia, { dia: t.dias[diaIso(fecha) - 1], n: Number(fecha.slice(8)) });
}

export function diaCorto(fecha: string, hoy: string, t: TextosDia = es.reprogramar): string {
  const distancia = diasEntre(hoy, fecha);
  if (distancia === 0) return t.cortoHoy;
  if (distancia === 1) return t.cortoManana;
  return formatear(t.cortoDia, { dia: t.diasCortos[diaIso(fecha) - 1], n: Number(fecha.slice(8)) });
}

/** El día que no salió, dicho en la tarjeta de barreras: «ayer» o «el lunes 21» (RF-17). */
export function cuandoFue(fecha: string, hoy: string, t: TextosFue = es.reprogramar): string {
  if (diasEntre(fecha, hoy) === 1) return t.fueAyer;
  return formatear(t.fueDia, { dia: t.dias[diaIso(fecha) - 1], n: Number(fecha.slice(8)) });
}
