import React from 'react';
import { Card } from '../components/ui/card';
import { useFinanceiro } from './useFinanceiro';
import useEquipesObras from '../hooks/useEquipesObras';
import useReceber from '../hooks/useReceber';

export default function CardsFinanceiros() {
	const { getResumoFinanceiro } = useFinanceiro();
	const resumo = getResumoFinanceiro();
	const { equipesObras } = useEquipesObras();
	const { receber } = useReceber();

	// Receitas planejadas = restante positivo das obras ativas (sem duplicar com A Receber) + total A Receber
	const obrasComReceber = React.useMemo(() => new Set((receber || []).map(r => r.obraId).filter(Boolean) as string[]), [receber]);
	const planejadasObras = React.useMemo(() => {
		try {
			return (equipesObras || [])
				.filter(o => (o?.status ?? 'ativo') === 'ativo' && !obrasComReceber.has(o.id))
				.reduce((s, o) => {
					const totalDespesas = (o.despesas || []).reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
					const restante = (o.custos || 0) - totalDespesas;
					return s + Math.max(0, restante);
				}, 0);
		} catch {
			return 0;
		}
	}, [equipesObras, obrasComReceber]);
	const planejadasReceber = (receber || []).reduce((s, r) => s + Number(r.valor || 0), 0);
	const receitasPlanejadas = planejadasObras + planejadasReceber;

	const cards = [
		{ label: 'Entradas', value: resumo.entradas, className: 'text-[#9DBF7B]' },
		{ label: 'Saídas', value: resumo.saidas, className: 'text-[#B64B3A]' },
		{ label: 'Saldo', value: resumo.saldo, className: 'text-[#4F6139]' },
		{ label: 'Receitas Planejadas', value: receitasPlanejadas, className: 'text-[#2C2C2C]' },
	] as const;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{cards.map((c) => (
				<Card key={c.label} className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
					<p className="text-[#626262] text-sm mb-1">{c.label}</p>
					<h3 className={`text-2xl ${c.className}`}>R$ {Number(c.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
				</Card>
			))}
		</div>
	);
}

