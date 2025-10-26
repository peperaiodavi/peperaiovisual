import React from 'react';
import type { FinanceiroDB, Lancamento, ObraFin } from './financeiroStore';
import { resumoFromDB } from './financeiroStore';
import { supabase } from '../lib/supabaseClient';

// Hook leve sem necessidade de Provider: usa localStorage e eventos customizados para sincronizar entre componentes

type AddLancInput = Omit<Lancamento, 'id' | 'data'> & { id?: string; data?: string };

const EVT_UPDATED = 'peperaio_financeiro_updated';

function normalizeDateToPtBR(s?: string): string {
	if (!s) return new Date().toLocaleDateString('pt-BR');
	// aceita já em pt-BR
	if (s.includes('/')) return s;
	// ISO -> pt-BR
	const [y, m, d] = s.split('-');
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${pad(Number(d) || 0)}/${pad(Number(m) || 0)}/${y}`;
}

export function useFinanceiro() {
	const [db, setDb] = React.useState<FinanceiroDB>({ caixa: { saldoInicial: 0 }, obras: [], lancamentos: [] });

	// Carregar dados do Supabase e assinar realtime
	React.useEffect(() => {
		const refetch = async () => {
			try {
				const { data: udata } = await supabase.auth.getUser();
				const uid = udata?.user?.id;
				if (!uid) { setDb({ caixa: { saldoInicial: 0 }, obras: [], lancamentos: [] }); return; }
				const [{ data: obras }, { data: lancs }, { data: caixa } ] = await Promise.all([
					supabase.from('financeiro_obras').select('id, nome, status').eq('owner_id', uid),
					supabase.from('financeiro_lancamentos').select('id, data, tipo, valor, descricao, obra_id, escopo, contabiliza_caixa, created_by, created_by_name').eq('owner_id', uid).order('created_at', { ascending: false }),
					supabase.from('financeiro_caixa_config').select('id, saldo_inicial').eq('owner_id', uid).eq('id', 'default').maybeSingle(),
				]);
				setDb({
					caixa: { saldoInicial: Number((caixa as any)?.saldo_inicial) || 0 },
					obras: (obras as any[] || []).map(o => ({ id: o.id, nome: o.nome, status: (o.status as any) } as ObraFin)),
					lancamentos: (lancs as any[] || []).map(l => ({ id: l.id, data: l.data, tipo: l.tipo, valor: Number(l.valor)||0, descricao: l.descricao, obraId: l.obra_id || undefined, escopo: l.escopo, contabilizaCaixa: l.contabiliza_caixa, createdBy: l.created_by, createdByName: l.created_by_name } as Lancamento)),
				});
			} catch (e) {
				console.error('[financeiro] falha ao carregar do supabase', e);
			}
		};
		refetch();
		const ch = supabase.channel('realtime-financeiro')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro_obras' }, refetch)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro_lancamentos' }, refetch)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro_caixa_config' }, refetch)
			.subscribe();
		return () => { try { supabase.removeChannel(ch); } catch {} };
	}, []);

	const addLancamento = async (l: AddLancInput) => {
		const item: Lancamento = {
			id: l.id ?? Date.now().toString(),
			data: normalizeDateToPtBR(l.data),
			tipo: l.tipo,
			valor: Number(l.valor) || 0,
			descricao: l.descricao,
			obraId: l.obraId,
			escopo: l.escopo ?? 'caixa',
			contabilizaCaixa: l.contabilizaCaixa ?? true,
			createdBy: (l as any).createdBy,
			createdByName: (l as any).createdByName,
		};
		const { data: udata } = await supabase.auth.getUser();
		const uid = udata?.user?.id;
		await supabase.from('financeiro_lancamentos').upsert({
			id: item.id,
			owner_id: uid,
			data: item.data,
			tipo: item.tipo,
			valor: item.valor,
			descricao: item.descricao,
			obra_id: item.obraId || null,
			escopo: item.escopo,
			contabiliza_caixa: item.contabilizaCaixa,
			created_by: item.createdBy || null,
			created_by_name: item.createdByName || null,
		}, { onConflict: 'id,owner_id' });
		// otimista
		setDb(prev => ({ ...prev, lancamentos: [item, ...(prev.lancamentos || [])] }));
		try { window.dispatchEvent(new Event(EVT_UPDATED)); } catch {}
		return item;
	};

	const updateLancamento = async (id: string, patch: Partial<Lancamento>) => {
		await supabase.from('financeiro_lancamentos').update({
			data: patch.data,
			tipo: patch.tipo,
			valor: patch.valor !== undefined ? Number(patch.valor) : undefined,
			descricao: patch.descricao,
			obra_id: patch.obraId,
			escopo: patch.escopo,
			contabiliza_caixa: patch.contabilizaCaixa,
		}).eq('id', id);
		setDb(prev => ({
			...prev,
			lancamentos: (prev.lancamentos || []).map((x) => (x.id === id ? { ...x, ...patch, valor: patch.valor !== undefined ? Number(patch.valor) : x.valor } : x)),
		}));
		try { window.dispatchEvent(new Event(EVT_UPDATED)); } catch {}
	};

	const removeLancamento = async (id: string) => {
		await supabase.from('financeiro_lancamentos').delete().eq('id', id);
		setDb(prev => ({ ...prev, lancamentos: (prev.lancamentos || []).filter((x) => x.id !== id) }));
		try { window.dispatchEvent(new Event(EVT_UPDATED)); } catch {}
	};

	const setSaldoInicial = async (valor: number) => {
		const { data: udata } = await supabase.auth.getUser();
		const uid = udata?.user?.id;
		await supabase.from('financeiro_caixa_config').upsert({ id: 'default', owner_id: uid, saldo_inicial: Number(valor) || 0 }, { onConflict: 'id,owner_id' });
		setDb(prev => ({ ...prev, caixa: { saldoInicial: Number(valor) || 0 } }));
		try { window.dispatchEvent(new Event(EVT_UPDATED)); } catch {}
	};

	const atualizarObra = async (id: string, patch: Partial<ObraFin>) => {
		const { data: udata } = await supabase.auth.getUser();
		const uid = udata?.user?.id;
		const row = { id, owner_id: uid, nome: patch.nome || `Obra ${id}`, status: patch.status || 'ativo' };
		await supabase.from('financeiro_obras').upsert(row, { onConflict: 'id,owner_id' });
		setDb(prev => {
			const exists = (prev.obras || []).some(o => o.id === id);
			return exists
				? { ...prev, obras: (prev.obras || []).map(o => (o.id === id ? { ...o, ...row } : o)) }
				: { ...prev, obras: [...(prev.obras || []), row as ObraFin] };
		});
		try { window.dispatchEvent(new Event(EVT_UPDATED)); } catch {}
	};

	const getResumoFinanceiro = () => resumoFromDB(db);

	const clearReceitasPlanejadas = () => {};

	return {
		db,
		addLancamento,
		updateLancamento,
		removeLancamento,
		setSaldoInicial,
		atualizarObra,
		getResumoFinanceiro,
		clearReceitasPlanejadas,
	} as const;
}

export function FinanceiroProvider({ children }: { children: React.ReactNode }) {
	// Provider "no-op" para compatibilidade com versões anteriores da app.
	// O hook já lida com persistência/sincronização via localStorage e eventos.
	return <>{children}</>;
}

// Helper central para mapear uma obra de Equipes -> Financeiro e garantir persistência imediata
// Contrato:
// - input: eId (id da obra em Equipes), eNome (nome da obra)
// - efeito: upsert em financeiro_obras com id "fin_${eId}", status 'ativo' e owner_id do usuário atual
// - output: retorna o id financeiro gerado (fin_${eId})
export async function ensureFinanceObraId(eId: string, eNome: string): Promise<string> {
	const finId = `fin_${eId}`;
	try {
		const { data: udata } = await supabase.auth.getUser();
		const uid = udata?.user?.id;
		await supabase.from('financeiro_obras').upsert({ id: finId, owner_id: uid, nome: eNome, status: 'ativo' }, { onConflict: 'id,owner_id' });
		// O hook useFinanceiro fará refetch via realtime; manter apenas a persistência aqui
	} catch (e) {
		console.error('[financeiro] ensureFinanceObraId falhou', e);
	}
	return finId;
}

export default useFinanceiro;

