import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert as AlertNativo, View } from 'react-native';

import { Alert } from '@/comun/presentacion/ui/alert';
import { BackButton } from '@/comun/presentacion/ui/back-button';
import { Screen } from '@/comun/presentacion/ui/screen';
import { editarHabito, leerHabito } from '@/db/habits-repository';
import { leerLimiteDuracion } from '@/zonas/cuenta/logica/servicioAjustes';
import { useLocalQuery } from '@/comun/presentacion/use-local-query';
import { useSession } from '@/zonas/cuenta/presentacion/session-context';
import { HabitWizard } from '@/features/habits/components/habit-wizard';
import { textoDuracion } from '@/features/habits/domain/formato';
import { valoresDeHabito } from '@/features/habits/domain/valores-formulario';
import { MINUTOS_MINIMOS } from '@/features/progression/domain/progresion';
import { es, formatear } from '@/comun/i18n/es';
import { fechaLocal } from '@/comun/util/dates';
import type { HabitoFormValues } from '@/schemas/habit';
import { colors } from '@/comun/tema';
import { navegar } from '@/comun/presentacion/navegar';

// Editar un hábito (mockups «Editar hábito #1–#3»): mismo asistente que al crear. La categoría no
// cambia (definición 6) y la fecha de inicio solo si el hábito todavía no empieza. El horario se
// versiona para no cambiar las estadísticas pasadas (SDD 4). Pausar y eliminar viven en el menú ⋮
// de la pantalla Hábitos.

export default function EditarHabitoScreen() {
  const t = es.habitForm;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const consulta = useLocalQuery(`habito-${id}`, () => leerHabito(id));
  const limite = useLocalQuery(`limite-${id}`, () => leerLimiteDuracion(userId, id));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(false);
  const hoy = fechaLocal();

  const guardar = async (valores: HabitoFormValues) => {
    setEnviando(true);
    setError(false);
    try {
      const { presupuestoNuevo } = await editarHabito(userId, id, valores);
      if (presupuestoNuevo !== null) {
        AlertNativo.alert(
          t.editarTitulo,
          formatear(es.habitos.presupuestoSubio, { n: textoDuracion(presupuestoNuevo) }),
        );
      }
      navegar.back();
    } catch (causa) {
      console.warn('No se pudo guardar el hábito', causa);
      setError(true);
      setEnviando(false);
    }
  };

  const item = consulta.data;

  if (!item) {
    return (
      <Screen scroll contentClassName="gap-6 pt-2">
        <View className="-ml-4">
          <BackButton />
        </View>
        {consulta.cargando ? (
          <ActivityIndicator color={colors.ink} accessibilityLabel={es.comun.cargando} />
        ) : (
          <Alert
            variant="error"
            message={consulta.error ? es.comun.errorGenerico : t.noEncontrado}
          />
        )}
      </Screen>
    );
  }

  const inicio = item.inicio ?? hoy;

  return (
    <HabitWizard
      key={item.habito.id}
      titulo={t.editarTitulo}
      textoFinal={t.guardar}
      valoresIniciales={valoresDeHabito(item.habito, item.horario, item.categoria, inicio)}
      editando
      permitirSinDuracion
      limiteDuracion={limite.data ?? null}
      // RR-03 (CP-14): si ya tenía minutos, no baja de MINUTOS_MINIMOS ni queda sin duración.
      duracionMinima={item.habito.duracion_min > 0 ? MINUTOS_MINIMOS : 0}
      hoy={hoy}
      inicioEditable={inicio >= hoy}
      enviando={enviando}
      error={error}
      onEnviar={(valores) => void guardar(valores)}
      onCerrar={() => navegar.back()}
    />
  );
}
