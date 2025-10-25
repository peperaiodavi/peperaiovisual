import { useEffect, useRef, useState } from 'react';

export type DespesaEquipe = { id: string; nome: string; valor: number; data: string };
export type ObraEquipe = { id: string; nome: string; obra: string; membros: string[]; custos: number; status: 'ativo' | 'concluido'; despesas?: DespesaEquipe[] };

const KEY = 'peperaio_equipes';

export default function useEquipesObras() {
  const [equipesObras, setEquipesObras] = useState<ObraEquipe[]>([]);
  // Mantém o último snapshot serializado para evitar loops e writes redundantes
  const lastSerializedRef = useRef<string | null>(null);

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const raw = localStorage.getItem(KEY);
        // Se o conteúdo não mudou desde o último write conhecido, evita setState
        if (raw === lastSerializedRef.current) return;
        if (raw == null) {
          if (lastSerializedRef.current !== null) {
            lastSerializedRef.current = null;
            setEquipesObras([]);
          }
          return;
        }
        // Atualiza somente quando há diferença real
        lastSerializedRef.current = raw;
        setEquipesObras(JSON.parse(raw));
      } catch {
        lastSerializedRef.current = null;
        setEquipesObras([]);
      }
    };

    // Primeira leitura ao montar
    syncFromStorage();

    const onFocus = () => syncFromStorage();
    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<{ source?: string }>;
      // Ignora eventos emitidos por este próprio hook
      if (ce.detail?.source === 'useEquipesObras') return;
      syncFromStorage();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) syncFromStorage();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('peperaio_equipes_updated', onCustom as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('peperaio_equipes_updated', onCustom as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    try {
      const next = JSON.stringify(equipesObras);
      // Evita writes redundantes e loops de eventos
      if (next !== lastSerializedRef.current) {
        localStorage.setItem(KEY, next);
        lastSerializedRef.current = next;
        // Notifica outras partes da mesma aba, marcando a origem
        window.dispatchEvent(
          new CustomEvent('peperaio_equipes_updated', {
            detail: { source: 'useEquipesObras' },
          }),
        );
      }
    } catch {}
  }, [equipesObras]);

  return { equipesObras, setEquipesObras };
}
