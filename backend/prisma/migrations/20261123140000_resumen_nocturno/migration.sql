-- most. Fase 3 (RF-18): el resumen nocturno es un interruptor propio, independiente del estilo de
-- avisos (antes solo existía como el estilo "resumen_nocturno", que quitaba los avisos por hábito).

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "resumen_nocturno" BOOLEAN NOT NULL DEFAULT false;
