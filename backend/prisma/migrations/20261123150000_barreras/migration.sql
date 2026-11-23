-- most. Fase 4 (RF-17 + RF-19): al resolver un día que no salió, la persona puede decir qué se
-- atravesó. La causa queda en la ocurrencia; con causa, ese día no cuenta en el cumplimiento.

-- AlterTable
ALTER TABLE "habit_occurrences" ADD COLUMN     "barrera" TEXT;

-- ---------------------------------------------------------------------------
-- Escrito a mano (Prisma no modela CHECK)
-- ---------------------------------------------------------------------------

ALTER TABLE public.habit_occurrences
  ADD CONSTRAINT habit_occurrences_barrera_check
  CHECK (barrera IS NULL OR barrera IN ('tiempo', 'recursos', 'acceso'));
