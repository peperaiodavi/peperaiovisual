-- Adicionar owner_id e políticas/índices às tabelas adicionais

-- 1) Adicionar colunas owner_id (se ainda não existirem)
ALTER TABLE public.funcionarios
  ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.parceladas
  ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.receber
  ADD COLUMN IF NOT EXISTS owner_id uuid;

-- 2) Trigger genérica para preencher owner_id via auth.uid() (quando não enviado)
CREATE OR REPLACE FUNCTION public.fn_set_owner_id_generic()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Criar triggers (evita conflito de nomes com outras triggers)
DROP TRIGGER IF EXISTS trg_set_owner_id_funcionarios ON public.funcionarios;
CREATE TRIGGER trg_set_owner_id_funcionarios
BEFORE INSERT ON public.funcionarios
FOR EACH ROW EXECUTE FUNCTION public.fn_set_owner_id_generic();

DROP TRIGGER IF EXISTS trg_set_owner_id_clientes ON public.clientes;
CREATE TRIGGER trg_set_owner_id_clientes
BEFORE INSERT ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.fn_set_owner_id_generic();

DROP TRIGGER IF EXISTS trg_set_owner_id_parceladas ON public.parceladas;
CREATE TRIGGER trg_set_owner_id_parceladas
BEFORE INSERT ON public.parceladas
FOR EACH ROW EXECUTE FUNCTION public.fn_set_owner_id_generic();

DROP TRIGGER IF EXISTS trg_set_owner_id_receber ON public.receber;
CREATE TRIGGER trg_set_owner_id_receber
BEFORE INSERT ON public.receber
FOR EACH ROW EXECUTE FUNCTION public.fn_set_owner_id_generic();

-- 3) (Opcional) Backfill
-- UPDATE public.funcionarios SET owner_id = '00000000-0000-0000-0000-000000000000' WHERE owner_id IS NULL;
-- UPDATE public.clientes     SET owner_id = '00000000-0000-0000-0000-000000000000' WHERE owner_id IS NULL;
-- UPDATE public.parceladas   SET owner_id = '00000000-0000-0000-0000-000000000000' WHERE owner_id IS NULL;
-- UPDATE public.receber      SET owner_id = '00000000-0000-0000-0000-000000000000' WHERE owner_id IS NULL;

-- 4) Travar como NOT NULL (após backfill)
-- ALTER TABLE public.funcionarios ALTER COLUMN owner_id SET NOT NULL;
-- ALTER TABLE public.clientes     ALTER COLUMN owner_id SET NOT NULL;
-- ALTER TABLE public.parceladas   ALTER COLUMN owner_id SET NOT NULL;
-- ALTER TABLE public.receber      ALTER COLUMN owner_id SET NOT NULL;

-- 5) Índices UNIQUE por (owner_id, id) quando fizer sentido para upsert estável
CREATE UNIQUE INDEX IF NOT EXISTS uniq_funcionarios_owner_id_id ON public.funcionarios (owner_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_clientes_owner_id_id     ON public.clientes     (owner_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_parceladas_owner_id_id   ON public.parceladas   (owner_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_receber_owner_id_id      ON public.receber      (owner_id, id);

-- 6) RLS
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parceladas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receber      ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY funcionarios_sel ON public.funcionarios FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY clientes_sel     ON public.clientes     FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY parceladas_sel   ON public.parceladas   FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY receber_sel      ON public.receber      FOR SELECT USING (owner_id = auth.uid());

-- INSERT
CREATE POLICY funcionarios_ins ON public.funcionarios FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY clientes_ins     ON public.clientes     FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY parceladas_ins   ON public.parceladas   FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY receber_ins      ON public.receber      FOR INSERT WITH CHECK (owner_id = auth.uid());

-- UPDATE
CREATE POLICY funcionarios_upd ON public.funcionarios FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY clientes_upd     ON public.clientes     FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY parceladas_upd   ON public.parceladas   FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY receber_upd      ON public.receber      FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- DELETE
CREATE POLICY funcionarios_del ON public.funcionarios FOR DELETE USING (owner_id = auth.uid());
CREATE POLICY clientes_del     ON public.clientes     FOR DELETE USING (owner_id = auth.uid());
CREATE POLICY parceladas_del   ON public.parceladas   FOR DELETE USING (owner_id = auth.uid());
CREATE POLICY receber_del      ON public.receber      FOR DELETE USING (owner_id = auth.uid());
