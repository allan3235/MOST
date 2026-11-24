-- most. Fase 4 (RF-02): agenda de bloques ocupados. La persona registra sus horarios fijos (ej.
-- «Clases, L-M-V 10:00–11:00») y los recordatorios no se pueden poner encima de ellos: se sugiere
-- la primera hora libre. Borrar un bloque lo marca con eliminado_en (la cola solo hace upsert/update).

-- CreateTable
CREATE TABLE "agenda_bloques" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "dias_semana" SMALLINT[],
    "hora_inicio" TIME(6) NOT NULL,
    "hora_fin" TIME(6) NOT NULL,
    "eliminado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_bloques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agenda_bloques_user_updated_idx" ON "agenda_bloques"("user_id", "updated_at");

-- AddForeignKey
ALTER TABLE "agenda_bloques" ADD CONSTRAINT "agenda_bloques_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- Escrito a mano (Prisma no modela CHECK, RLS, permisos ni disparadores)
-- ---------------------------------------------------------------------------

ALTER TABLE public.agenda_bloques
  ADD CONSTRAINT agenda_bloques_nombre_check CHECK (length(btrim(nombre)) BETWEEN 1 AND 60),
  ADD CONSTRAINT agenda_bloques_dias_check CHECK (
    cardinality(dias_semana) >= 1 AND dias_semana <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  ADD CONSTRAINT agenda_bloques_horas_check CHECK (hora_fin > hora_inicio);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.agenda_bloques
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.agenda_bloques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leer mi agenda" ON public.agenda_bloques FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Crear en mi agenda" ON public.agenda_bloques FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Editar mi agenda" ON public.agenda_bloques FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_bloques TO authenticated;
