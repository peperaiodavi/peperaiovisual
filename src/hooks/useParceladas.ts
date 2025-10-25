import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export type Parcelada = {
  id: string;
  fornecedor_id?: string | null;
  descricao?: string | null;
  total?: number | null;
  qtd_parcelas?: number | null;
  valor_parcela?: number | null;
  primeira_data?: string | null; // ISO
  periodicidade?: string | null; // ex: 'mensal'
  status?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

const isUUID = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export function useParceladas() {
  const [itens, setItens] = useState<Parcelada[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('parceladas')
        .select(
          'id, fornecedor_id, descricao, total, qtd_parcelas, valor_parcela, primeira_data, periodicidade, status'
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItens((data as Parcelada[]) || []);
    } catch (e: any) {
      console.error('[parceladas] erro ao buscar:', e);
      setError(e?.message || 'Falha ao carregar parceladas');
    } finally {
      setLoading(false);
    }
  }, []);

  const softDelete = useCallback(async (id: string) => {
    if (!isUUID(id)) {
      alert(`ID inválido: ${id}`);
      return;
    }
    const { error } = await supabase
      .from('parceladas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      alert(`Não foi possível excluir: ${error.message}`);
      return;
    }
    await refetch();
  }, [refetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { itens, loading, error, refetch, softDelete } as const;
}

export default useParceladas;
