import { useEffect, useState } from 'react';

export type Receber = {
  id: string;
  nome: string;
  valor: number;
  telefone?: string;
  dataPrevista?: string; // DD/MM/YYYY
  obraId?: string; // relacionamento opcional com obra
};

const KEY = 'peperaio_receber';

export default function useReceber(opts?: { onPayment?: (r: Receber, amount: number) => void }) {
  const [receber, setReceber] = useState<Receber[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        setReceber(JSON.parse(raw));
      } catch (e) {
        setReceber([]);
      }
    } else {
      setReceber([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(receber));
  }, [receber]);

  const addReceber = (r: Omit<Receber, 'id'> & { id?: string }) => {
    const item: Receber = { id: r.id ?? Date.now().toString(), nome: r.nome, valor: Number(r.valor) || 0, telefone: r.telefone, dataPrevista: r.dataPrevista, obraId: r.obraId };
    setReceber(prev => [...prev, item]);
    return item;
  };

  const updateReceber = (id: string, patch: Partial<Receber>) => {
    setReceber(prev => prev.map(p => p.id === id ? { ...p, ...patch, valor: patch.valor !== undefined ? Number(patch.valor) : p.valor } : p));
  };

  const deleteReceber = (id: string) => {
    setReceber(prev => prev.filter(p => p.id !== id));
  };

  const registerPayment = (id: string, amount: number) => {
    if (!amount || amount <= 0) return;
    const r = receber.find(x => x.id === id);
    if (!r) return;
    // trigger callback so caller can create lancamento
    opts?.onPayment?.(r, amount);
    const newValor = Math.max(0, Number(r.valor) - amount);
    if (newValor <= 0) {
      // remove automatically when fully paid
      deleteReceber(id);
    } else {
      updateReceber(id, { valor: newValor });
    }
  };

  const clearReceber = () => setReceber([]);

  return { receber, addReceber, updateReceber, deleteReceber, registerPayment, clearReceber };
}
