import { useState } from 'react';

import { Button } from '@/comun/presentacion/ui/button';
import { Dialog } from '@/comun/presentacion/ui/dialog';
import { RuedasHora } from '@/comun/presentacion/ui/ruedas-hora';
import { es } from '@/comun/i18n/es';

import { HORA_POR_DEFECTO } from '@/zonas/habitos/logica/valores-formulario';

// «Hora del recordatorio» (mockup «Crear hábito #3.1»): elegir la hora o quedarse sin
// recordatorio. «Elegir hora» cambia el mismo diálogo a las ruedas de horas y minutos, iguales en
// Android y iPhone (antes abría el reloj de Android, que en iPhone no hacía nada).

export type ReminderDialogProps = {
  hora: string | null;
  /** Hora con que abren las ruedas si aún no hay una (la de «Mañana» en Perfil). */
  horaInicial?: string;
  onElegir: (hora: string) => void;
  onSinRecordatorio: () => void;
  onCerrar: () => void;
  /** Antes de mostrar las ruedas (por ejemplo, pedir el permiso de avisos). Llama a `abrir` si sigue. */
  antesDeElegir?: (abrir: () => void) => void;
};

export function ReminderDialog({
  hora,
  horaInicial = HORA_POR_DEFECTO,
  onElegir,
  onSinRecordatorio,
  onCerrar,
  antesDeElegir,
}: ReminderDialogProps) {
  const t = es.habitForm.dialogoHora;
  const [eligiendo, setEligiendo] = useState(false);

  const elegir = () => {
    const abrir = () => setEligiendo(true);
    if (antesDeElegir) antesDeElegir(abrir);
    else abrir();
  };

  return (
    <Dialog visible titulo={t.titulo} onCerrar={onCerrar}>
      {eligiendo ? (
        <RuedasHora
          valor={hora ?? horaInicial}
          onCancelar={() => setEligiendo(false)}
          onAceptar={(elegida) => {
            // Primero se cierra: si la hora choca con la agenda, quien llama puede volver a abrirlo.
            onCerrar();
            onElegir(elegida);
          }}
        />
      ) : (
        <>
          <Button variant="secondary" label={t.elegir} onPress={elegir} />
          <Button
            variant="secondary"
            label={t.sinRecordatorio}
            onPress={() => {
              onSinRecordatorio();
              onCerrar();
            }}
          />
          <Button variant="tertiary" label={t.cancelar} onPress={onCerrar} />
        </>
      )}
    </Dialog>
  );
}
