/**
 * @file PantallaAgenda.tsx
 * @proyecto most.
 * @descripcion Mi agenda (Perfil → Mi agenda, RF-02): los bloques ocupados de la persona, para que
 *   los recordatorios caigan en tiempo libre. Tocar un bloque lo edita; «Agregar bloque ocupado»
 *   crea uno. Todo se guarda en el teléfono y se sincroniza.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-24): creación.
 */

import { CalendarClock } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { MenuRow } from '@/components/ui/menu-row';
import { Screen } from '@/components/ui/screen';
import { Snackbar } from '@/components/ui/snackbar';
import {
  eliminarBloque,
  guardarBloque,
  leerBloques,
  type DatosBloque,
} from '@/db/agenda-repository';
import { useLocalQuery } from '@/db/use-local-query';
import { useSession } from '@/features/auth/session-context';
import { es } from '@/i18n/es';
import { cardShadow } from '@/theme';

import { DialogoBloque } from '../components/DialogoBloque';
import type { BloqueAgenda } from '../domain/agenda';

// ===== Constantes =====

const LARGO_HORA = 5;

// ===== Funciones auxiliares =====

function textoDias(dias: readonly number[]): string {
  const t = es.habitos.tarjeta;
  return dias.length === t.dias.length ? t.todosLosDias : dias.map((d) => t.dias[d - 1]).join(', ');
}

// ===== Principal =====

/**
 * Pantalla Mi agenda.
 * @returns La pantalla.
 */
export default function PantallaAgenda() {
  const t = es.agenda;
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const bloques = useLocalQuery(`agenda-${userId}`, () => leerBloques(userId));
  /** undefined: cerrado; null: bloque nuevo; un bloque: editarlo. */
  const [editando, setEditando] = useState<BloqueAgenda | null | undefined>(undefined);
  const [error, setError] = useState(false);

  const guardar = (datos: DatosBloque) => {
    const id = editando?.id;
    setEditando(undefined);
    guardarBloque(userId, datos, id).catch(() => setError(true));
  };
  const eliminar = () => {
    const id = editando?.id;
    setEditando(undefined);
    if (id) {
      eliminarBloque(id).catch(() => setError(true));
    }
  };

  const lista = bloques.data ?? [];

  return (
    <>
      <Screen scroll contentClassName="gap-6 pt-2 pb-8">
        <View className="-ml-4">
          <BackButton />
        </View>
        <AppText variant="h2" accessibilityRole="header">
          {t.titulo}
        </AppText>
        <AppText tone="ink-soft">{t.explicacion}</AppText>

        {lista.length === 0 ? (
          <AppText tone="ink-soft">{t.vacia}</AppText>
        ) : (
          <View style={cardShadow} className="overflow-hidden rounded-card bg-campo">
            {lista.map((b, i) => (
              <MenuRow
                key={b.id}
                icono={CalendarClock}
                titulo={b.nombre}
                resumen={`${textoDias(b.dias_semana)} · ${b.hora_inicio.slice(0, LARGO_HORA)}–${b.hora_fin.slice(0, LARGO_HORA)}`}
                onPress={() => setEditando(b)}
                ultima={i === lista.length - 1}
              />
            ))}
          </View>
        )}

        <Button variant="secondary" label={t.agregar} onPress={() => setEditando(null)} />

        {editando !== undefined ? (
          <DialogoBloque
            bloque={editando}
            onGuardar={guardar}
            onEliminar={eliminar}
            onCerrar={() => setEditando(undefined)}
          />
        ) : null}
      </Screen>
      <Snackbar mensaje={error ? t.error : null} variant="error" onCerrar={() => setError(false)} />
    </>
  );
}
