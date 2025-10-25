import { useEffect, useState } from 'react';

export interface Obra {
  id: string;
  nome: string;
  equipe: string;
  receita: number;
  gastos: number;
  status?: 'em-andamento' | 'finalizada';
}

const KEY = 'peperaio_obras';

export default function useObras() {
  const [obras, setObras] = useState<Obra[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Obra[];
        setObras(parsed.map(o => ({ ...o, status: o.status ?? 'em-andamento' })));
      } catch {
        setObras([]);
      }
    } else {
      const initial: Obra[] = [
        { id: '1', nome: 'Shopping Center - Fachada', equipe: 'Equipe Alpha', receita: 85000, gastos: 52000, status: 'em-andamento' },
        { id: '2', nome: 'Loja XYZ - Interior', equipe: 'Equipe Beta', receita: 35000, gastos: 21000, status: 'em-andamento' },
        { id: '3', nome: 'Restaurante ABC - Letreiro', equipe: 'Equipe Gamma', receita: 28000, gastos: 18000, status: 'em-andamento' },
      ];
      setObras(initial);
      localStorage.setItem(KEY, JSON.stringify(initial));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(obras));
  }, [obras]);

  const addObra = (o: Omit<Obra, 'id' | 'gastos' | 'status'> & { id?: string; gastos?: number; status?: Obra['status'] }) => {
    const item: Obra = {
      id: o.id ?? Date.now().toString(),
      nome: o.nome,
      equipe: o.equipe,
      receita: Number(o.receita) || 0,
      gastos: Number(o.gastos) || 0,
      status: o.status ?? 'em-andamento',
    };
    setObras(prev => [...prev, item]);
    return item;
  };

  const updateObra = (id: string, patch: Partial<Obra>) => {
    setObras(prev => prev.map(p => p.id === id ? { ...p, ...patch, receita: patch.receita !== undefined ? Number(patch.receita) : p.receita, gastos: patch.gastos !== undefined ? Number(patch.gastos) : p.gastos } : p));
  };

  const deleteObra = (id: string) => setObras(prev => prev.filter(p => p.id !== id));

  const addGastoObra = (id: string, amount: number) => {
    if (!amount || amount <= 0) return;
    setObras(prev => prev.map(p => p.id === id ? { ...p, gastos: Number(p.gastos || 0) + amount } : p));
  };

  const finalizeObra = (id: string) => {
    setObras(prev => prev.map(p => p.id === id ? { ...p, status: 'finalizada' } : p));
    const obra = obras.find(o => o.id === id);
    return obra ? { ...obra, status: 'finalizada' as const } : undefined;
  };

  return { obras, addObra, updateObra, deleteObra, addGastoObra, finalizeObra, setObras };
}
