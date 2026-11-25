import { useState } from 'react';

import { Alert } from '@/comun/presentacion/ui/alert';
import { Dialog } from '@/comun/presentacion/ui/dialog';
import { es, formatear } from '@/comun/i18n/es';

import { textoDuracion } from '../domain/formato';
import { DialogActions } from './dialog-actions';
import { DurationWheels } from './duration-wheels';

// «¿Cuánto dura?»: ruedas de horas y minutos, como las de fecha del mismo asistente, para elegir
// cualquier duración. En los hábitos propios, dejar 0 h 0 min es «Sin duración fija» (no hay botón
// aparte); los del plan siempre tienen duración y un límite según el tiempo diario (SDD 6.5).
// Se monta solo mientras está abierto, así que siempre arranca en `valor`.

export type DurationDialogProps = {
  valor: number;
  onElegir: (minutos: number) => void;
  onCerrar: () => void;
  /** Acepta 0 como «Sin duración fija» (solo hábitos propios). */
  permitirSinDuracion?: boolean;
  /** Minutos máximos (hábitos del plan); sin límite si no se pasa. */
  limite?: number | null;
  /** Candado mínimo al ajustar (RR-03); 0 = sin mínimo. */
  minimo?: number;
};

export function DurationDialog({
  valor,
  onElegir,
  onCerrar,
  permitirSinDuracion = false,
  limite = null,
  minimo = 0,
}: DurationDialogProps) {
  const t = es.habitForm.dialogoDuracion;
  const [horas, setHoras] = useState(Math.floor(valor / 60));
  const [minutos, setMinutos] = useState(valor % 60);
  const total = horas * 60 + minutos;
  const excede = limite !== null && total > limite;
  // RR-03: al ajustar un hábito con minutos no se baja del mínimo (ni a «sin duración»).
  const debajoDelMinimo = minimo > 0 && total < minimo;

  const elegir = (min: number) => {
    onElegir(min);
    onCerrar();
  };

  return (
    <Dialog visible titulo={t.titulo} onCerrar={onCerrar}>
      <DurationWheels
        horas={horas}
        minutos={minutos}
        onCambiarHoras={setHoras}
        onCambiarMinutos={setMinutos}
        vacio={permitirSinDuracion && minimo === 0 ? t.sinDuracion : t.elegir}
      />

      {excede && limite !== null ? (
        <Alert
          variant="advertencia"
          message={formatear(t.limitePlan, { n: textoDuracion(limite) })}
        />
      ) : null}

      {debajoDelMinimo ? (
        <Alert variant="info" message={formatear(t.minimo, { n: minimo })} />
      ) : null}

      <DialogActions
        valido={(total > 0 || (permitirSinDuracion && minimo === 0)) && !excede && !debajoDelMinimo}
        onCancelar={onCerrar}
        onAceptar={() => elegir(total)}
      />
    </Dialog>
  );
}
