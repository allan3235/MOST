import { useState } from 'react';

import { Alert } from '@/comun/presentacion/ui/alert';
import { AppText } from '@/comun/presentacion/ui/app-text';
import { Dialog } from '@/comun/presentacion/ui/dialog';
import { DialogActions } from '@/zonas/habitos/presentacion/componentes/dialog-actions';
import { DurationWheels } from '@/zonas/habitos/presentacion/componentes/duration-wheels';
import { textoDuracion } from '@/zonas/habitos/logica/formato';
import { limiteTiempoDiario } from '@/zonas/habitos/logica/presupuesto';
import { es, formatear } from '@/comun/i18n/es';

// Tiempo diario (`presupuesto_min`) en Perfil: las mismas ruedas de Horas y Minutos que la
// duración de un hábito, de 1 min a 8 h. Debajo se ve cuánto suma el día con más hábitos; bajar
// de ahí solo se avisa, nunca se tocan los hábitos (SDD 6.5). Si el tiempo ya subió solo por
// encima de 8 h, la rueda llega hasta ese valor.

export type BudgetDialogProps = {
  valor: number;
  /** Minutos del día de la semana con más hábitos. */
  minutosDia: number;
  onElegir: (minutos: number) => void;
  onCerrar: () => void;
};

export function BudgetDialog({ valor, minutosDia, onElegir, onCerrar }: BudgetDialogProps) {
  const t = es.perfil.dialogoTiempo;
  const [horas, setHoras] = useState(Math.floor(valor / 60));
  const [minutos, setMinutos] = useState(valor % 60);
  const total = horas * 60 + minutos;
  const maximo = limiteTiempoDiario(valor);
  const excede = total > maximo;
  const debajo = total > 0 && !excede && total < minutosDia;
  const suma = textoDuracion(minutosDia);

  return (
    <Dialog visible titulo={es.perfil.tiempoTitulo} onCerrar={onCerrar}>
      <DurationWheels
        horas={horas}
        minutos={minutos}
        onCambiarHoras={setHoras}
        onCambiarMinutos={setMinutos}
        horasMax={Math.floor(maximo / 60)}
        vacio={t.elegir}
        detalle={
          // Junto al total, para compararlos; si se baja de ahí, lo dice el aviso de abajo.
          minutosDia > 0 && !debajo ? (
            <AppText variant="small" className="text-center">
              {formatear(t.diaMasCargado, { n: suma })}
            </AppText>
          ) : null
        }
      />

      {excede ? (
        <Alert variant="advertencia" message={formatear(t.maximo, { n: textoDuracion(maximo) })} />
      ) : null}
      {debajo ? <Alert variant="advertencia" message={formatear(t.debajo, { n: suma })} /> : null}

      <DialogActions
        valido={total > 0 && !excede}
        onCancelar={onCerrar}
        onAceptar={() => {
          onElegir(total);
          onCerrar();
        }}
      />
    </Dialog>
  );
}
