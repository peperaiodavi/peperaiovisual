import React from 'react';
import type { FinanceiroDB, Lancamento, ObraFin } from './financeiroStore';
import { FIN_KEY, getInitialDB, loadDB, saveDB, resumoFromDB } from './financeiroStore';

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
	const [db, setDb] = React.useState<FinanceiroDB>(() => loadDB());

	// Sync inicial e listeners
	React.useEffect(() => {
		setDb(loadDB());
		const onStorage = (e: StorageEvent) => {
			if (!e.key || e.key === FIN_KEY) {
				setDb(loadDB());
			}
		};
		const onCustom = () => setDb(loadDB());
		window.addEventListener('storage', onStorage);
		window.addEventListener(EVT_UPDATED, onCustom as EventListener);
		return () => {
			window.removeEventListener('storage', onStorage);
			window.removeEventListener(EVT_UPDATED, onCustom as EventListener);
		};
	}, []);

	const persist = (next: FinanceiroDB) => {
		saveDB(next);
		try { window.dispatchEvent(new Event(EVT_UPDATED)); } catch {}
		setDb(next);
	};

	const addLancamento = (l: AddLancInput) => {
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
		const next: FinanceiroDB = { ...db, lancamentos: [...(db.lancamentos || []), item] };
		persist(next);
		return item;
	};

	const updateLancamento = (id: string, patch: Partial<Lancamento>) => {
		const next: FinanceiroDB = {
			...db,
			lancamentos: (db.lancamentos || []).map((x) => (x.id === id ? { ...x, ...patch, valor: patch.valor !== undefined ? Number(patch.valor) : x.valor } : x)),
		};
		persist(next);
	};

	const removeLancamento = (id: string) => {
		const next: FinanceiroDB = { ...db, lancamentos: (db.lancamentos || []).filter((x) => x.id !== id) };
		persist(next);
	};

	const setSaldoInicial = (valor: number) => {
		const next: FinanceiroDB = { ...db, caixa: { saldoInicial: Number(valor) || 0 } };
		persist(next);
	};

	const atualizarObra = (id: string, patch: Partial<ObraFin>) => {
		const next: FinanceiroDB = {
			...db,
			obras: (db.obras || []).map((o) => (o.id === id ? { ...o, ...patch } : o)),
		};
		persist(next);
	};

	const getResumoFinanceiro = () => resumoFromDB(db);

	const clearReceitasPlanejadas = () => {
		// compat: caso houvesse algo persistido separadamente em versões anteriores
		try { localStorage.removeItem('peperaio_receitas_planejadas'); } catch {}
	};

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

export default useFinanceiro;

