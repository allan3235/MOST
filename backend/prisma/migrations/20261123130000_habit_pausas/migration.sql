-- CreateTable
CREATE TABLE "habit_pausas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "habit_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "desde" DATE NOT NULL,
    "hasta" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_pausas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "habit_pausas_habit_idx" ON "habit_pausas"("habit_id");

-- CreateIndex
CREATE INDEX "habit_pausas_user_updated_idx" ON "habit_pausas"("user_id", "updated_at");

-- AddForeignKey
ALTER TABLE "habit_pausas" ADD CONSTRAINT "habit_pausas_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "habit_pausas" ADD CONSTRAINT "habit_pausas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- Escrito a mano (Prisma no modela CHECK, RLS, permisos ni disparadores)
-- ---------------------------------------------------------------------------

-- RF-09: los días en pausa no cuentan como fallo. Al reanudar el mismo día en que se pausó, la
-- pausa queda vacía (hasta = desde - 1), por eso se permite un día antes.
ALTER TABLE public.habit_pausas
  ADD CONSTRAINT habit_pausas_fechas_check CHECK (hasta IS NULL OR hasta >= desde - 1);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.habit_pausas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.habit_pausas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leer mis pausas" ON public.habit_pausas FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Crear mis pausas" ON public.habit_pausas FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.habits h WHERE h.id = habit_id AND h.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Editar mis pausas" ON public.habit_pausas FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.habits h WHERE h.id = habit_id AND h.user_id = (SELECT auth.uid()))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_pausas TO authenticated;
