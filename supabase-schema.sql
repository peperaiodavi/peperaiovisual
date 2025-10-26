-- Supabase schema for migration from localStorage com multi-tenant por usuário (owner_id)

-- Obras/Equipes
create table if not exists public.equipes_obras (
  id text not null,
  owner_id uuid not null default auth.uid(),
  nome text not null,
  obra text not null,
  membros jsonb not null default '[]',
  custos numeric not null default 0,
  status text not null default 'ativo',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  primary key (id, owner_id)
);

-- Despesas por Obra
create table if not exists public.equipes_despesas (
  id text not null,
  owner_id uuid not null default auth.uid(),
  obra_id text not null,
  nome text not null,
  valor numeric not null default 0,
  data text not null, -- dd/mm/aaaa para manter compat com UI atual
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  primary key (id, owner_id),
  constraint fk_eq_desp_obra foreign key (obra_id, owner_id)
    references public.equipes_obras(id, owner_id) on delete cascade
);

-- Funcionários (para seleção nas obras)
create table if not exists public.funcionarios (
  id text not null,
  owner_id uuid not null default auth.uid(),
  nome text not null,
  cargo text,
  categoria text not null default 'funcionario' check (categoria in ('dono','temporario','funcionario')),
  modalidade_pagamento text not null default 'mensal' check (modalidade_pagamento in ('mensal','diaria')),
  salario numeric,
  vales numeric not null default 0,
  ativo boolean not null default true,
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  primary key (id, owner_id)
);

-- Financeiro
create table if not exists public.financeiro_obras (
  id text not null,
  owner_id uuid not null default auth.uid(),
  nome text not null,
  status text,
  primary key (id, owner_id)
);

create table if not exists public.financeiro_lancamentos (
  id text not null,
  owner_id uuid not null default auth.uid(),
  data text not null, -- dd/mm/aaaa
  tipo text not null check (tipo in ('entrada','saida')),
  valor numeric not null default 0,
  descricao text,
  obra_id text,
  escopo text check (escopo in ('caixa','obra')),
  contabiliza_caixa boolean,
  created_by text,
  created_by_name text,
  created_at timestamp with time zone not null default now(),
  primary key (id, owner_id),
  constraint fk_fin_lanc_obra foreign key (obra_id, owner_id)
    references public.financeiro_obras(id, owner_id)
);

-- Caixa config (saldo inicial)
create table if not exists public.financeiro_caixa_config (
  id text not null,
  owner_id uuid not null default auth.uid(),
  saldo_inicial numeric not null default 0,
  updated_at timestamp with time zone default now(),
  primary key (id, owner_id)
);

-- Realtime
alter publication supabase_realtime add table public.equipes_obras;
alter publication supabase_realtime add table public.equipes_despesas;
alter publication supabase_realtime add table public.funcionarios;
alter publication supabase_realtime add table public.financeiro_obras;
alter publication supabase_realtime add table public.financeiro_lancamentos;
alter publication supabase_realtime add table public.financeiro_caixa_config;

-- Enable RLS (restrito por owner)
alter table public.equipes_obras enable row level security;
alter table public.equipes_despesas enable row level security;
alter table public.funcionarios enable row level security;
alter table public.financeiro_obras enable row level security;
alter table public.financeiro_lancamentos enable row level security;
alter table public.financeiro_caixa_config enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'equipes_obras' and policyname = 'equipes_obras_owner_rw') then
    create policy equipes_obras_owner_rw on public.equipes_obras for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'equipes_despesas' and policyname = 'equipes_despesas_owner_rw') then
    create policy equipes_despesas_owner_rw on public.equipes_despesas for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'funcionarios' and policyname = 'funcionarios_owner_rw') then
    create policy funcionarios_owner_rw on public.funcionarios for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'financeiro_obras' and policyname = 'fin_obras_owner_rw') then
    create policy fin_obras_owner_rw on public.financeiro_obras for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'financeiro_lancamentos' and policyname = 'fin_lanc_owner_rw') then
    create policy fin_lanc_owner_rw on public.financeiro_lancamentos for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'financeiro_caixa_config' and policyname = 'fin_caixa_owner_rw') then
    create policy fin_caixa_owner_rw on public.financeiro_caixa_config for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
end $$;

-- MIGRATION NOTES (para bases já existentes):
-- Se as tabelas já existirem sem owner_id/PK composta, execute migrações incrementais:
--
-- alter table public.equipes_obras add column if not exists owner_id uuid default auth.uid();
-- alter table public.equipes_despesas add column if not exists owner_id uuid default auth.uid();
-- alter table public.funcionarios add column if not exists owner_id uuid default auth.uid();
-- alter table public.financeiro_obras add column if not exists owner_id uuid default auth.uid();
-- alter table public.financeiro_lancamentos add column if not exists owner_id uuid default auth.uid();
-- alter table public.financeiro_caixa_config add column if not exists owner_id uuid default auth.uid();
--
-- Em seguida, ajustar chaves primárias para (id, owner_id) e FKs compostas:
-- ATENÇÃO: requer soltar PK/constraints atuais se já existirem; planeje downtime.
-- Exemplo para financeiro_obras:
-- alter table public.financeiro_obras drop constraint if exists financeiro_obras_pkey;
-- alter table public.financeiro_obras add primary key (id, owner_id);
--
-- Repita para as demais tabelas e crie/ajuste FKs conforme definidas acima.
