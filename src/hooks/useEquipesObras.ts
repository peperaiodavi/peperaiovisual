import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export type DespesaEquipe = { id: string; nome: string; valor: number; data: string };
export type ObraEquipe = { id: string; nome: string; obra: string; membros: string[]; custos: number; status: 'ativo' | 'concluido'; despesas?: DespesaEquipe[] };

const KEY = 'peperaio_equipes';

export default function useEquipesObras() {
  const [equipesObras, _setEquipesObras] = useState<ObraEquipe[]>([]);
  const prevRef = useRef<ObraEquipe[]>([]);

  const supaEnabled = useMemo(() => {
    // Detecta cliente inicializado (variáveis presentes). O cliente sempre existe, mas URL/KEY podem estar vazias.
    try {
      const url = (import.meta as any)?.env?.VITE_SUPABASE_URL as string | undefined;
      const key = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY as string | undefined;
      return Boolean(url && key);
    } catch { return false; }
  }, []);

  const loadFromLocal = useCallback(() => {
    try {
      const raw = localStorage.getItem(KEY);
      _setEquipesObras(raw ? JSON.parse(raw) : []);
    } catch {
      _setEquipesObras([]);
    }
  }, []);

  const loadFromSupabase = useCallback(async () => {
    try {
      const { data: udata } = await supabase.auth.getUser();
      const uid = udata?.user?.id;
      if (!uid) { _setEquipesObras([]); return; }
      const { data: obras, error: e1 } = await supabase
        .from('equipes_obras')
        .select('id, nome, obra, membros, custos, status')
        .eq('owner_id', uid)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (e1) throw e1;
      const { data: despesas, error: e2 } = await supabase
        .from('equipes_despesas')
        .select('id, obra_id, nome, valor, data')
        .eq('owner_id', uid)
        .is('deleted_at', null);
      if (e2) throw e2;
      const map = new Map<string, DespesaEquipe[]>();
      (despesas || []).forEach(d => {
        const arr = map.get(d.obra_id as string) || [];
        arr.push({ id: String(d.id), nome: String(d.nome || ''), valor: Number(d.valor) || 0, data: String(d.data || '') });
        map.set(String(d.obra_id), arr);
      });
      const merged: ObraEquipe[] = (obras || []).map((o: any) => ({
        id: String(o.id),
        nome: String(o.nome || ''),
        obra: String(o.obra || ''),
        membros: Array.isArray(o.membros) ? o.membros as string[] : [],
        custos: Number(o.custos) || 0,
        status: (o.status === 'concluido' || o.status === 'ativo') ? o.status : 'ativo',
        despesas: map.get(String(o.id)) || [],
      }));
      _setEquipesObras(merged);
      // Mantém um espelho local básico para fallback e perf (read-through cache)
      try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch {}
    } catch (e) {
      console.error('[equipes] falha ao carregar do supabase, usando localStorage', e);
      loadFromLocal();
    }
  }, [loadFromLocal]);

  // Bootstrap dados
  useEffect(() => {
    if (supaEnabled) loadFromSupabase();
    else loadFromLocal();
  }, [supaEnabled, loadFromSupabase, loadFromLocal]);

  // Realtime (Supabase) + eventos locais
  useEffect(() => {
    if (!supaEnabled) {
      const onFocus = () => loadFromLocal();
      const onCustom = () => loadFromLocal();
      const onStorage = (e: StorageEvent) => { if (e.key === KEY) loadFromLocal(); };
      window.addEventListener('focus', onFocus);
      window.addEventListener('peperaio_equipes_updated', onCustom as EventListener);
      window.addEventListener('storage', onStorage);
      return () => {
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('peperaio_equipes_updated', onCustom as EventListener);
        window.removeEventListener('storage', onStorage);
      };
    }
    // Supabase Realtime: refetch simples em mudanças relevantes
    const channel = supabase.channel('realtime-equipes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipes_obras' }, () => loadFromSupabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipes_despesas' }, () => loadFromSupabase())
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, [supaEnabled, loadFromSupabase, loadFromLocal]);

  // set wrapper que persiste em Supabase quando habilitado; senão, localStorage
  const setEquipesObras = useCallback((updater: ObraEquipe[] | ((prev: ObraEquipe[]) => ObraEquipe[])) => {
    const prev = prevRef.current;
    const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
    _setEquipesObras(next);
    prevRef.current = next;
    // Evento para outras views desta aba
    try { window.dispatchEvent(new Event('peperaio_equipes_updated')); } catch {}

    if (!supaEnabled) {
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return;
    }
    // Persistência no Supabase com diffs (mais rápido e com menos escrita)
    (async () => {
      try {
        const { data: udata } = await supabase.auth.getUser();
        const uid = udata?.user?.id;
        if (!uid) return;

  const prevMap = new Map<string, ObraEquipe>(prev.map((o: ObraEquipe) => [o.id, o] as [string, ObraEquipe]));
  const nextMap = new Map<string, ObraEquipe>(next.map((o: ObraEquipe) => [o.id, o] as [string, ObraEquipe]));

        // Obras a upsertar (novas ou alteradas)
        const toUpsertObras = next.filter((o: ObraEquipe) => {
          const p = prevMap.get(o.id);
          if (!p) return true;
          const membrosChanged = JSON.stringify(p.membros || []) !== JSON.stringify(o.membros || []);
          return p.nome !== o.nome || p.obra !== o.obra || p.custos !== o.custos || p.status !== o.status || membrosChanged;
        }).map((o: ObraEquipe) => ({ id: o.id, owner_id: uid, nome: o.nome, obra: o.obra, membros: o.membros, custos: o.custos, status: o.status, deleted_at: null }));

        if (toUpsertObras.length > 0) {
          const { error } = await supabase.from('equipes_obras').upsert(toUpsertObras, { onConflict: 'id,owner_id' });
          if (error) throw error;
        }

        // Obras removidas (soft delete)
        const toDeleteObraIds = prev.filter(o => !nextMap.has(o.id)).map(o => o.id);
        if (toDeleteObraIds.length > 0) {
          await supabase.from('equipes_obras').update({ deleted_at: new Date().toISOString() }).in('id', toDeleteObraIds);
        }

        // Despesas: diff por ID (evita upsert de tudo)
        type RowDesp = { id: string; owner_id: string; obra_id: string; nome: string; valor: number; data: string; deleted_at: null };
        const prevDesp = new Map<string, { obra_id: string; nome: string; valor: number; data: string }>();
  prev.forEach((o: ObraEquipe) => (o.despesas || []).forEach((d: DespesaEquipe) => prevDesp.set(d.id, { obra_id: o.id, nome: d.nome, valor: d.valor, data: d.data })));
        const nextDesp = new Map<string, { obra_id: string; nome: string; valor: number; data: string }>();
  next.forEach((o: ObraEquipe) => (o.despesas || []).forEach((d: DespesaEquipe) => nextDesp.set(d.id, { obra_id: o.id, nome: d.nome, valor: d.valor, data: d.data })));

        const toUpsertDesp: RowDesp[] = [];
        nextDesp.forEach((n, id) => {
          const p = prevDesp.get(id);
          if (!p || p.obra_id !== n.obra_id || p.nome !== n.nome || p.valor !== n.valor || p.data !== n.data) {
            toUpsertDesp.push({ id, owner_id: uid, obra_id: n.obra_id, nome: n.nome, valor: n.valor, data: n.data, deleted_at: null });
          }
        });
        if (toUpsertDesp.length > 0) {
          const { error } = await supabase.from('equipes_despesas').upsert(toUpsertDesp, { onConflict: 'id,owner_id' });
          if (error) throw error;
        }

        const toDeleteDespIds: string[] = [];
        prevDesp.forEach((_p, id) => { if (!nextDesp.has(id)) toDeleteDespIds.push(id); });
        if (toDeleteDespIds.length > 0) {
          await supabase.from('equipes_despesas').update({ deleted_at: new Date().toISOString() }).in('id', toDeleteDespIds);
        }
      } catch (e) {
        console.error('[equipes] falha ao persistir no supabase', e);
      }
    })();
  }, [supaEnabled]);

  return { equipesObras, setEquipesObras };
}
