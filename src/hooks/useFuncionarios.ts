import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export type Funcionario = { id: string; nome: string; created_at?: string | null; deleted_at?: string | null };

export default function useFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: udata } = await supabase.auth.getUser();
      const uid = udata?.user?.id;
      if (!uid) { setFuncionarios([]); return; }
      const { data, error } = await supabase
        .from('funcionarios')
        .select('id, nome, created_at')
        .eq('owner_id', uid)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFuncionarios((data as any[])?.map(r => ({ id: String(r.id), nome: String(r.nome), created_at: r.created_at })) || []);
    } catch (e: any) {
      console.error('[funcionarios] erro ao buscar', e);
      setError(e?.message || 'Falha ao carregar funcionários');
    } finally { setLoading(false); }
  }, []);

  const add = useCallback(async (nome: string) => {
    const id = Date.now().toString();
    const { data: udata } = await supabase.auth.getUser();
    const uid = udata?.user?.id;
    await supabase.from('funcionarios').upsert({ id, owner_id: uid, nome, deleted_at: null }, { onConflict: 'id,owner_id' });
    await refetch();
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await supabase.from('funcionarios').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    await refetch();
  }, [refetch]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const ch = supabase.channel('realtime-funcionarios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funcionarios' }, () => refetch())
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [refetch]);

  return { funcionarios, loading, error, refetch, add, remove } as const;
}
