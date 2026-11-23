/**
 * @file DialogoIntrospeccion.tsx
 * @proyecto most.
 * @descripcion Preguntas de introspección por valores (RF-04, CP-10): una a la vez, escala de 1 a
 *   5 con un toque (RI-02), se puede saltar cualquiera y al final se agradece. Nunca diagnostica
 *   ni califica: no hay respuestas buenas ni malas, y se recuerda que quedan en el teléfono.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { es, formatear } from '@/i18n/es';

import {
  ESCALA,
  PREGUNTAS,
  respuestasVacias,
  type MotivoIntrospeccion,
  type Respuestas,
} from '../domain/introspeccion';

// ===== Tipos =====

export type DialogoIntrospeccionProps = {
  /** null: cerrado. */
  motivo: MotivoIntrospeccion | null;
  /** Respuestas al terminar; null si cerró sin responder. */
  onTerminar: (respuestas: Respuestas | null) => void;
};

// ===== Principal =====

/**
 * Diálogo de introspección.
 * @param props Motivo y cierre.
 * @returns El modal.
 */
export function DialogoIntrospeccion({ motivo, onTerminar }: DialogoIntrospeccionProps) {
  const t = es.introspeccion;
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState<Respuestas>(respuestasVacias);
  const terminado = indice >= PREGUNTAS.length;
  const pregunta = PREGUNTAS[indice];
  const elegida = pregunta ? respuestas[pregunta] : null;

  const reiniciar = () => {
    setIndice(0);
    setRespuestas(respuestasVacias());
  };
  const cerrar = (resultado: Respuestas | null) => {
    reiniciar();
    onTerminar(resultado);
  };

  return (
    <Modal
      visible={motivo !== null}
      transparent
      animationType="fade"
      onRequestClose={() => cerrar(terminado ? respuestas : null)}
    >
      <View className="flex-1 items-center justify-center bg-ink/40 px-6">
        <View accessibilityViewIsModal className="w-full gap-5 rounded-card bg-campo p-6">
          {terminado ? (
            <>
              <AppText variant="h3" className="text-center" accessibilityRole="header">
                {t.gracias}
              </AppText>
              <AppText className="text-center" tone="ink-soft">
                {t.privacidad}
              </AppText>
              <Button label={t.listo} onPress={() => cerrar(respuestas)} />
            </>
          ) : pregunta ? (
            <>
              {indice === 0 && motivo === 'pausa' ? (
                <AppText tone="ink-soft">{t.introPausa}</AppText>
              ) : null}
              <AppText variant="small" tone="ink-soft">
                {formatear(t.contador, { n: indice + 1, total: PREGUNTAS.length })}
              </AppText>
              <AppText variant="h3" accessibilityRole="header">
                {t.preguntas[pregunta]}
              </AppText>
              <View accessibilityRole="radiogroup" className="gap-2">
                <View className="flex-row justify-between gap-2">
                  {ESCALA.map((valor) => {
                    const activa = elegida === valor;
                    return (
                      <Pressable
                        key={valor}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: activa }}
                        accessibilityLabel={formatear(t.a11yValor, {
                          n: valor,
                          max: ESCALA.length,
                          texto: t.escala[valor - 1] ?? '',
                        })}
                        onPress={() => setRespuestas({ ...respuestas, [pregunta]: valor })}
                        className={`h-12 flex-1 items-center justify-center rounded-chip border-2 ${
                          activa ? 'border-accent bg-accent-claro' : 'border-borde bg-campo'
                        }`}
                      >
                        <AppText weight={activa ? 'bold' : 'regular'}>{String(valor)}</AppText>
                      </Pressable>
                    );
                  })}
                </View>
                <View className="flex-row justify-between" importantForAccessibility="no">
                  <AppText variant="small" tone="ink-soft">
                    {t.escala[0]}
                  </AppText>
                  <AppText variant="small" tone="ink-soft">
                    {t.escala[ESCALA.length - 1]}
                  </AppText>
                </View>
              </View>
              <Button
                label={t.siguiente}
                disabled={elegida === null}
                onPress={() => setIndice(indice + 1)}
              />
              <View className="flex-row justify-between">
                <Button variant="tertiary" label={t.ahoraNo} onPress={() => cerrar(null)} />
                <Button variant="tertiary" label={t.saltar} onPress={() => setIndice(indice + 1)} />
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
