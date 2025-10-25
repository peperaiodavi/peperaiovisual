import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Pencil, Trash2 } from 'lucide-react';
import { Receber } from '../hooks/useReceber';

type Props = {
  r: Receber;
  onEdit: () => void;
  onDelete: () => void;
  onRegister: (amount: number) => void;
};

export function RecebivelCard({ r, onEdit, onDelete, onRegister }: Props) {
  return (
    <Card className="p-4 bg-white rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="mb-1">{r.nome}</h4>
          <p className="text-sm text-[#626262] mb-1">{r.telefone || ''} {r.dataPrevista ? `• Previsto: ${r.dataPrevista}` : ''}</p>
          <p className="text-[#4F6139]">R$ {Number(r.valor).toLocaleString('pt-BR')}</p>
        </div>
        <div className="flex items-end gap-2">
          <Input id={`pay-${r.id}`} type="number" placeholder="Valor pago" className="w-36" />
          <Button onClick={() => {
            const el = document.getElementById(`pay-${r.id}`) as HTMLInputElement | null;
            if (!el) return;
            const v = Number(el.value || 0);
            if (!v || v <= 0) return;
            onRegister(v);
            el.value = '';
          }} className="bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl">Registrar</Button>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
