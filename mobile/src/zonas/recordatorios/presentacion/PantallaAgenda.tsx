/**
 * @file PantallaAgenda.tsx
 * @proyecto most.
 * @descripcion Mi agenda (Perfil → Mi agenda, RF-02): los bloques ocupados de la persona, para que
 *   los recordatorios caigan en tiempo libre. Se ve un día a la vez (tira con los 7 días): sus
 *   bloques en orden y los ratos libres entre ellos. Tocar un bloque que se repite pregunta si el
 *   cambio es solo para ese día o para todos. Todo se guarda en el teléfono y se sincroniza. Al
 *   guardar un bloque se revisan los recordatorios que ya caían ahí y se ofrece moverlos (D-04).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-24
 * @version 2.0.0
 * @historial 1.0.0 (2026-11-24): creación.
 *   1.1.0 (2026-11-23): revisa los recordatorios existentes al guardar un bloque (D-04).
 *   2.0.0 (2026-11-25): vista por día con ratos libres y cambios «solo este día».
 */

import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/comun/presentacion/ui/app-text';
import { BackButton } from '@/comun/presentacion/ui/back-button';
import { Button } from '@/comun/presentacion/ui/button';
import { Dialog } from '@/comun/presentacion/ui/dialog';
import { Screen } from '@/comun/presentacion/ui/screen';
import { Snackbar } from '@/comun/presentacion/ui/snackbar';
import {
  eliminarBloque,
  eliminarSoloUnDia,
  guardarBloque,
  guardarSoloUnDia,
  leerBloques,
  type DatosBloque,
} from '@/zonas/recordatorios/logica/servicioAgenda';
import {
  cambiarHoraRecordatorio,
  leerHabitos,
  type HabitoConHorario,
} from '@/zonas/habitos/logica/servicioHabitos';
import { useLocalQuery } from '@/comun/presentacion/use-local-query';
import { useSession } from '@/zonas/cuenta/presentacion/session-context';
import { es, formatear } from '@/comun/i18n/es';
import { cardShadow } from '@/comun/tema';
import { useFechaHoy } from '@/comun/logica/fecha-hoy';

import { DialogoBloque } from '@/zonas/recordatorios/presentacion/componentes/DialogoBloque';
import {
  diaIso,
  franjasDelDia,
  recordatoriosQueChocan,
  type BloqueAgenda,
  type Franja,
  type ChoqueRecordatorio,
  type RecordatorioHabito,
} from '@/zonas/recordatorios/logica/agenda';

// ===== Tipos =====

/** Qué se está editando: un bloque (o uno nuevo) y si el cambio es para todos sus días o solo uno. */
type Edicion = { bloque: BloqueAgenda | null; soloDia?: number };

// ===== Constantes =====

const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 7];

// ===== Funciones auxiliares =====

/** Nombre del día en minúsculas («lunes»), para frases como «Solo el lunes». */
function nombreDia(dia: number): string {
  return (es.habitForm.dias[dia - 1] ?? '').toLowerCase();
}

function textoDias(dias: readonly number[]): string {
  const t = es.habitos.tarjeta;
  return dias.length === t.dias.length ? t.todosLosDias : dias.map((d) => t.dias[d - 1]).join(', ');
}

/** Recordatorios a hora fija de los hábitos activos (los flexibles no tienen hora que choque). */
function recordatoriosFijos(habitos: readonly HabitoConHorario[]): RecordatorioHabito[] {
  return habitos.flatMap(({ habito, horario }) =>
    habito.activo && horario?.notificar && horario.hora && !horario.flexible
      ? [
          {
            habitId: habito.id,
            titulo: habito.titulo,
            dias: horario.dias_semana,
            hora: horario.hora,
            duracionMin: habito.duracion_min,
          },
        ]
      : [],
  );
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
  // Empieza en el día de hoy; la tira de arriba cambia de día.
  const fechaHoy = useFechaHoy((f) => f.fecha);
  const [dia, setDia] = useState(() => diaIso(new Date(`${fechaHoy}T12:00:00`)));
  /** undefined: cerrado; con `bloque` null es uno nuevo. */
  const [editando, setEditando] = useState<Edicion | undefined>(undefined);
  /** Bloque que se repite y se tocó: falta saber si el cambio es para un día o para todos. */
  const [eligiendo, setEligiendo] = useState<BloqueAgenda | null>(null);
  const [error, setError] = useState(false);
  /** Recordatorios que quedaron dentro de un bloque, por revisar uno a uno. */
  const [pendientes, setPendientes] = useState<ChoqueRecordatorio[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  const revisarRecordatorios = async () => {
    const [agenda, habitos] = await Promise.all([leerBloques(userId), leerHabitos()]);
    setPendientes(recordatoriosQueChocan(agenda, recordatoriosFijos(habitos)));
  };

  const guardar = (datos: DatosBloque) => {
    const edicion = editando;
    setEditando(undefined);
    const bloque = edicion?.bloque ?? null;
    const guardado =
      bloque && edicion?.soloDia !== undefined
        ? guardarSoloUnDia(userId, bloque, edicion.soloDia, datos)
        : guardarBloque(userId, datos, bloque?.id);
    guardado.then(revisarRecordatorios).catch(() => setError(true));
  };

  const tocarBloque = (bloque: BloqueAgenda) => {
    if (bloque.dias_semana.length > 1) {
      setEligiendo(bloque);
      return;
    }
    setEditando({ bloque });
  };

  const [actual] = pendientes;
  const siguiente = () => setPendientes((lista) => lista.slice(1));
  const mover = (choque: ChoqueRecordatorio, hora: string) => {
    siguiente();
    cambiarHoraRecordatorio(userId, choque.recordatorio.habitId, hora)
      .then(() => setAviso(formatear(t.movido, { habito: choque.recordatorio.titulo, hora })))
      .catch(() => setError(true));
  };
  const eliminar = () => {
    const edicion = editando;
    setEditando(undefined);
    const bloque = edicion?.bloque;
    if (!bloque) {
      return;
    }
    const borrado =
      edicion.soloDia !== undefined
        ? eliminarSoloUnDia(bloque, edicion.soloDia)
        : eliminarBloque(bloque.id);
    borrado.catch(() => setError(true));
  };

  const lista = bloques.data ?? [];
  const franjas = franjasDelDia(lista, dia);
  const ocupados = franjas.filter((f) => f.tipo === 'ocupado').length;
  const nombre = es.habitForm.dias[dia - 1] ?? '';

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

        {/* Los 7 días: un punto marca los que tienen algo ocupado. */}
        <View className="flex-row justify-between" accessibilityRole="tablist">
          {DIAS_SEMANA.map((d) => {
            const activo = d === dia;
            const conBloques = lista.some((b) => b.dias_semana.includes(d));
            return (
              <Pressable
                key={d}
                accessibilityRole="tab"
                accessibilityState={{ selected: activo }}
                accessibilityLabel={
                  conBloques
                    ? formatear(t.diaConBloques, { dia: es.habitForm.dias[d - 1] ?? '' })
                    : es.habitForm.dias[d - 1]
                }
                onPress={() => setDia(d)}
                className={`h-14 w-11 items-center justify-center gap-1 rounded-field ${
                  activo ? 'bg-accent' : 'bg-campo active:bg-accent-claro'
                }`}
              >
                <AppText weight="bold" tone={activo ? 'blanco' : 'ink'}>
                  {es.habitForm.iniciales[d - 1]}
                </AppText>
                <View
                  className={`h-1.5 w-1.5 rounded-chip ${
                    conBloques ? (activo ? 'bg-blanco' : 'bg-accent') : ''
                  }`}
                />
              </Pressable>
            );
          })}
        </View>

        <View className="gap-1">
          <AppText variant="h3" accessibilityRole="header">
            {nombre}
          </AppText>
          <AppText variant="small" tone="ink-soft">
            {ocupados === 0
              ? t.diaLibre
              : formatear(ocupados === 1 ? t.unBloque : t.variosBloques, { n: ocupados })}
          </AppText>
        </View>

        <View className="gap-2">
          {franjas.map((franja) => (
            <FilaFranja
              key={franja.tipo === 'ocupado' ? `${franja.bloque.id}` : `libre-${franja.inicio}`}
              franja={franja}
              onTocar={tocarBloque}
            />
          ))}
        </View>

        <Button
          variant="secondary"
          label={t.agregar}
          onPress={() => setEditando({ bloque: null })}
        />
        {lista.length === 0 ? <AppText tone="ink-soft">{t.vacia}</AppText> : null}

        {editando !== undefined ? (
          <DialogoBloque
            bloque={editando.bloque}
            soloDia={editando.soloDia}
            diasIniciales={[dia]}
            onGuardar={guardar}
            onEliminar={eliminar}
            onCerrar={() => setEditando(undefined)}
          />
        ) : null}

        {eligiendo ? (
          <Dialog
            visible
            titulo={formatear(t.alcanceTitulo, { nombre: eligiendo.nombre })}
            onCerrar={() => setEligiendo(null)}
          >
            <Button
              label={formatear(t.soloEsteDia, { dia: nombreDia(dia) })}
              onPress={() => {
                setEditando({ bloque: eligiendo, soloDia: dia });
                setEligiendo(null);
              }}
            />
            <Button
              variant="secondary"
              label={t.todosLosDias}
              onPress={() => {
                setEditando({ bloque: eligiendo });
                setEligiendo(null);
              }}
            />
            <Button variant="tertiary" label={t.cancelar} onPress={() => setEligiendo(null)} />
          </Dialog>
        ) : null}

        {actual ? (
          <Dialog
            visible
            titulo={
              actual.sugerida
                ? formatear(t.revisar, {
                    habito: actual.recordatorio.titulo,
                    bloque: actual.bloque.nombre,
                    hora: actual.sugerida,
                  })
                : formatear(t.revisarSinHora, {
                    habito: actual.recordatorio.titulo,
                    bloque: actual.bloque.nombre,
                  })
            }
            onCerrar={siguiente}
          >
            {actual.sugerida ? (
              <Button
                label={formatear(t.mover, { hora: actual.sugerida })}
                onPress={() => actual.sugerida && mover(actual, actual.sugerida)}
              />
            ) : null}
            <Button
              variant="tertiary"
              label={actual.sugerida ? t.dejar : t.entendido}
              onPress={siguiente}
            />
          </Dialog>
        ) : null}
      </Screen>
      <Snackbar mensaje={aviso} onCerrar={() => setAviso(null)} />
      <Snackbar mensaje={error ? t.error : null} variant="error" onCerrar={() => setError(false)} />
    </>
  );
}

// ===== Componentes auxiliares =====

/**
 * Una franja del día: un bloque ocupado (se toca para editarlo) o un rato libre.
 * @param props Franja y acción.
 * @returns La fila.
 */
function FilaFranja({
  franja,
  onTocar,
}: {
  franja: Franja;
  onTocar: (bloque: BloqueAgenda) => void;
}) {
  const t = es.agenda;
  const horas = `${franja.inicio} – ${franja.fin}`;
  if (franja.tipo === 'libre') {
    return (
      <View
        accessible
        accessibilityLabel={formatear(t.libreA11y, { inicio: franja.inicio, fin: franja.fin })}
        className="flex-row items-center gap-3 rounded-card border border-dashed border-borde px-4 py-3"
      >
        <AppText variant="small" tone="ink-soft" className="w-28">
          {horas}
        </AppText>
        <AppText variant="small" tone="ink-soft">
          {t.libre}
        </AppText>
      </View>
    );
  }
  const { bloque } = franja;
  const repite = bloque.dias_semana.length > 1;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={formatear(t.filaA11y, {
        nombre: bloque.nombre,
        dias: textoDias(bloque.dias_semana),
        inicio: franja.inicio,
        fin: franja.fin,
      })}
      onPress={() => onTocar(bloque)}
      style={cardShadow}
      className="flex-row items-center gap-3 rounded-card border-l-4 border-accent bg-campo px-4 py-3 active:bg-accent-claro"
    >
      <AppText variant="small" weight="semibold" className="w-28">
        {horas}
      </AppText>
      <View className="flex-1 gap-0.5">
        <AppText weight="semibold">{bloque.nombre}</AppText>
        {repite ? (
          <AppText variant="small" tone="ink-soft">
            {textoDias(bloque.dias_semana)}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
