import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Building2, Users, TrendingDown, Wallet } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import useLancamentos from '../hooks/useLancamentos';
import useEquipesObras from '../hooks/useEquipesObras';
import { useFinanceiro } from '../financeiro/useFinanceiro';
import { pad2, todayISO, todayPtBR, monthKeyFromDate } from '../utils/date';
import { currencyBR } from '../utils/format';
import useObras from '../hooks/useObras';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

// removido: chartData estático — será calculado dinamicamente a partir dos lançamentos

export function Dashboard() {
  // Obras exibidas aqui devem vir da aba "Obras/Equipes" (peperaio_equipes)
  const { lancamentos, addLancamento } = useLancamentos();
  const { db: finDB, addLancamento: finAddLanc } = useFinanceiro();
  const { obras: obrasLegacy } = useObras();
  const { equipesObras, setEquipesObras } = useEquipesObras();
  const [gastoInline, setGastoInline] = useState<Record<string,string>>({});
  const [gastoDescInline, setGastoDescInline] = useState<Record<string,string>>({});

  // Helpers de data consistente
  // --- NOVO: helpers de data/valor ---
  const asISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const todayLabelBR = () => todayPtBR(); // já importado
  const todayLabelISO = () => asISO(new Date());
  const sameDay = (raw: string) => {
    if (!raw) return false;
    // aceita dd/mm/aaaa e yyyy-mm-dd
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw === todayLabelBR();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw === todayLabelISO();
    return false;
  };
  const fmtBRL_local = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n)||0);

  // --- NOVO: referência ao "hoje" e re-render na virada ---
  const [todayKey, setTodayKey] = useState(() => todayLabelBR());
  useEffect(() => {
    const msToMidnight = (() => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      return next.getTime() - now.getTime();
    })();
    const t = setTimeout(() => setTodayKey(todayLabelBR()), msToMidnight);
    return () => clearTimeout(t);
  }, [todayKey]);

  // --- NOVO: gastos do dia (saídas) + total (usa store novo ou legado)
  const gastosHoje = React.useMemo(() => {
    const source = (finDB?.lancamentos && Array.isArray(finDB.lancamentos)) ? (finDB.lancamentos as any[]) : ((lancamentos || []) as any[]);
    return (source || []).filter((l: any) => String(l?.tipo).toLowerCase() === 'saida' && sameDay(String(l?.data)));
  }, [finDB?.lancamentos, lancamentos, todayKey]);
  const totalGastosHoje = React.useMemo(
    () => gastosHoje.reduce((s, l) => s + (Number(l?.valor) || 0), 0),
    [gastosHoje]
  );

  // KPIs dos cards principais (dinâmicos)
  const obrasAtivas = (Array.isArray(equipesObras) ? equipesObras : []).filter((o) => (o?.status ?? 'ativo') === 'ativo').length;
  const equipesCount = (() => {
    try {
      const set = new Set<string>();
      (obrasLegacy || []).forEach((o) => { if (o?.equipe) set.add(o.equipe); });
      return set.size || obrasAtivas; // fallback: usa quantidade de obras ativas
    } catch { return obrasAtivas; }
  })();

  
  const now = new Date();
  const currMonth = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${pad2(prevDate.getMonth() + 1)}`;

  // Fonte preferencial: store financeiro; fallback: legado
  const baseLancKPIs: any[] = (finDB?.lancamentos && Array.isArray(finDB.lancamentos)) ? (finDB.lancamentos as any[]) : ((lancamentos || []) as any[]);
  // Considerar só lançamentos de CAIXA (ignora os de obra)
  const onlyCaixa = (l: any) => ((l?.escopo ?? 'caixa') !== 'obra');

  const entradasAll = baseLancKPIs.filter((l) => onlyCaixa(l) && l.tipo === 'entrada').reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const saidasAll = baseLancKPIs.filter((l) => onlyCaixa(l) && l.tipo === 'saida').reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const saldoEmCaixa = entradasAll - saidasAll;

  const entradasMes = baseLancKPIs.filter((l) => onlyCaixa(l) && l.tipo === 'entrada' && monthKeyFromDate(l.data) === currMonth).reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const saidasMes = baseLancKPIs.filter((l) => onlyCaixa(l) && l.tipo === 'saida' && monthKeyFromDate(l.data) === currMonth).reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const entradasMesPrev = baseLancKPIs.filter((l) => onlyCaixa(l) && l.tipo === 'entrada' && monthKeyFromDate(l.data) === prevMonth).reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const saidasMesPrev = baseLancKPIs.filter((l) => onlyCaixa(l) && l.tipo === 'saida' && monthKeyFromDate(l.data) === prevMonth).reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const gastosMes = saidasMes;
  const gastosMesPrev = saidasMesPrev;
  const saldoMes = entradasMes - saidasMes;
  const saldoMesPrev = entradasMesPrev - saidasMesPrev;
  const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : 0);
  const gastosDeltaPct = pct(gastosMes, gastosMesPrev);
  const saldoDeltaPct = pct(saldoMes, saldoMesPrev);

  // --- Utils de data e moeda (coerentes com o app) ---
  const parsePtBrDate = (s: string) => {
    // aceita dd/mm/aaaa ou yyyy-mm-dd
    if (!s) return new Date(0);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00');
    // fallback
    return new Date(0);
  };
  const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

  // --- Fonte de dados: financeiro novo (preferência) ou legado (fallback) ---
  const baseLanc = React.useMemo(() => {
    if (finDB?.lancamentos && Array.isArray(finDB.lancamentos)) return finDB.lancamentos as any[];
    return (lancamentos || []) as any[]; // legado
  }, [finDB?.lancamentos, lancamentos]);

  // --- Monta "Atividades Recentes" (últimos 8 lançamentos, mais novos primeiro) ---
  type RecentItem = {
    id: string;
    when: Date;
    tipo: 'entrada' | 'saida';
    titulo: string;
    subtitulo?: string;
    valor: number;
  };
  const atividadesRecentes: RecentItem[] = React.useMemo(() => {
    const arr = (baseLanc || []).map((l: any) => ({
      id: String(l.id ?? `${l.data}-${l.descricao}-${Math.random()}`),
      when: parsePtBrDate(l.data),
      tipo: (String(l.tipo || '').toLowerCase() === 'entrada' ? 'entrada' : 'saida') as 'entrada' | 'saida',
      titulo: l.descricao || l.categoria || (String(l.tipo || '').toLowerCase() === 'entrada' ? 'Entrada' : 'Saída'),
      subtitulo: (l as any).obra || undefined,
      valor: Number(l.valor) || 0,
    }));
    // ordena por data desc e limita a 8
    return arr.sort((a, b) => b.when.getTime() - a.when.getTime()).slice(0, 8);
  }, [baseLanc]);

  // --- NOVO: dados dinâmicos do gráfico (últimos 6 meses) ---
  const dynamicChartData = React.useMemo(() => {
    // preferir a fonte nova do financeiro (finDB); fallback para hook legado (lancamentos)
    const base = (finDB?.lancamentos && Array.isArray(finDB.lancamentos))
      ? finDB.lancamentos
      : (lancamentos || []);

    // helper para YYYY-MM -> "MMM/YY" pt-BR
    const labelPt = (ym: string) => {
      const [y, m] = ym.split('-').map(Number);
      const d = new Date(y, (m - 1), 1);
      return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
    };

    // lista dos últimos 6 meses em ordem cronológica
    const today = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(ym);
    }

    // agrega por mês (YYYY-MM)
    const acc: Record<string, { entradas: number; saidas: number }> = {};
    months.forEach((ym) => { acc[ym] = { entradas: 0, saidas: 0 }; });

    base.forEach((l: any) => {
      // ignora lançamentos com escopo 'obra' no gráfico mensal
      if (((l?.escopo ?? 'caixa') === 'obra')) return;
      // l.data está em dd/mm/aaaa na maioria dos fluxos
      const data = l?.data || '';
      let ym = '';
      if (/\d{2}\/\d{2}\/\d{4}/.test(data)) {
        const [d, m, y] = data.split('/').map(Number);
        ym = `${y}-${String(m).padStart(2, '0')}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        ym = data.slice(0, 7);
      }
      if (!ym || !(ym in acc)) return;

      const v = Number(l?.valor || 0) || 0;
      if ((l?.tipo || '').toLowerCase() === 'entrada') acc[ym].entradas += v;
      else if ((l?.tipo || '').toLowerCase() === 'saida') acc[ym].saidas += v;
    });

    return months.map((ym) => ({
      name: labelPt(ym),
      entradas: acc[ym]?.entradas || 0,
      saidas: acc[ym]?.saidas || 0,
    }));
  }, [finDB?.lancamentos, lancamentos]);

  // Equipes/Obras agora vem do hook useEquipesObras
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl mb-1">Dashboard</h1>
        <p className="text-[#626262]">Visão geral do seu negócio</p>
      </div>

      {/* Gastos do dia (com fallback de fonte, data BR/ISO e animação) */}
      <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.42 }}
>
  <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
    <div className="flex items-center justify-between mb-4">
      <h2>Gastos de Hoje</h2>
      <div className="text-sm text-[#626262]">{todayLabelBR()}</div>
    </div>

    {/* cabeçalho sempre visível para não "sumir" */}
    <div className="flex items-center justify-between text-sm text-[#626262] mb-3">
      <span>Total do dia</span>
      <span className="font-medium text-[#B64B3A]">{fmtBRL_local(totalGastosHoje)}</span>
    </div>

    {/* lista animada; mostra placeholder quando vazio */}
    <div className="divide-y">
      {gastosHoje.length === 0 ? (
        <div className="py-6 text-sm text-[#626262]">
          Nenhum gasto lançado hoje. Registre uma saída e ela aparecerá aqui automaticamente.
        </div>
      ) : (
        gastosHoje.map((g: any) => (
          <motion.div
            key={g.id ?? `${g.data}-${g.descricao}-${Math.random()}`}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="py-2 flex items-center justify-between"
          >
            <div className="min-w-0">
              <div className="text-[#2C2C2C] truncate">{g.categoria || g.descricao || 'Despesa'}</div>
              <div className="text-xs text-[#626262] truncate">{g.obra || g.obraNome || '-'}</div>
            </div>
            <div className="ml-3 font-medium text-[#B64B3A]">{fmtBRL_local(Number(g.valor) || 0)}</div>
          </motion.div>
        ))
      )}
    </div>
  </Card>
</motion.div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
            <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#4F6139]/10 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-[#4F6139]" />
              </div>
            </div>
            <p className="text-[#626262] text-sm mb-1">Obras Ativas</p>
            <h3 className="text-3xl text-[#2C2C2C]">{obrasAtivas}</h3>
            <p className="text-[#9DBF7B] text-xs mt-2">Atualizado</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
            <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#9DBF7B]/10 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-[#9DBF7B]" />
              </div>
            </div>
            <p className="text-[#626262] text-sm mb-1">Equipes</p>
            <h3 className="text-3xl text-[#2C2C2C]">{equipesCount}</h3>
            <p className="text-[#9DBF7B] text-xs mt-2">Atualizado</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
            <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#B64B3A]/10 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-[#B64B3A]" />
              </div>
            </div>
            <p className="text-[#626262] text-sm mb-1">Gastos do Mês</p>
            <h3 className="text-3xl text-[#2C2C2C]">{currencyBR(gastosMes)}</h3>
            <p className="text-[#B64B3A] text-xs mt-2">{`${gastosDeltaPct >= 0 ? '+' : ''}${gastosDeltaPct.toFixed(0)}% vs mês anterior`}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#D8C39E]/10 rounded-xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-[#D8C39E]" />
              </div>
            </div>
            <p className="text-[#626262] text-sm mb-1">Saldo em Caixa</p>
            <h3 className="text-3xl text-[#2C2C2C]">{currencyBR(saldoEmCaixa)}</h3>
            <p className="text-[#9DBF7B] text-xs mt-2">{`${saldoDeltaPct >= 0 ? '+' : ''}${saldoDeltaPct.toFixed(0)}% este mês`}</p>
          </Card>
        </motion.div>
      </div>

      {/* Obras - uso diário (apenas lançar gastos) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <h2>Obras (uso diário)</h2>
            <div className="text-sm text-[#626262]">Gerencie obras em Dashboard &gt; Obras/Equipes</div>
          </div>
          <div className="grid gap-3">
            {[...equipesObras]
              .filter((o)=> (o.status ?? 'ativo') === 'ativo')
              .sort((a,b)=>a.obra.localeCompare(b.obra))
              .map((o)=>{
              return (
                <div key={o.id} className="flex items-center justify-between border p-4 rounded-2xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{o.obra}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#9DBF7B] text-white">Ativo</span>
                    </div>
                    <div className="text-sm text-[#626262] truncate">Cidade: {o.nome}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                      <>
                        <div className="flex items-center gap-2">
                          <Input type="number" placeholder="Valor" className="w-28 rounded-xl" value={gastoInline[o.id] ?? ''} onChange={(e)=>setGastoInline({ ...gastoInline, [o.id]: e.target.value })} />
                          {(() => {
                            const descListId = `desc-list-${o.id}`;
                            const suggestions = Array.from(new Set((o.despesas || []).map(d => d.nome).filter(Boolean).reverse())).slice(0, 8);
                            return (
                              <>
                                <Input
                                  type="text"
                                  placeholder="Descrição (opcional)"
                                  className="w-52 rounded-xl"
                                  list={descListId}
                                  value={gastoDescInline[o.id] ?? ''}
                                  onChange={(e)=>setGastoDescInline({ ...gastoDescInline, [o.id]: e.target.value })}
                                />
                                <datalist id={descListId}>
                                  {suggestions.map((s, idx) => (
                                    <option key={`${o.id}-${idx}`} value={s} />
                                  ))}
                                </datalist>
                              </>
                            );
                          })()}
                          <Button
                            variant="outline"
                            onClick={async () =>{
                              const v = Number(gastoInline[o.id] ?? 0);
                              if(v>0){
                                const desc = (gastoDescInline[o.id] ?? '').trim();
                                // Atualiza a obra em peperaio_equipes adicionando a despesa
                                const hoje = todayPtBR();
                                const atualizado = equipesObras.map((x)=> x.id === o.id ? { ...x, despesas: [...(x.despesas||[]), { id: Date.now().toString(), nome: desc || 'Gasto Diário', valor: v, data: hoje }] } : x);
                                setEquipesObras(atualizado);
                                try { localStorage.setItem('peperaio_equipes', JSON.stringify(atualizado)); } catch {}
                                // Registrar também no financeiro (escopo 'obra' para não afetar cartões/caixa)
                                try {
                                  // tenta mapear obra para o store financeiro pela descrição/nome
                                  const obraFin = (finDB?.obras || []).find((of:any) => of?.nome === o.obra);
                                  await finAddLanc({
                                    id: `${Date.now().toString()}_desp_obra`,
                                    data: hoje,
                                    tipo: 'saida',
                                    valor: v,
                                    descricao: desc || `Gasto obra - ${o.obra}`,
                                    obraId: obraFin?.id,
                                    escopo: 'obra',
                                    contabilizaCaixa: false,
                                  } as any);
                                } catch {}
                                // Forçar o filtro do Diário para hoje ao abrir Financeiro
                                try { localStorage.setItem('peperaio_financeiro_jump_to_diario', todayISO()); } catch {}
                                setGastoInline({ ...gastoInline, [o.id]: ''});
                                setGastoDescInline({ ...gastoDescInline, [o.id]: ''});
                              }
                            }}
                            className="rounded-xl"
                          >Adicionar gasto</Button>
                        </div>
                      </>
                  </div>
                </div>
              );
            })}
            {equipesObras.length === 0 && (
              <div className="text-sm text-[#626262]">Nenhuma obra encontrada. Cadastre em Dashboard &gt; Obras/Equipes.</div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Gráfico */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <h2>Desempenho Mensal</h2>
            <span className="text-sm text-[#626262]">Entradas × Saídas (últimos 6 meses)</span>
          </div>

          {/* Mantém o gráfico sempre visível, mesmo se todos os valores forem 0 */}
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={dynamicChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                {/* Garante base no zero e escala automática acima */}
                <YAxis domain={[0, 'auto']} />
                <Tooltip
                  formatter={(v: any) =>
                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0)
                  }
                />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="#9DBF7B" barSize={24} isAnimationActive />
                <Bar dataKey="saidas"   name="Saídas"   fill="#B64B3A" barSize={24} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Atividades Recentes (dinâmico do financeiro) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <h2>Atividades Recentes</h2>
            <span className="text-sm text-[#626262]">
              {atividadesRecentes.length > 0 ? `Últimas ${atividadesRecentes.length}` : 'Sem lançamentos ainda'}
            </span>
          </div>

          <div className="divide-y">
            {atividadesRecentes.length === 0 ? (
              <div className="py-6 text-sm text-[#626262]">
                Quando você registrar movimentações (entradas/saídas, finalizar obras, receber clientes), elas aparecerão aqui.
              </div>
            ) : (
              atividadesRecentes.map((it) => (
                <div key={it.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${it.tipo === 'entrada' ? 'bg-[#9DBF7B]' : 'bg-[#B64B3A]'}`}
                        aria-hidden
                      />
                      <div className="text-[#2C2C2C] truncate">{it.titulo}</div>
                    </div>
                    <div className="text-xs text-[#626262]">
                      {it.when.toLocaleDateString('pt-BR')}
                      {it.subtitulo ? ` • ${it.subtitulo}` : ''}
                    </div>
                  </div>
                  <div className={`ml-3 font-medium ${it.tipo === 'entrada' ? 'text-[#4F6139]' : 'text-[#B64B3A]'}`}>
                    {fmtBRL(it.valor)}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
