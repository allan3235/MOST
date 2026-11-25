import { es } from '@/comun/i18n/es';
import { ACOMPANAMIENTOS, HISTORIALES, TIEMPOS } from '@/comun/modelo/esquemas/onboarding';

import type { Campo } from '@/zonas/cuestionario/logica/form-rules';
import { AreasQuestion } from './areas-question';
import { ObjetivosQuestion } from './objetivos-question';
import { PreguntaMomentos } from './PreguntaMomentos';
import { PreguntaObstaculos } from './PreguntaObstaculos';
import { SingleChoiceQuestion } from './single-choice-question';

// Elige qué opciones mostrar en cada pregunta del formulario.

export type FormQuestionProps = {
  campo: Campo;
};

export function FormQuestion({ campo }: FormQuestionProps) {
  const t = es.onboarding.formulario;
  switch (campo) {
    case 'areas':
      return <AreasQuestion />;
    case 'objetivos':
      return <ObjetivosQuestion />;
    case 'historial':
      return <SingleChoiceQuestion campo="historial" claves={HISTORIALES} textos={t.historial} />;
    case 'tiempo':
      return <SingleChoiceQuestion campo="tiempo" claves={TIEMPOS} textos={t.tiempo} />;
    case 'momento':
      return <PreguntaMomentos />;
    case 'obstaculo':
      return <PreguntaObstaculos />;
    case 'acompanamiento':
      return (
        <SingleChoiceQuestion
          campo="acompanamiento"
          claves={ACOMPANAMIENTOS}
          textos={t.acompanamiento}
        />
      );
  }
}
