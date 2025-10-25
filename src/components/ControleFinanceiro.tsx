import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import type { Lancamento as LancFin } from '../financeiro/financeiroStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

import useObras, { type Obra } from '../hooks/useObras';
import { pad2, monthKeyFromDate } from '../utils/date';

interface Parcelada {
  id: string;
  descricao: string;
  fornecedor: string;
  parcelaAtual: number;
  totalParcelas: number;
  valorParcela: number;
  valorTotal: number;
  vencimento: string;
  pago: boolean;
}

// import useLancamentos from '../hooks/useLancamentos'; // legado substituído pelo store financeiro
import useReceber, { type Receber } from '../hooks/useReceber';
import useDividas, { type Divida } from '../hooks/useDividas';
import useEquipesObras, { type ObraEquipe } from '../hooks/useEquipesObras';
import { DividaCard } from './DividaCard';
import { DividaDialog } from './DividaDialog';
import { RecebivelCard } from './RecebivelCard';
import { RecebivelDialog } from './RecebivelDialog';
import { exportToPdf } from '../utils/generatePdf';
import CardsFinanceiros from '../financeiro/CardsFinanceiros';
import { useFinanceiro } from '../financeiro/useFinanceiro';
import { A4_MM } from '../types/pdf';
import { Require } from './Require';

export function ControleFinanceiro() {
  // Store local de financeiro (cartões, lançamentos e obras)
  const { db: finDB, addLancamento: addLancFinanceiro, updateLancamento: updLancFinanceiro, removeLancamento: delLancFinanceiro, getResumoFinanceiro, setSaldoInicial, atualizarObra: finAtualizarObra, clearReceitasPlanejadas } = useFinanceiro();
  // Mês selecionado (YYYY-MM)
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);

  // monthKeyFromDate agora importado de utils/date
  const { obras, updateObra, deleteObra, finalizeObra, addObra, setObras } = useObras();
  // Obras/Equipes via hook unificado
  const { equipesObras, setEquipesObras } = useEquipesObras();

  // Lista unificada de nomes de obras para selects (Equipes + Obras antigas)
  const obrasSelect = React.useMemo(() => {
    const names = new Set<string>();
    try { (equipesObras || []).forEach((o) => { if (o?.obra) names.add(o.obra); }); } catch {}
    try { (obras || []).forEach((o) => { if (o?.nome) names.add(o.nome); }); } catch {}
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [equipesObras, obras]);
  const [parceladas, setParceladas] = useState<Parcelada[]>([]);
  // Diálogo de ajuste apenas do Saldo em Caixa
  const [dialogSaldoOpen, setDialogSaldoOpen] = useState(false);
  const [saldoNovo, setSaldoNovo] = useState('');
  const [dialogLancamento, setDialogLancamento] = useState(false);
  const [editingLancamentoId, setEditingLancamentoId] = useState<string | null>(null);
  const [lancamentoForm, setLancamentoForm] = useState({ data: '', tipo: 'entrada', categoria: '', valor: '', obra: '', status: '' });
  const [dialogEditLancamento, setDialogEditLancamento] = useState(false);
  const [dialogParcelada, setDialogParcelada] = useState(false);
  const [editingParceladaId, setEditingParceladaId] = useState<string | null>(null);
  const [parceladaForm, setParceladaForm] = useState({ descricao: '', fornecedor: '', parcelaAtual: '', totalParcelas: '', valorParcela: '', valorTotal: '', vencimento: '' });
  const [dialogObra, setDialogObra] = useState(false);
  const [editingObraId, setEditingObraId] = useState<string | null>(null);
  const [obraForm, setObraForm] = useState({ nome: '', equipe: '', receita: '', gastos: '' });
  const [expandedParceladas, setExpandedParceladas] = useState<Record<string, boolean>>({});
  // Ao abrir Financeiro via atalho, aplicar preferências persistidas
  useEffect(() => {
    try {
      const jump = localStorage.getItem('peperaio_financeiro_jump_to_diario');
      if (jump) {
        setModoLanc('diario');
        setSelectedDate(jump);
        localStorage.removeItem('peperaio_financeiro_jump_to_diario');
      }
      const selMonth = localStorage.getItem('peperaio_financeiro_selected_month');
      if (selMonth) setSelectedMonth(selMonth);
    } catch {}
  }, []);
  
  const [saldoAnterior] = useState(0);
  const [entradas, setEntradas] = useState(0);
  const [saidas, setSaidas] = useState(0);
  const [novaTipo, setNovaTipo] = useState('entrada');
const [novoValor, setNovoValor] = useState('');
const saldoAtual = saldoAnterior + entradas - saidas;

  // Filtro Lançamentos: mensal x diário (com persistência de preferência)
  const [modoLanc, setModoLanc] = useState<'mensal' | 'diario'>(() => {
    const saved = localStorage.getItem('peperaio_financeiro_modo');
    return (saved === 'diario' || saved === 'mensal') ? saved : 'diario';
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const saved = localStorage.getItem('peperaio_financeiro_selected_date');
    if (saved && /\d{4}-\d{2}-\d{2}/.test(saved)) return saved;
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const toPtDate = (iso: string) => {
    if (!iso) return '';
    if (iso.includes('/')) return iso; // já está em pt-BR
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  const addDaysISO = (iso: string, delta: number) => {
    if (!iso) return iso;
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setDate(dt.getDate() + delta);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  };
  const prevDay = () => setSelectedDate((s) => addDaysISO(s, -1));
  const nextDay = () => setSelectedDate((s) => addDaysISO(s, 1));
  const today = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };
  const lancamentosDiarios = React.useMemo(() => (finDB.lancamentos || []).filter(l => l.data === toPtDate(selectedDate)), [finDB.lancamentos, selectedDate]);
  const totalDiarioSaidas = React.useMemo(() => lancamentosDiarios.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor || 0), 0), [lancamentosDiarios]);

  // Totais detalhados do dia
  const totalDiarioEntradas = React.useMemo(
    () => (lancamentosDiarios || []).filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor || 0), 0),
    [lancamentosDiarios]
  );

  const totalPorCategoria = React.useMemo(() => {
    const m = new Map<string, number>();
    (lancamentosDiarios || []).forEach((l: any) => {
      const k = String((l as any).categoria || (l as any).descricao || 'Sem categoria');
      m.set(k, (m.get(k) || 0) + (Number(l.valor) || 0));
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [lancamentosDiarios]);

  // helper BRL
  const brl = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);

  // (Removido) Cadastro rápido de gastos do dia

  // Exportação PDF diário (gastos do dia)
  const DPI = 144;
  const mmToPx = (mm: number) => (DPI / 25.4) * mm;
  const pageStyleA4: React.CSSProperties = { width: mmToPx(A4_MM.largura), height: mmToPx(A4_MM.altura), background: '#fff' };
  const rootDiarioRef = React.useRef<HTMLDivElement>(null);
  const thStyle: React.CSSProperties = { border: '1px solid #000', padding: '4px', textAlign: 'left', background: '#f0f0f0' };
  const thStyleRight: React.CSSProperties = { border: '1px solid #000', padding: '4px', textAlign: 'right', background: '#f0f0f0' };
  const tdStyle: React.CSSProperties = { border: '1px solid #000', padding: '4px' };
  const tdStyleRight: React.CSSProperties = { border: '1px solid #000', padding: '4px', textAlign: 'right' };
  const tdStyleBold: React.CSSProperties = { border: '1px solid #000', padding: '4px', fontWeight: 700 };
  const tdStyleRightBold: React.CSSProperties = { border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 700 };
  const [exportandoDiario, setExportandoDiario] = React.useState(false);
  const onExportDiario = async () => {
    if (!rootDiarioRef.current || exportandoDiario) return;
    setExportandoDiario(true);
    const t = toast.loading('Aguarde... gerando PDF');
    try {
      await exportToPdf(rootDiarioRef.current, `Relatorio_Gastos_${selectedDate}.pdf`);
      toast.success('PDF gerado com sucesso', { id: t });
    } catch (e) {
      toast.error('Falha ao gerar PDF', { id: t });
    } finally {
      setExportandoDiario(false);
    }
  };

// Dívidas (hook)
const { dividas, addDivida, updateDivida, deleteDivida, togglePaid, clearDividas } = useDividas();
const [dialogDivida, setDialogDivida] = useState(false);
const [editingDividaId, setEditingDividaId] = useState<string | null>(null);
const [dividaForm, setDividaForm] = useState({ descricao: '', valor: '' });

// Estratégias inteligentes
const [monthlyBudget, setMonthlyBudget] = useState('');
const [strategyResults, setStrategyResults] = useState<Record<string, any> | null>(null);

// A receber (logic in hook)
const [dialogReceber, setDialogReceber] = useState(false);
const [editingReceberId, setEditingReceberId] = useState<string | null>(null);
const [receberForm, setReceberForm] = useState({ nome: '', valor: '', telefone: '', dataPrevista: '', obraId: '' });
const { receber, addReceber, updateReceber, deleteReceber, registerPayment, clearReceber } = useReceber({
  onPayment: (r, amount) => {
    // cria lançamento de entrada diretamente no store financeiro
    try {
      addLancFinanceiro({
        id: Date.now().toString(),
        data: new Date().toLocaleDateString('pt-BR'),
        tipo: 'entrada',
        valor: Number(amount) || 0,
        descricao: `Recebimento - ${r.nome}`,
      });
    } catch {}
    toast.success('Pagamento registrado e lançado como entrada!');
  }
});

  const pieData = [
    { name: 'Entradas', value: entradas, color: '#9DBF7B' },
    { name: 'Saídas', value: saidas, color: '#B64B3A' },
  ];

  // atualizar somatórios sempre que os lançamentos mudarem
  useEffect(() => {
    const ent = (finDB.lancamentos || []).filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor || 0), 0);
    const sai = (finDB.lancamentos || []).filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor || 0), 0);
    setEntradas(ent);
    setSaidas(sai);
  }, [finDB.lancamentos]);

  // Persistir preferências de filtro
  useEffect(() => {
    try { localStorage.setItem('peperaio_financeiro_modo', modoLanc); } catch {}
  }, [modoLanc]);
  useEffect(() => {
    try { localStorage.setItem('peperaio_financeiro_selected_date', selectedDate); } catch {}
  }, [selectedDate]);

  // Sincroniza preferências de filtro quando a janela ganha foco
  useEffect(() => {
    const onFocus = () => {
      try {
        const m = localStorage.getItem('peperaio_financeiro_modo');
        if (m === 'mensal' || m === 'diario') setModoLanc(m);
        const dt = localStorage.getItem('peperaio_financeiro_selected_date');
        if (dt && /\d{4}-\d{2}-\d{2}/.test(dt)) setSelectedDate(dt);
        const jump = localStorage.getItem('peperaio_financeiro_jump_to_diario');
        if (jump && /\d{4}-\d{2}-\d{2}/.test(jump)) {
          setModoLanc('diario');
          setSelectedDate(jump);
          try { localStorage.removeItem('peperaio_financeiro_jump_to_diario'); } catch {}
        }
      } catch {}
    };
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'peperaio_financeiro_modo') {
        const m = localStorage.getItem('peperaio_financeiro_modo');
        if (m === 'mensal' || m === 'diario') setModoLanc(m as any);
      }
      if (!e.key || e.key === 'peperaio_financeiro_selected_date') {
        const dt = localStorage.getItem('peperaio_financeiro_selected_date');
        if (dt && /\d{4}-\d{2}-\d{2}/.test(dt)) setSelectedDate(dt);
      }
      if (!e.key || e.key === 'peperaio_financeiro_jump_to_diario') {
        const jump = localStorage.getItem('peperaio_financeiro_jump_to_diario');
        if (jump && /\d{4}-\d{2}-\d{2}/.test(jump)) {
          setModoLanc('diario');
          setSelectedDate(jump);
          try { localStorage.removeItem('peperaio_financeiro_jump_to_diario'); } catch {}
        }
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Receitas planejadas: usar a fonte "mãe" (Obras/Equipes) somando orçamentos ativos + "A Receber" pendente
  const [equipesPlanejadas, setEquipesPlanejadas] = useState(0);
  useEffect(() => {
    const compute = () => {
      try {
        const raw = localStorage.getItem('peperaio_equipes');
        const rawR = localStorage.getItem('peperaio_receber');
        const arr = raw ? (JSON.parse(raw) as Array<{ id: string; custos?: number; status?: string }>) : [];
        const rec = rawR ? (JSON.parse(rawR) as Array<{ obraId?: string }>) : [];
        const obrasComReceber = new Set((rec || []).map(r => r.obraId).filter(Boolean) as string[]);
        // Soma apenas obras ativas que ainda NÃO têm um recebível atrelado, para evitar dupla contagem
        const sum = (arr || [])
          .filter(o => (o?.status ?? 'ativo') === 'ativo' && !obrasComReceber.has(o.id))
          .reduce((s, o) => s + Number(o.custos || 0), 0);
        setEquipesPlanejadas(sum);
      } catch {
        setEquipesPlanejadas(0);
      }
    };
    compute();
    const onFocus = () => compute();
    const onCustom = (e: Event) => {
      // Recalcula quando Equipes é atualizado em mesma aba
      compute();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('peperaio_equipes_updated', onCustom as EventListener);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('peperaio_equipes_updated', onCustom as EventListener);
    };
  }, []);
  const receitasPlanejadas = equipesPlanejadas
    + receber.reduce((s, r) => s + Number(r.valor || 0), 0);

  useEffect(() => {
    const storedP = localStorage.getItem('peperaio_parceladas');
    const storedD = localStorage.getItem('peperaio_dividas');
    
    if (storedP) setParceladas(JSON.parse(storedP));
    else {
      const initial = [
        { id: '1', descricao: 'Material ACM - Shopping Center', fornecedor: 'ACM Materiais', parcelaAtual: 2, totalParcelas: 6, valorParcela: 750, valorTotal: 4500, vencimento: '10/11/2025', pago: false }
      ];
      setParceladas(initial);
      localStorage.setItem('peperaio_parceladas', JSON.stringify(initial));
    }
    // dividas and receber are managed by their respective hooks (useDividas, useReceber)
  }, []);

  // lancamentos agora são mantidos no store financeiro

  // obras persistence handled inside useObras

  useEffect(() => {
    if (parceladas.length > 0) localStorage.setItem('peperaio_parceladas', JSON.stringify(parceladas));
  }, [parceladas]);
  // persistence for dividas/receber handled inside hooks

  const handleDeleteLancamento = (id: string) => {
    try { delLancFinanceiro(id); } catch {}
    toast.success('Lançamento removido!');
  };

  const handleDeleteObra = (id: string) => {
    // Remoção apenas reflete a fonte mãe (Equipes) para manter consistência
    setEquipesObras((prev) => {
      const next = prev.filter((o) => o.id !== id);
      try { localStorage.setItem('peperaio_equipes', JSON.stringify(next)); } catch {}
      return next;
    });
    toast.success('Obra removida!');
  };

  

  const startEditLancamento = (l: LancFin) => {
    setEditingLancamentoId(l.id);
    const obraNome = l.obraId ? (finDB.obras.find(o => o.id === l.obraId)?.nome || '-') : '-';
    setLancamentoForm({ data: l.data, tipo: l.tipo as any, categoria: (l as any).categoria || l.descricao as any, valor: String(l.valor), obra: obraNome, status: '' } as any);
    setDialogEditLancamento(true);
  };

  const handleAddLancamento = () => {
    if (!lancamentoForm.categoria || !lancamentoForm.valor) return;
    // Define a data do lançamento: usa a informada; senão, se em modo diário usa selectedDate; senão hoje
    const dataEscolhida = lancamentoForm.data && lancamentoForm.data.trim().length > 0
      ? lancamentoForm.data
      : (modoLanc === 'diario' ? selectedDate : '');
    const dataPt = dataEscolhida ? toPtDate(dataEscolhida) : new Date().toLocaleDateString('pt-BR');
    try {
      const obraNome = (lancamentoForm.obra && lancamentoForm.obra !== '-') ? lancamentoForm.obra : undefined;
      const obraId = obraNome ? (finDB.obras.find(o => o.nome === obraNome)?.id) : undefined;
      addLancFinanceiro({ id: Date.now().toString(), data: dataPt, tipo: lancamentoForm.tipo as any, valor: Number(lancamentoForm.valor) || 0, descricao: lancamentoForm.categoria, obraId });
    } catch {}
    setDialogLancamento(false);
    setEditingLancamentoId(null);
    setLancamentoForm({ data: '', tipo: 'entrada', categoria: '', valor: '', obra: '', status: '' });
    toast.success('Lançamento adicionado!');
  };

  const handleUpdateLancamento = () => {
    if (!editingLancamentoId) return;
    if (!lancamentoForm.categoria || !lancamentoForm.valor) return;
    try {
      const obraNome = (lancamentoForm.obra && lancamentoForm.obra !== '-') ? lancamentoForm.obra : undefined;
      const obraId = obraNome ? (finDB.obras.find(o => o.nome === obraNome)?.id) : undefined;
      updLancFinanceiro(editingLancamentoId, {
        data: lancamentoForm.data,
        tipo: lancamentoForm.tipo as any,
        valor: Number(lancamentoForm.valor) || 0,
        descricao: lancamentoForm.categoria,
        obraId,
      });
    } catch {}
    setDialogLancamento(false);
    setEditingLancamentoId(null);
    setLancamentoForm({ data: '', tipo: 'entrada', categoria: '', valor: '', obra: '', status: '' });
    toast.success('Lan��amento atualizado!');
  };

  const handleAdicionarMovimentacao = () => {
    if (!novoValor) return;
    const valor = parseFloat(novoValor);
    // Registrar como lançamento padrão para persistir e refletir nos resumos
    try {
      addLancFinanceiro({ id: Date.now().toString(), data: new Date().toLocaleDateString('pt-BR'), tipo: (novaTipo === 'entrada' ? 'entrada' : 'saida') as any, valor, descricao: 'Movimentação Caixa' });
    } catch {}
    setNovoValor('');
    toast.success('Movimentação adicionada!');
  };

  const togglePagamentoParcelada = (id: string) => {
    setParceladas(parceladas.map(p => p.id === id ? { ...p, pago: !p.pago } : p));
    const p = parceladas.find(p => p.id === id);
    toast.success(p?.pago ? 'Marcado como pendente' : 'Pagamento confirmado!');
  };

  const handleDeleteParcelada = (id: string) => {
    setParceladas(parceladas.filter(p => p.id !== id));
    toast.success('Parcela removida!');
  };

  // Recebimentos: handlers moved to useReceber hook

  // Edição de Parceladas
  const startEditParcelada = (p: Parcelada) => {
    setEditingParceladaId(p.id);
    setParceladaForm({
      descricao: p.descricao,
      fornecedor: p.fornecedor,
      parcelaAtual: String(p.parcelaAtual),
      totalParcelas: String(p.totalParcelas),
      valorParcela: String(p.valorParcela),
      valorTotal: String(p.valorTotal),
      vencimento: p.vencimento,
    });
    setDialogParcelada(true);
  };

  const handleAddParcelada = () => {
    if (!parceladaForm.descricao || !parceladaForm.fornecedor) return;
    const nova: Parcelada = {
      id: Date.now().toString(),
      descricao: parceladaForm.descricao,
      fornecedor: parceladaForm.fornecedor,
      parcelaAtual: Number(parceladaForm.parcelaAtual) || 1,
      totalParcelas: Number(parceladaForm.totalParcelas) || 1,
      valorParcela: Number(parceladaForm.valorParcela) || 0,
      valorTotal: Number(parceladaForm.valorTotal) || 0,
      vencimento: parceladaForm.vencimento,
      pago: false,
    };
    setParceladas([...parceladas, nova]);
    setDialogParcelada(false);
    setEditingParceladaId(null);
    setParceladaForm({ descricao: '', fornecedor: '', parcelaAtual: '', totalParcelas: '', valorParcela: '', valorTotal: '', vencimento: '' });
    toast.success('Compra parcelada cadastrada!');
  };

  const handleUpdateParcelada = () => {
    if (!editingParceladaId) return;
    setParceladas(
      parceladas.map((p) =>
        p.id === editingParceladaId
          ? {
              ...p,
              descricao: parceladaForm.descricao,
              fornecedor: parceladaForm.fornecedor,
              parcelaAtual: Number(parceladaForm.parcelaAtual) || p.parcelaAtual,
              totalParcelas: Number(parceladaForm.totalParcelas) || p.totalParcelas,
              valorParcela: Number(parceladaForm.valorParcela) || p.valorParcela,
              valorTotal: Number(parceladaForm.valorTotal) || p.valorTotal,
              vencimento: parceladaForm.vencimento,
            }
          : p
      )
    );
    setEditingParceladaId(null);
    setDialogParcelada(false);
    setParceladaForm({ descricao: '', fornecedor: '', parcelaAtual: '', totalParcelas: '', valorParcela: '', valorTotal: '', vencimento: '' });
    toast.success('Compra parcelada atualizada!');
  };

  // Edição de Obras
  const startEditObra = (o: Obra) => {
    setEditingObraId(o.id);
    setObraForm({ nome: o.nome, equipe: o.equipe, receita: String(o.receita), gastos: String(o.gastos) });
    setDialogObra(true);
  };

  // Finalizar obra (Equipes) e registrar restante como entrada em Caixa
  const finalizeObraEquipes = (obra: ObraEquipe) => {
    const totalDespesas = (obra.despesas || []).reduce((s, d) => s + (Number(d.valor) || 0), 0);
    const restante = (obra.custos || 0) - totalDespesas;
    // Atualiza status para concluído
    setEquipesObras((prev: ObraEquipe[]) => {
      const next: ObraEquipe[] = prev.map((o) => (o.id === obra.id ? { ...o, status: 'concluido' as const } : o));
      try {
        localStorage.setItem('peperaio_equipes', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('peperaio_equipes_updated', { detail: { source: 'Financeiro' } }));
      } catch {}
      return next;
    });
    if (restante > 0) {
      try {
        // Registrar somente no novo store financeiro
        const obraId = finDB.obras.find(o => o.nome === obra.obra)?.id;
        addLancFinanceiro({
          tipo: 'entrada',
          valor: Number(restante) || 0,
          descricao: `Saldo Obra: ${obra.obra}`,
          obraId,
        });
        if (obraId) finAtualizarObra(obraId, { status: 'finalizada' });
      } catch (e) { console.error('Falha ao registrar entrada de saldo da obra', e); }
    }
    toast.success('Obra finalizada e saldo lançado em Caixa');
  };

  const handleUpdateObra = () => {
    if (!editingObraId) return;
    setObras(
      obras.map((o) =>
        o.id === editingObraId
          ? { ...o, nome: obraForm.nome, equipe: obraForm.equipe, receita: Number(obraForm.receita) || o.receita, gastos: Number(obraForm.gastos) || o.gastos }
          : o
      )
    );
    setEditingObraId(null);
    setDialogObra(false);
    setObraForm({ nome: '', equipe: '', receita: '', gastos: '' });
    toast.success('Obra atualizada!');
  };

  // ===== Estratégias inteligentes de pagamento =====
  const simulateStrategy = (order: Divida[], budget: number) => {
    // Simula mês a mês alocando todo o budget na ordem fornecida
    const rem = order.map(d => ({ ...d, restante: d.valor }));
    const schedulePerDebt: Record<string, { descricao: string; meses: number }> = {};
    rem.forEach(r => { schedulePerDebt[r.id] = { descricao: r.descricao, meses: 0 }; });
    let month = 0;
    while (rem.some(r => r.restante > 0) && month < 1200) { // limit safety
      month += 1;
      let available = budget;
      for (const r of rem) {
        if (r.restante <= 0) continue;
        if (available <= 0) break;
        const pay = Math.min(r.restante, available);
        r.restante -= pay;
        available -= pay;
        if (r.restante <= 0) {
          // marcado como quitado neste mês
          schedulePerDebt[r.id].meses = month;
        }
      }
      // if budget can't cover any smallest remaining (budget == 0) loop will end
      if (budget <= 0) break;
    }
    const totalMonths = Math.max(...Object.values(schedulePerDebt).map(s => s.meses));
    return { schedulePerDebt, totalMonths };
  };

  const computeStrategies = () => {
    const budget = Number(monthlyBudget) || 0;
    if (budget <= 0) {
      toast.error('Informe um orçamento mensal válido (maior que 0)');
      return;
    }
    const unpaid = dividas.filter(d => !d.pago).map(d => ({ ...d }));
    if (unpaid.length === 0) {
      toast('Não há dívidas pendentes.');
      setStrategyResults(null);
      return;
    }

    // Snowball: menor primeiro
    const asc = [...unpaid].sort((a, b) => a.valor - b.valor);
    const snow = simulateStrategy(asc, budget);

    // Largest-first
    const desc = [...unpaid].sort((a, b) => b.valor - a.valor);
    const largest = simulateStrategy(desc, budget);

    setStrategyResults({ snowball: { order: asc, ...snow }, largestFirst: { order: desc, ...largest }, budget });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl mb-1">Controle Financeiro</h1>
        <p className="text-[#626262]">Gerencie todas as finanças da empresa</p>
      </div>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="bg-white rounded-xl p-1 shadow-sm flex-wrap h-auto">
          <TabsTrigger value="visao-geral" className="rounded-lg data-[state=active]:bg-[#4F6139] data-[state=active]:text-white">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="lancamentos" className="rounded-lg data-[state=active]:bg-[#4F6139] data-[state=active]:text-white">
            Lançamentos
          </TabsTrigger>
          <TabsTrigger value="obras" className="rounded-lg data-[state=active]:bg-[#4F6139] data-[state=active]:text-white">
            Obras
          </TabsTrigger>
          <TabsTrigger value="caixa" className="rounded-lg data-[state=active]:bg-[#4F6139] data-[state=active]:text-white">
            Caixa
          </TabsTrigger>
          <TabsTrigger value="parceladas" className="rounded-lg data-[state=active]:bg-[#4F6139] data-[state=active]:text-white">
            Parceladas
          </TabsTrigger>
          <TabsTrigger value="dividas" className="rounded-lg data-[state=active]:bg-[#4F6139] data-[state=active]:text-white">
            Dívidas
          </TabsTrigger>
          <TabsTrigger value="areceber" className="rounded-lg data-[state=active]:bg-[#4F6139] data-[state=active]:text-white">
            A Receber
          </TabsTrigger>
        </TabsList>

        {/* VISÃO GERAL */}
        <TabsContent value="visao-geral">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <CardsFinanceiros />

            <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <h2 className="mb-6">Distribuição Financeira</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: R$ ${(entry.value / 1000).toFixed(0)}k`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>
          <Dialog
            open={dialogParcelada}
            onOpenChange={(open: boolean) => {
              setDialogParcelada(open);
              if (!open) {
                setEditingParceladaId(null);
                setParceladaForm({ descricao: '', fornecedor: '', parcelaAtual: '', totalParcelas: '', valorParcela: '', valorTotal: '', vencimento: '' });
              }
            }}
          >
            <DialogContent className="rounded-[20px]">
              <DialogHeader>
                <DialogTitle>Editar Compra Parcelada</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Descricao</Label>
                    <Input className="rounded-xl" value={parceladaForm.descricao} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, descricao: e.target.value })} />
                  </div>
                  <div>
                </div>
                <div>
                  <Label>Fornecedor</Label>
                    <Input className="rounded-xl" value={parceladaForm.fornecedor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, fornecedor: e.target.value })} />
                  </div>
                  <div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Parcela Atual</Label>
                      <Input type="number" className="rounded-xl" value={parceladaForm.parcelaAtual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, parcelaAtual: e.target.value })} />
                    </div>
                    <div>
                  </div>
                  <div>
                    <Label>Total de Parcelas</Label>
                      <Input type="number" className="rounded-xl" value={parceladaForm.totalParcelas} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, totalParcelas: e.target.value })} />
                    </div>
                    <div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor da Parcela</Label>
                      <Input type="number" className="rounded-xl" value={parceladaForm.valorParcela} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, valorParcela: e.target.value })} />
                    </div>
                    <div>
                  </div>
                  <div>
                    <Label>Valor Total</Label>
                      <Input type="number" className="rounded-xl" value={parceladaForm.valorTotal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, valorTotal: e.target.value })} />
                    </div>
                    <div>
                  </div>
                </div>
                <div>
                  <Label>Vencimento</Label>
                    <Input className="rounded-xl" value={parceladaForm.vencimento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, vencimento: e.target.value })} />
                  </div>
                  <div>
                </div>
                <Button onClick={handleUpdateParcelada} className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl">Salvar alteracoes</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* A RECEBER */}
        <TabsContent value="areceber">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Label>A Receber</Label>
                  <Button onClick={() => setDialogReceber(true)} className="bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl"><Plus className="h-4 w-4 mr-2" /> Novo</Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      try { clearReceitasPlanejadas(); } catch {}
                      clearReceber();
                      toast.success('Receitas planejadas zeradas');
                    }}
                    className="ml-2"
                  >
                    Zerar Receitas Planejadas
                  </Button>
                </div>
              </div>

              <RecebivelDialog
                open={dialogReceber}
                onOpenChange={(openState: boolean) => { setDialogReceber(openState); if (!openState) { setEditingReceberId(null); setReceberForm({ nome: '', valor: '', telefone: '', dataPrevista: '', obraId: '' }); } }}
                editingId={editingReceberId}
                form={receberForm}
                setForm={setReceberForm}
                onSave={() => {
                  const fmtDate = receberForm.dataPrevista ? (() => { const [y, m, d] = receberForm.dataPrevista.split('-'); return `${d}/${m}/${y}`; })() : undefined;
                  if (editingReceberId) {
                    updateReceber(editingReceberId, { nome: receberForm.nome, valor: Number(receberForm.valor) || 0, telefone: receberForm.telefone, dataPrevista: fmtDate, obraId: receberForm.obraId || undefined });
                    toast.success('Recebível atualizado');
                  } else {
                    addReceber({ nome: receberForm.nome, valor: Number(receberForm.valor) || 0, telefone: receberForm.telefone, dataPrevista: fmtDate, obraId: receberForm.obraId || undefined });
                    toast.success('Recebível cadastrado');
                  }
                  setDialogReceber(false);
                  setEditingReceberId(null);
                  setReceberForm({ nome: '', valor: '', telefone: '', dataPrevista: '', obraId: '' });
                }}
              />

              <div className="grid gap-4">
                {receber.map(r => (
                  <RecebivelCard
                    key={r.id}
                    r={r}
                    onEdit={() => { setEditingReceberId(r.id); setReceberForm({ nome: r.nome, valor: String(r.valor), telefone: r.telefone || '', dataPrevista: r.dataPrevista ? (() => { const [d,m,y] = r.dataPrevista.split('/'); return `${y}-${m}-${d}` })() : '', obraId: r.obraId || '' }); setDialogReceber(true); }}
                    onDelete={() => { deleteReceber(r.id); toast.success('Recebível removido'); }}
                    onRegister={(amount) => { registerPayment(r.id, amount); toast.success('Pagamento registrado'); }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* DÍVIDAS */}
        <TabsContent value="dividas">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="space-y-4">
              {/* Coluna Dívidas (agora em largura total para ficar igual a Parceladas) */}
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center mb-4">
                  <div>
                    <Label className="block mb-1 text-sm">Orçamento mensal disponível</Label>
                    <Input
                      type="number"
                      className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 min-w-0 border px-3 py-1 text-sm bg-input-background transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-full sm:w-24 max-w-[140px] rounded-xl"
                      placeholder="R$ 0,00"
                      value={monthlyBudget}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyBudget(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Button onClick={computeStrategies} className="inline-flex items-center justify-center gap-2 text-sm font-medium h-9 px-4 py-2 bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl whitespace-nowrap">
                      Gerar estratégias
                    </Button>
                    <Button onClick={() => { setEditingDividaId(null); setDividaForm({ descricao: '', valor: '' }); setDialogDivida(true); }} className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium h-9 px-4 py-2 bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl">
                      <Plus className="h-4 w-4 mr-2" /> Nova Dívida
                    </Button>
                    <DividaDialog
                      open={dialogDivida}
                      onOpenChange={(openState: boolean) => { setDialogDivida(openState); if (!openState) { setEditingDividaId(null); setDividaForm({ descricao: '', valor: '' }); } }}
                      editingDividaId={editingDividaId}
                      dividaForm={dividaForm}
                      setDividaForm={setDividaForm}
                      onSave={() => {
                        if (!dividaForm.descricao || !dividaForm.valor) return;
                        const v = Number(dividaForm.valor) || 0;
                        if (editingDividaId) {
                          updateDivida(editingDividaId, { descricao: dividaForm.descricao, valor: v });
                        } else {
                          addDivida({ descricao: dividaForm.descricao, valor: v, pago: false });
                        }
                        setDialogDivida(false);
                        setEditingDividaId(null);
                        setDividaForm({ descricao: '', valor: '' });
                        toast.success('Dívida salva!');
                      }}
                    />
                  </div>
                </div>

                <div className="grid gap-4">
                  {dividas.map((d) => (
                    <DividaCard
                      key={d.id}
                      d={d}
                      onEdit={() => { setEditingDividaId(d.id); setDividaForm({ descricao: d.descricao, valor: String(d.valor) }); setDialogDivida(true); }}
                      onDelete={() => { deleteDivida(d.id); toast.success('Dívida removida'); }}
                      onTogglePaid={() => { togglePaid(d.id); toast.success('Status da dívida atualizado'); }}
                    />
                  ))}
                </div>

                {strategyResults && (
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <Card className="p-4">
                      <h4 className="mb-2">Snowball (menor primeiro)</h4>
                      <p className="text-sm text-[#626262] mb-2">Total de meses estimado: <strong>{strategyResults.snowball.totalMonths}</strong></p>
                      <div className="space-y-2">
                        {strategyResults.snowball.order.map((od: Divida) => (
                          <div key={od.id} className="flex justify-between">
                            <span>{od.descricao}</span>
                            <span className="text-sm text-[#626262]">Quitado no mês: {strategyResults.snowball.schedulePerDebt[od.id]?.meses || '-'}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h4 className="mb-2">Largest-first (maior primeiro)</h4>
                      <p className="text-sm text-[#626262] mb-2">Total de meses estimado: <strong>{strategyResults.largestFirst.totalMonths}</strong></p>
                      <div className="space-y-2">
                        {strategyResults.largestFirst.order.map((od: Divida) => (
                          <div key={od.id} className="flex justify-between">
                            <span>{od.descricao}</span>
                            <span className="text-sm text-[#626262]">Quitado no mês: {strategyResults.largestFirst.schedulePerDebt[od.id]?.meses || '-'}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}
              </div>

              
            </div>
          </motion.div>
        </TabsContent>
        {/* LANÇAMENTOS */}
        <TabsContent value="lancamentos">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            { /* Filtro mensal e diário + export PDF diário */ }
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label>Modo</Label>
                  <select
                    className="h-10 px-3 rounded-xl border border-[rgba(79,97,57,0.2)] bg-white"
                    value={modoLanc || 'mensal'}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setModoLanc(e.target.value as any)}
                  >
                    <option value="mensal">Mensal</option>
                    <option value="diario">Diário</option>
                  </select>
                </div>
                {modoLanc === 'mensal' && (
                  <div className="flex items-center gap-2">
                    <Label>Mês</Label>
                    <input
                      type="month"
                      className="h-10 px-3 rounded-xl border border-[rgba(79,97,57,0.2)] bg-white"
                      value={selectedMonth}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedMonth(e.target.value)}
                    />
                  </div>
                )}
                {modoLanc === 'diario' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label>Dia</Label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={prevDay} className="rounded-xl">◀</Button>
                      <input
                        type="date"
                        className="h-10 px-3 rounded-xl border border-[rgba(79,97,57,0.2)] bg-white"
                        value={selectedDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
                      />
                      <Button variant="outline" onClick={nextDay} className="rounded-xl">▶</Button>
                      <Button variant="ghost" onClick={today} className="rounded-xl">Hoje</Button>
                    </div>
                    <Require perm="exportar">
                      <Button onClick={onExportDiario} disabled={exportandoDiario} className="bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl disabled:opacity-60 disabled:cursor-not-allowed">
                        {exportandoDiario ? 'Aguarde…' : 'Exportar PDF (Diário)'}
                      </Button>
                    </Require>
                  </div>
                )}
              </div>
              <Dialog open={dialogLancamento} onOpenChange={(open: boolean) => { setDialogLancamento(open); if (!open) { setEditingLancamentoId(null); setLancamentoForm({ data: '', tipo: 'entrada', categoria: '', valor: '', obra: '', status: '' }); } }}>
                <DialogTrigger asChild>
                    <Button onClick={() => { setEditingLancamentoId(null); setLancamentoForm({ data: (modoLanc === 'diario' ? selectedDate : ''), tipo: 'entrada', categoria: '', valor: '', obra: '-', status: '' }); }} className="bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Lançamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[20px]">
                    <DialogHeader>
                      <DialogTitle>Novo Lançamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Tipo</Label>
                        <select
                          className="w-full h-10 px-3 rounded-xl border border-[rgba(79,97,57,0.2)] bg-white"
                          value={lancamentoForm.tipo}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLancamentoForm({ ...lancamentoForm, tipo: e.target.value })}
                        >
                          <option value="entrada">Entrada</option>
                          <option value="saida">Saída</option>
                        </select>
                      </div>
                      <div>
                        <Label>Nome do gasto / Categoria</Label>
                        <Input
                          className="rounded-xl"
                          placeholder="Ex: Material, Transporte, Mão de obra"
                          value={lancamentoForm.categoria}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLancamentoForm({ ...lancamentoForm, categoria: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Valor</Label>
                          <Input
                            type="number"
                            className="rounded-xl"
                            placeholder="R$ 0,00"
                            value={lancamentoForm.valor}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLancamentoForm({ ...lancamentoForm, valor: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Data do gasto</Label>
                          <Input
                            type="date"
                            className="rounded-xl"
                            value={lancamentoForm.data}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLancamentoForm({ ...lancamentoForm, data: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Obra / Destino do gasto</Label>
                          <Select
                            value={(lancamentoForm.obra && lancamentoForm.obra.length > 0) ? lancamentoForm.obra : '-'}
                            onValueChange={(v: string) => setLancamentoForm({ ...lancamentoForm, obra: v })}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Selecione a obra ou Gasto Alternativo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="-">Gasto Alternativo</SelectItem>
                              {obrasSelect.map((nome) => (
                                <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Input
                            className="rounded-xl"
                            placeholder="Ex: Pago, Pendente"
                            value={lancamentoForm.status}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLancamentoForm({ ...lancamentoForm, status: e.target.value })}
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={handleAddLancamento}
                        className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl"
                      >
                        Adicionar
                      </Button>
                    </div>
                  </DialogContent>
              </Dialog>
            </div>

            { /* Cadastro diário removido conforme solicitação */ }

            {modoLanc === 'diario' && (
              <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-4">
                {/* Toolbar do Diário */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={prevDay}>◀ Anterior</Button>
                    <Button variant="outline" onClick={today}>Hoje</Button>
                    <Button variant="outline" onClick={nextDay}>Próximo ▶</Button>
                    <span className="text-sm text-[#626262] ml-2">Dia: <strong>{toPtDate(selectedDate)}</strong></span>
                  </div>

                  <Button
                    onClick={onExportDiario}
                    disabled={exportandoDiario}
                    className="!bg-emerald-600 hover:!bg-emerald-700 !text-white shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {exportandoDiario ? 'Gerando PDF…' : 'Exportar PDF do Dia'}
                  </Button>
                </div>

                {/* Preview A4 para captura do PDF */}
                <div ref={rootDiarioRef}>
                  <div className="pdf-page relative shadow-sm" style={pageStyleA4}>
                    {/* Cabeçalho marca */}
                    <div className="absolute" style={{ left: mmToPx(20), right: mmToPx(20), top: mmToPx(10) }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '28pt', fontWeight: 700 }}>PEPERAIO</div>
                        <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '16pt', fontStyle: 'italic' }}>Comunicação Visual</div>
                        <div style={{ marginLeft: 'auto', fontSize: '11pt', fontWeight: 700, textAlign: 'right' }}>
                          Diário Financeiro — {toPtDate(selectedDate)}
                        </div>
                      </div>
                      <div style={{ marginTop: 6, height: 0, borderTop: '3px solid #4F6139' }} />
                      <div style={{ marginTop: 3, height: 0, borderTop: '3px solid #B64B3A' }} />
                    </div>

                    {/* Conteúdo */}
                    <div style={{ padding: mmToPx(20), paddingTop: mmToPx(36) }}>
                      <h2 style={{ fontSize: '18pt', marginBottom: mmToPx(2), fontWeight: 800, letterSpacing: 0.2 }}>Relatório de Gastos Diários</h2>
                      <div style={{ fontSize: '12.5pt', marginBottom: mmToPx(4) }}>
                        Data do relatório: <strong>{toPtDate(selectedDate)}</strong>
                      </div>

                      {/* KPIs do dia */}
                      <div style={{ display: 'flex', gap: mmToPx(6), marginBottom: mmToPx(6) }}>
                        <div style={{ flex: 1, border: '1px solid #e5e5e5', borderRadius: 8, padding: 12 }}>
                          <div style={{ fontSize: '10pt', color: '#626262' }}>Itens do dia</div>
                          <div style={{ fontSize: '14pt', fontWeight: 700 }}>{lancamentosDiarios.length}</div>
                        </div>
                        <div style={{ flex: 1, border: '1px solid #e5e5e5', borderRadius: 8, padding: 12 }}>
                          <div style={{ fontSize: '10pt', color: '#626262' }}>Total de saídas</div>
                          <div style={{ fontSize: '14pt', fontWeight: 800, color: '#B64B3A' }}>{brl(totalDiarioSaidas)}</div>
                        </div>
                        <div style={{ flex: 1, border: '1px solid #e5e5e5', borderRadius: 8, padding: 12 }}>
                          <div style={{ fontSize: '10pt', color: '#626262' }}>Total de entradas</div>
                          <div style={{ fontSize: '14pt', fontWeight: 800, color: '#4F6139' }}>{brl(totalDiarioEntradas)}</div>
                        </div>
                      </div>

                      {/* Tabela detalhada */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5pt' }}>
                        <thead>
                          <tr>
                            <th style={{ ...thStyle, border: '2px solid #000' }}>Data</th>
                            <th style={{ ...thStyle, border: '2px solid #000' }}>Categoria / Descrição</th>
                            <th style={{ ...thStyle, border: '2px solid #000' }}>Obra</th>
                            <th style={{ ...thStyle, border: '2px solid #000' }}>Escopo</th>
                            <th style={{ ...thStyleRight, border: '2px solid #000' }}>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lancamentosDiarios.map((l, idx) => {
                            const alt = idx % 2 === 1 ? { background: '#FAFBF7' } : {};
                            const escopo = (l as any).escopo || 'caixa';
                            return (
                              <tr key={l.id} style={alt}>
                                <td style={{ ...tdStyle, border: '1px solid #000' }}>{l.data}</td>
                                <td style={{ ...tdStyle, border: '1px solid #000' }}>
                                  {(l as any).descricao || (l as any).categoria || (l.tipo === 'entrada' ? 'Entrada' : 'Saída')}
                                </td>
                                <td style={{ ...tdStyle, border: '1px solid #000' }}>
                                  {l.obraId ? (finDB.obras.find(o => o.id === l.obraId)?.nome || '-') : ((l as any).obra || '-')}
                                </td>
                                <td style={{ ...tdStyle, border: '1px solid #000' }}>
                                  {escopo === 'obra' ? 'Obra' : 'Caixa'}
                                </td>
                                <td style={{ ...tdStyleRight, border: '1px solid #000', fontWeight: 700, color: l.tipo === 'saida' ? '#B64B3A' : '#2C2C2C' }}>
                                  {brl(Number(l.valor) || 0)}
                                </td>
                              </tr>
                            );
                          })}
                          {/* Totais finais */}
                          <tr>
                            <td colSpan={4} style={{ ...tdStyle, fontWeight: 800, border: '2px solid #000' }}>TOTAL SAÍDAS</td>
                            <td style={{ ...tdStyleRight, fontWeight: 800, border: '2px solid #000', color: '#B64B3A' }}>{brl(totalDiarioSaidas)}</td>
                          </tr>
                          <tr>
                            <td colSpan={4} style={{ ...tdStyle, fontWeight: 800, border: '2px solid #000' }}>TOTAL ENTRADAS</td>
                            <td style={{ ...tdStyleRight, fontWeight: 800, border: '2px solid #000', color: '#4F6139' }}>{brl(totalDiarioEntradas)}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Subtotais por categoria */}
                      <div style={{ marginTop: mmToPx(6) }}>
                        <div style={{ fontSize: '12pt', fontWeight: 700, marginBottom: 6 }}>Subtotais por Categoria</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5pt' }}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle, border: '2px solid #000' }}>Categoria</th>
                              <th style={{ ...thStyleRight, border: '2px solid #000' }}>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {totalPorCategoria.map(([cat, val], i) => (
                              <tr key={i} style={i % 2 === 1 ? { background: '#FAFBF7' } : {}}>
                                <td style={{ ...tdStyle, border: '1px solid #000' }}>{cat}</td>
                                <td style={{ ...tdStyleRight, border: '1px solid #000', fontWeight: 700 }}>{brl(val)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Assinatura / rodapé */}
                      <div style={{ marginTop: mmToPx(12), display: 'flex', gap: mmToPx(10) }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 1, background: '#000' }} />
                          <div style={{ fontSize: '10pt', marginTop: 6 }}>Responsável</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 1, background: '#000' }} />
                          <div style={{ fontSize: '10pt', marginTop: 6 }}>Conferência</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Card className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Escopo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(modoLanc === 'mensal' ? (finDB.lancamentos || []).filter((l) => monthKeyFromDate(l.data) === selectedMonth) : lancamentosDiarios).map((lancamento) => (
                    <TableRow key={lancamento.id}>
                      <TableCell>{lancamento.data}</TableCell>
                      <TableCell>
                        <Badge className={lancamento.tipo === 'entrada' ? 'bg-[#9DBF7B]' : 'bg-[#B64B3A]'}>
                          {lancamento.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(lancamento as any).createdByName && (
                            <span className="inline-flex items-center rounded-full border px-2 py-[2px] text-xs text-[#4F6139] border-[#4F6139]/30 bg-[#9DBF7B]/10">
                              {(lancamento as any).createdByName}
                            </span>
                          )}
                          <span>{(lancamento as any).descricao || (lancamento as any).categoria}</span>
                        </div>
                      </TableCell>
                      <TableCell className={lancamento.tipo === 'entrada' ? 'text-[#9DBF7B]' : 'text-[#B64B3A]'}>
                        R$ {lancamento.valor.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>{lancamento.obraId ? (finDB.obras.find(o => o.id === lancamento.obraId)?.nome || '-') : '-'}</TableCell>
                      <TableCell>{(lancamento as any).escopo || 'caixa'}</TableCell>
                      <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => startEditLancamento(lancamento)} className="hover:bg-[#9DBF7B]/10 hover:text-[#4F6139] hover:rotate-6 transition-all">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteLancamento(lancamento.id)}
                            className="hover:bg-[#B64B3A]/10 hover:text-[#B64B3A] transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Prévia visível foi incorporada acima, removendo versão oculta para evitar duplicidade */}

            {/* Dialogo de edicao de lancamento */}
            <Dialog
              open={dialogEditLancamento}
              onOpenChange={(open: boolean) => {
                setDialogEditLancamento(open);
                if (!open) {
                  setEditingLancamentoId(null);
                  setLancamentoForm({ data: '', tipo: 'entrada', categoria: '', valor: '', obra: '', status: '' });
                }
              }}
            >
              <DialogContent className="rounded-[20px]">
                <DialogHeader>
                  <DialogTitle>Editar Lancamento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Tipo</Label>
                      <select
                      className="w-full h-10 px-3 rounded-xl border border-[rgba(79,97,57,0.2)] bg-white"
                      value={lancamentoForm.tipo}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLancamentoForm({ ...lancamentoForm, tipo: e.target.value })}
                    >
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saida</option>
                    </select>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Input className="rounded-xl" value={lancamentoForm.categoria} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLancamentoForm({ ...lancamentoForm, categoria: e.target.value })} />
                  </div>
                  <div>
                    <Label>Valor</Label>
                    <Input type="number" className="rounded-xl" value={lancamentoForm.valor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLancamentoForm({ ...lancamentoForm, valor: e.target.value })} />
                  </div>
                  <div>
                    <Label>Obra / Destino do gasto</Label>
                    <Select
                      value={(lancamentoForm.obra && lancamentoForm.obra.length > 0) ? lancamentoForm.obra : '-'}
                      onValueChange={(v: string) => setLancamentoForm({ ...lancamentoForm, obra: v })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione a obra ou Gasto Alternativo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">Gasto Alternativo</SelectItem>
                        {obrasSelect.map((nome) => (
                          <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Input className="rounded-xl" value={lancamentoForm.status} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLancamentoForm({ ...lancamentoForm, status: e.target.value })} />
                  </div>
                  <Button onClick={handleUpdateLancamento} className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl">Salvar alteracoes</Button>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>
        </TabsContent>

        {/* CAIXA */}
        <TabsContent value="caixa">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {(() => {
              const resumo = getResumoFinanceiro();
              const saldoIni = finDB.caixa?.saldoInicial || 0;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
                    <p className="text-[#626262] text-sm mb-1">Saldo Anterior</p>
                    <h3 className="text-2xl text-[#2C2C2C]">R$ {saldoIni.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  </Card>
                  <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
                    <p className="text-[#626262] text-sm mb-1">Entradas</p>
                    <h3 className="text-2xl text-[#9DBF7B]">+ R$ {resumo.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  </Card>
                  <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
                    <p className="text-[#626262] text-sm mb-1">Saídas</p>
                    <h3 className="text-2xl text-[#B64B3A]">- R$ {resumo.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  </Card>
                  <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[#626262] text-sm">Saldo Atual</p>
                      <button
                        className="text-[#4F6139] hover:underline text-xs"
                        onClick={() => { setSaldoNovo(String(resumo.saldo)); setDialogSaldoOpen(true); }}
                      >Editar</button>
                    </div>
                    <h3 className="text-2xl text-[#4F6139]">R$ {resumo.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  </Card>
                </div>
              );
            })()}

            <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <h2 className="mb-4">Adicionar Movimentação</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-xl border border-[rgba(79,97,57,0.2)] bg-white"
                    value={novaTipo}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNovaTipo(e.target.value)}
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input 
                    type="number" 
                    placeholder="R$ 0,00" 
                    className="rounded-xl" 
                    value={novoValor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNovoValor(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleAdicionarMovimentacao}
                    className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl"
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </Card>

            {/* Diálogo para ajustar apenas o Saldo em Caixa */}
            <Dialog open={dialogSaldoOpen} onOpenChange={(o: boolean) => setDialogSaldoOpen(o)}>
              <DialogContent className="rounded-[20px]">
                <DialogHeader>
                  <DialogTitle>Definir Saldo em Caixa</DialogTitle>
                  <DialogDescription>Vamos lançar um ajuste automático para chegar ao saldo desejado.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Novo saldo</Label>
                    <Input type="number" className="rounded-xl" value={saldoNovo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaldoNovo(e.target.value)} />
                  </div>
                  <Button
                    className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl"
                    onClick={() => {
                      // Ajustar saldo inicial do store para que o saldo atual fique exatamente no alvo
                      const target = Number(saldoNovo) || 0;
                      const resumo = getResumoFinanceiro();
                      const novoSaldoInicial = target - (resumo.entradas - resumo.saidas);
                      setSaldoInicial(novoSaldoInicial);
                      toast.success('Saldo inicial atualizado');
                      setDialogSaldoOpen(false);
                    }}
                  >Aplicar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>
        </TabsContent>

        {/* PARCELADAS */}
        <TabsContent value="parceladas">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex justify-end">
              <Dialog
                open={dialogParcelada}
                onOpenChange={(open: boolean) => {
                  setDialogParcelada(open);
                  if (!open) {
                    setEditingParceladaId(null);
                    setParceladaForm({ descricao: '', fornecedor: '', parcelaAtual: '', totalParcelas: '', valorParcela: '', valorTotal: '', vencimento: '' });
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingParceladaId(null);
                      setParceladaForm({ descricao: '', fornecedor: '', parcelaAtual: '', totalParcelas: '', valorParcela: '', valorTotal: '', vencimento: '' });
                    }}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive h-9 px-4 py-2 has-[>svg]:px-3 bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl"
                  >
                    <Plus className="h-4 w-4" />
                    Nova Compra Parcelada
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[20px]">
                  <DialogHeader>
                    <DialogTitle>{editingParceladaId ? 'Editar Compra Parcelada' : 'Nova Compra Parcelada'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Descrição</Label>
                      <Input className="rounded-xl" value={parceladaForm.descricao} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, descricao: e.target.value })} />
                    </div>
                    <div>
                      <Label>Fornecedor</Label>
                      <Input className="rounded-xl" value={parceladaForm.fornecedor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, fornecedor: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Parcela Atual</Label>
                        <Input type="number" className="rounded-xl" value={parceladaForm.parcelaAtual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, parcelaAtual: e.target.value })} />
                      </div>
                      <div>
                        <Label>Total de Parcelas</Label>
                        <Input type="number" className="rounded-xl" value={parceladaForm.totalParcelas} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, totalParcelas: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Valor da Parcela</Label>
                        <Input type="number" className="rounded-xl" value={parceladaForm.valorParcela} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, valorParcela: e.target.value })} />
                      </div>
                      <div>
                        <Label>Valor Total</Label>
                        <Input type="number" className="rounded-xl" value={parceladaForm.valorTotal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, valorTotal: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label>Vencimento</Label>
                      <Input className="rounded-xl" placeholder="DD/MM/AAAA" value={parceladaForm.vencimento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParceladaForm({ ...parceladaForm, vencimento: e.target.value })} />
                    </div>
                    <Button onClick={editingParceladaId ? handleUpdateParcelada : handleAddParcelada} className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl">
                      {editingParceladaId ? 'Salvar alterações' : 'Cadastrar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {parceladas.map((p) => (
                <Card
                  key={p.id}
                  onClick={() => setExpandedParceladas(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                  className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3>{p.descricao}</h3>
                        <Badge className={p.pago ? 'bg-[#9DBF7B]' : 'bg-[#B64B3A]'}>
                          {p.pago ? 'Pago' : 'Pendente'}
                        </Badge>
                      </div>
                      <p className="text-sm text-[#626262]">Fornecedor: {p.fornecedor}</p>
                      <p className="text-sm text-[#626262]">
                        Parcela atual: {p.parcelaAtual}/{p.totalParcelas} • Vencimento: {p.vencimento}
                      </p>
                      <p className="text-[#2C2C2C] mt-2">
                        R$ {p.valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / parcela
                      </p>
                      <p className="text-sm text-[#626262]">
                        Total: R$ {p.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); togglePagamentoParcelada(p.id); }}
                        size="icon"
                        className={`rounded-xl ${p.pago ? 'bg-[#9DBF7B] hover:bg-[#8aae6a]' : 'bg-[#B64B3A] hover:bg-[#a53d2d]'}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); startEditParcelada(p); }} className="hover:bg-[#9DBF7B]/10 hover:text-[#4F6139] hover:rotate-6 transition-all">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleDeleteParcelada(p.id); }}
                        className="hover:bg-[#B64B3A]/10 hover:text-[#B64B3A] transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {expandedParceladas[p.id] && (
                    <div className="mt-4 grid gap-2">
                      {Array.from({ length: Number(p.totalParcelas) || 0 }).map((_, idx) => {
                        const numero = idx + 1;
                        const isPaid = numero < Number(p.parcelaAtual) || (p.pago && numero === Number(p.parcelaAtual));
                        return (
                          <div key={numero} className="text-card-foreground flex items-center justify-between border p-3 bg-white rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
                            <div className="flex items-center gap-2">
                              {isPaid ? (
                                <CheckCircle2 className="h-4 w-4 text-[#4F6139]" />
                              ) : (
                                <span className="h-4 w-4 rounded-full border border-[#4F6139]/30" />
                              )}
                              <span className="text-sm text-[#2C2C2C]">Parcela {numero}/{p.totalParcelas}</span>
                            </div>
                            <span className={isPaid ? 'text-[#9DBF7B]' : 'text-[#2C2C2C]'}>
                              R$ {Number(p.valorParcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* OBRAS (espelha Obras/Equipes) */}
        <TabsContent value="obras">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-[#626262]">Relatório de despesas por obra - mês: {selectedMonth}</div>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  const rows: string[] = ['obra;data;descricao;valor'];
                  equipesObras.forEach((obra) => {
                    (obra.despesas || []).forEach((d) => {
                      if (monthKeyFromDate(d.data) === selectedMonth) {
                        const valor = String(Number(d.valor) || 0).replace('.', ',');
                        rows.push(`${obra.obra};${d.data};${(d.nome || '').replaceAll(';', ',')};${valor}`);
                      }
                    });
                  });
                  const csv = rows.join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `despesas_${selectedMonth}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >Exportar CSV (mês)</Button>
            </div>
            <div className="grid gap-4">
              {equipesObras.length === 0 && (
                <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
                  <div className="text-sm text-[#626262]">
                    Nenhuma obra encontrada. Cadastre novas obras em Dashboard &gt; Obras/Equipes.
                  </div>
                </Card>
              )}
              {[...equipesObras].map((obra) => {
                const totalDespesas = (obra.despesas || []).reduce((s, d) => s + (Number(d.valor) || 0), 0);
                const restante = (obra.custos || 0) - totalDespesas;
                return (
                  <Card key={obra.id} className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3>{obra.obra}</h3>
                          <Badge className={(obra.status ?? 'ativo') === 'ativo' ? 'bg-[#9DBF7B]' : 'bg-[#626262]'}>
                            {(obra.status ?? 'ativo') === 'ativo' ? 'Ativo' : 'Concluído'}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#626262] mb-3">Cidade: {obra.nome}</p>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-[#626262]">Receita</p>
                            <p className="text-[#9DBF7B]">R$ {Number(obra.custos || 0).toLocaleString('pt-BR')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#626262]">Gastos</p>
                            <p className="text-[#B64B3A]">R$ {Number(totalDespesas).toLocaleString('pt-BR')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#626262]">Saldo Restante</p>
                            <p className="text-[#4F6139]">R$ {Number(restante).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(obra.status ?? 'ativo') === 'ativo' && (
                          <Button
                            onClick={() => finalizeObraEquipes(obra)}
                            className="bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl"
                          >
                            Finalizar Obra
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="hover:bg-[#B64B3A]/10 hover:text-[#B64B3A] transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[16px]">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover obra?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Essa ação não pode ser desfeita. A obra "{obra.obra}" será removida do sistema.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteObra(obra.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            {/* Dialog legacy removido para evitar warnings de acessibilidade do Radix */}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

