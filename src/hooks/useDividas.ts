import { useEffect, useState } from 'react';

export type Divida = {
  id: string;
  descricao: string;
  valor: number;
  pago: boolean;
};

const KEY = 'peperaio_dividas';

export default function useDividas() {
  const [dividas, setDividas] = useState<Divida[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        setDividas(JSON.parse(raw));
      } catch (e) {
        setDividas([]);
      }
    } else {
      // default initial set (keeps previous app behavior)
      const initial: Divida[] = [
        { id: 'd1', descricao: 'Fatura de energia', valor: 820, pago: false },
      ];
      setDividas(initial);
      localStorage.setItem(KEY, JSON.stringify(initial));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(dividas));
  }, [dividas]);

  const addDivida = (d: Omit<Divida, 'id'> & { id?: string }) => {
    const item: Divida = { id: d.id ?? Date.now().toString(), descricao: d.descricao, valor: Number(d.valor) || 0, pago: !!d.pago };
    setDividas(prev => [...prev, item]);
    return item;
  };

  const updateDivida = (id: string, patch: Partial<Divida>) => {
    setDividas(prev => prev.map(p => p.id === id ? { ...p, ...patch, valor: patch.valor !== undefined ? Number(patch.valor) : p.valor } : p));
  };

  const deleteDivida = (id: string) => setDividas(prev => prev.filter(p => p.id !== id));

  const togglePaid = (id: string) => setDividas(prev => prev.map(p => p.id === id ? { ...p, pago: !p.pago } : p));

  const clearDividas = () => setDividas([]);

  return { dividas, addDivida, updateDivida, deleteDivida, togglePaid, clearDividas };
}
