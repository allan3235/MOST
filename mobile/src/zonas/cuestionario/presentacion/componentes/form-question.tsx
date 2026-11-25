import { es } from '@/comun/i18n/es';
import { ACOMPANAMIENTOS, HISTORIALES, TIEMPOS } from '@/comun/modelo/esquemas/onboarding';

import type { Paso } from '@/zonas/cuestionario/logica/form-rules';
import { AreasQuestion } from './areas-question';
import { ObjetivosQuestion } from './objetivos-question';
import { PreguntaMomentos } from './PreguntaMomentos';
import { PreguntaObstaculos } from './PreguntaObstaculos';
import { SingleChoiceQuestion } from './single-choice-question';

// Elige qué opciones mostrar en cada paso del formulario.

export type FormQuestionProps = {
  paso: Paso;
};

export function FormQuestion({ paso }: FormQuestionProps) {
  const t = es.onboarding.formulario;
  switch (paso) {
    case 1:
      return <AreasQuestion />;
    case 2:
      return <ObjetivosQuestion />;
    case 3:
      return <SingleChoiceQuestion campo="historial" claves={HISTORIALES} textos={t.historial} />;
    case 4:
      return <SingleChoiceQuestion campo="tiempo" claves={TIEMPOS} textos={t.tiempo} />;
    case 5:
      return <PreguntaMomentos />;
    case 6:
      return <PreguntaObstaculos />;
    case 7:
      return (
        <SingleChoiceQuestion
          campo="acompanamiento"
          claves={ACOMPANAMIENTOS}
          textos={t.acompanamiento}
        />
      );
  }
}
