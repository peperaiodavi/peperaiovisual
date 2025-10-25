import { useEffect, useState } from 'react';

export interface Lancamento {
  id: string;
  data: string;
  tipo: 'entrada' | 'saida';
  categoria: string;
  valor: number;
  obra: string;
  status: string;
}

const KEY = 'peperaio_lancamentos';

export default function useLancamentos() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        setLancamentos(JSON.parse(raw));
      } catch (e) {
        setLancamentos([]);
      }
    } else {
      const initial: Lancamento[] = [
        { id: '1', data: '20/10/2025', tipo: 'entrada', categoria: 'Pagamento Cliente', valor: 15000, obra: 'Shopping Center', status: 'Confirmado' },
        { id: '2', data: '21/10/2025', tipo: 'saida', categoria: 'Material', valor: 4500, obra: 'Shopping Center', status: 'Pago' },
        { id: '3', data: '22/10/2025', tipo: 'saida', categoria: 'Salários', valor: 12000, obra: '-', status: 'Pago' },
      ];
      setLancamentos(initial);
      localStorage.setItem(KEY, JSON.stringify(initial));
    }
    // Assina eventos para sincronizar com outras instâncias do hook
    const handleSync = () => {
      try {
        const r = localStorage.getItem(KEY);
        setLancamentos(r ? JSON.parse(r) : []);
      } catch {
        setLancamentos([]);
      }
    };
    const handleStorage = (e: StorageEvent) => { if (e.key === KEY) handleSync(); };
    window.addEventListener('peperaio_lancamentos_updated', handleSync as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('peperaio_lancamentos_updated', handleSync as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(lancamentos));
  }, [lancamentos]);

  const addLancamento = (l: Omit<Lancamento, 'id'> & { id?: string }) => {
    const item: Lancamento = { id: l.id ?? Date.now().toString(), data: l.data, tipo: l.tipo, categoria: l.categoria, valor: Number(l.valor) || 0, obra: l.obra, status: l.status };
    setLancamentos((prev) => {
      const next = [...prev, item];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      try { window.dispatchEvent(new Event('peperaio_lancamentos_updated')); } catch {}
      return next;
    });
    return item;
  };

  const updateLancamento = (id: string, patch: Partial<Lancamento>) => {
    setLancamentos((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch, valor: patch.valor !== undefined ? Number(patch.valor) : p.valor } : p));
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      try { window.dispatchEvent(new Event('peperaio_lancamentos_updated')); } catch {}
      return next;
    });
  };

  const deleteLancamento = (id: string) => setLancamentos((prev) => {
    const next = prev.filter((p) => p.id !== id);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    try { window.dispatchEvent(new Event('peperaio_lancamentos_updated')); } catch {}
    return next;
  });

  const clearLancamentos = () => {
    setLancamentos(() => {
      try { localStorage.setItem(KEY, JSON.stringify([])); } catch {}
      try { window.dispatchEvent(new Event('peperaio_lancamentos_updated')); } catch {}
      return [];
    });
  };

  return { lancamentos, addLancamento, updateLancamento, deleteLancamento, setLancamentos, clearLancamentos };
}
