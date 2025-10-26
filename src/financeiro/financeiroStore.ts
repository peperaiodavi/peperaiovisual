// Tipos e utilitários puros do módulo Financeiro (sem React)

export type TipoLanc = 'entrada' | 'saida';
export type EscopoLanc = 'caixa' | 'obra';

export type Lancamento = {
	id: string;
	data: string; // DD/MM/AAAA
	tipo: TipoLanc;
	valor: number;
	descricao?: string;
	obraId?: string;
	// Controle de como refletir nos cartões/caixa
	escopo?: EscopoLanc; // padrão 'caixa'
	contabilizaCaixa?: boolean; // padrão true
	// Metadados opcionais (usados na UI/relatório)
	createdBy?: string;
	createdByName?: string;
};

export type ObraFin = {
	id: string;
	nome: string;
	status?: 'ativo' | 'finalizada';
};

export type FinanceiroDB = {
	caixa: { saldoInicial: number };
	obras: ObraFin[];
	lancamentos: Lancamento[];
};

export const FIN_KEY = 'peperaio_financeiro_db_v1';

export function getInitialDB(): FinanceiroDB {
	return {
		caixa: { saldoInicial: 0 },
		obras: [],
		lancamentos: [],
	};
}

export function loadDB(): FinanceiroDB {
	try {
		const raw = localStorage.getItem(FIN_KEY);
		if (!raw) return getInitialDB();
		const parsed = JSON.parse(raw) as FinanceiroDB;
		// sanity
		if (!parsed.caixa) parsed.caixa = { saldoInicial: 0 } as any;
		if (!Array.isArray(parsed.obras)) parsed.obras = [];
		if (!Array.isArray(parsed.lancamentos)) parsed.lancamentos = [];
		return parsed;
	} catch {
		return getInitialDB();
	}
}

export function saveDB(db: FinanceiroDB) {
	try { localStorage.setItem(FIN_KEY, JSON.stringify(db)); } catch {}
}

export function resumoFromDB(db: FinanceiroDB): { entradas: number; saidas: number; saldo: number } {
	// Considera somente lançamentos que impactam caixa/cartões:
	// - contabilizaCaixa !== false (default true)
	// - escopo !== 'obra' (gastos da obra no diário não devem inflar cartões)
	const elegiveis = (db.lancamentos || []).filter((l) => (l.contabilizaCaixa ?? true) && (l.escopo ?? 'caixa') !== 'obra');
	const entradas = elegiveis.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor || 0), 0);
	const saidas = elegiveis.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor || 0), 0);
	const saldo = (db.caixa?.saldoInicial || 0) + entradas - saidas;
	return { entradas, saidas, saldo };
}

