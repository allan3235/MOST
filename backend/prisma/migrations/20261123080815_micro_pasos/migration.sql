-- AlterTable
ALTER TABLE "habits" ADD COLUMN     "paso_actual" SMALLINT;

-- CreateTable
CREATE TABLE "micro_pasos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "habit_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "orden" SMALLINT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "duracion_min" INTEGER NOT NULL,
    "duracion_reducida_min" INTEGER NOT NULL,
    "dias_semana" SMALLINT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "micro_pasos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "micro_pasos_user_updated_idx" ON "micro_pasos"("user_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "micro_pasos_habit_id_orden_key" ON "micro_pasos"("habit_id", "orden");

-- AddForeignKey
ALTER TABLE "micro_pasos" ADD CONSTRAINT "micro_pasos_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "micro_pasos" ADD CONSTRAINT "micro_pasos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- Escrito a mano (Prisma no modela CHECK, RLS, permisos ni disparadores)
-- ---------------------------------------------------------------------------

ALTER TABLE public.micro_pasos ALTER COLUMN dias_semana SET NOT NULL;

-- Reglas de un micro-paso: de 1 a 5 por hábito; duración 0 = recordatorio sin duración; la versión
-- reducida nunca supera a la normal y, si hay duración, no baja de 1 minuto (candado mínimo, RR-03).
ALTER TABLE public.micro_pasos
  ADD CONSTRAINT micro_pasos_orden_check CHECK (orden BETWEEN 1 AND 5),
  ADD CONSTRAINT micro_pasos_duracion_check CHECK (duracion_min >= 0),
  ADD CONSTRAINT micro_pasos_reducida_check CHECK (
    duracion_reducida_min <= duracion_min
    AND (duracion_min = 0 OR duracion_reducida_min >= 1)
  ),
  ADD CONSTRAINT micro_pasos_dias_check CHECK (
    dias_semana <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[] AND cardinality(dias_semana) > 0
  ),
  ADD CONSTRAINT micro_pasos_titulo_check CHECK (char_length(titulo) BETWEEN 1 AND 80);

ALTER TABLE public.habits
  ADD CONSTRAINT habits_paso_actual_check CHECK (paso_actual IS NULL OR paso_actual BETWEEN 1 AND 5);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.micro_pasos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cada quien ve y cambia solo los micro-pasos de sus propios hábitos.
ALTER TABLE public.micro_pasos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leer mis micro-pasos" ON public.micro_pasos FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Crear mis micro-pasos" ON public.micro_pasos FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.habits h WHERE h.id = habit_id AND h.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Editar mis micro-pasos" ON public.micro_pasos FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.habits h WHERE h.id = habit_id AND h.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Borrar mis micro-pasos" ON public.micro_pasos FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.micro_pasos TO authenticated;

-- Registro de uso de la IA: nuevas tareas (plan, meta, paso_ligero) además de las de Habit Green.
ALTER TABLE public.ai_requests DROP CONSTRAINT ai_requests_funcion_check;
ALTER TABLE public.ai_requests ADD CONSTRAINT ai_requests_funcion_check CHECK (
  funcion IN ('generate-plan', 'adjust-plan', 'plan', 'meta', 'paso_ligero')
);
