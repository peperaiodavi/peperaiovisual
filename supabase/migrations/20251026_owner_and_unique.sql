-- 1) Adicionar colunas owner_id (se ainda não existirem)
ALTER TABLE public.financeiro_obras
  ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.financeiro_lancamentos
  ADD COLUMN IF NOT EXISTS owner_id uuid;

-- 2) Trigger para preencher owner_id via auth.uid() (quando não enviado)
CREATE OR REPLACE FUNCTION public.fn_set_owner_id()
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

DROP TRIGGER IF EXISTS trg_set_owner_id_fin_obras ON public.financeiro_obras;
CREATE TRIGGER trg_set_owner_id_fin_obras
BEFORE INSERT ON public.financeiro_obras
FOR EACH ROW EXECUTE FUNCTION public.fn_set_owner_id();

DROP TRIGGER IF EXISTS trg_set_owner_id_fin_lanc ON public.financeiro_lancamentos;
CREATE TRIGGER trg_set_owner_id_fin_lanc
BEFORE INSERT ON public.financeiro_lancamentos
FOR EACH ROW EXECUTE FUNCTION public.fn_set_owner_id();

-- 3) (Opcional) Backfill — o integrador preencherá depois com o UUID correto
-- UPDATE public.financeiro_obras       SET owner_id = '00000000-0000-0000-0000-000000000000' WHERE owner_id IS NULL;
-- UPDATE public.financeiro_lancamentos SET owner_id = '00000000-0000-0000-0000-000000000000' WHERE owner_id IS NULL;

-- 4) Trave como NOT NULL (depois do backfill)
-- ALTER TABLE public.financeiro_obras       ALTER COLUMN owner_id SET NOT NULL;
-- ALTER TABLE public.financeiro_lancamentos ALTER COLUMN owner_id SET NOT NULL;

-- 5) Índices UNIQUE para o upsert funcionar corretamente
CREATE UNIQUE INDEX IF NOT EXISTS uniq_fin_obras_owner_id_id
  ON public.financeiro_obras (owner_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_fin_lanc_owner_id_id
  ON public.financeiro_lancamentos (owner_id, id);

-- 6) (Se usar RLS) Políticas por dono (ajuste nomes conforme necessário)
ALTER TABLE public.financeiro_obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY fin_obras_sel ON public.financeiro_obras
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY fin_lanc_sel ON public.financeiro_lancamentos
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY fin_obras_ins ON public.financeiro_obras
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY fin_lanc_ins ON public.financeiro_lancamentos
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY fin_obras_upd ON public.financeiro_obras
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY fin_lanc_upd ON public.financeiro_lancamentos
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY fin_obras_del ON public.financeiro_obras
  FOR DELETE USING (owner_id = auth.uid());
CREATE POLICY fin_lanc_del ON public.financeiro_lancamentos
  FOR DELETE USING (owner_id = auth.uid());
