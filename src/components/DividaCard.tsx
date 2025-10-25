import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { Divida } from '../hooks/useDividas';

type Props = {
  d: Divida;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePaid: () => void;
};

export function DividaCard({ d, onEdit, onDelete, onTogglePaid }: Props) {
  return (
    <Card key={d.id} className="w-full p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="mb-1">{d.descricao}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#626262]">Valor</p>
              <p className="text-[#B64B3A]">R$ {d.valor.toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-xs text-[#626262]">Status</p>
              <p>
                <Badge className={d.pago ? 'bg-[#9DBF7B]' : 'bg-[#B64B3A]'}>{d.pago ? 'Pago' : 'Pendente'}</Badge>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 justify-end">
          {/* marca pago: botão circular colorido similar a Parceladas */}
          <Button
            onClick={onTogglePaid}
            size="icon"
            className={`${d.pago ? 'bg-[#9DBF7B] hover:bg-[#8aae6a]' : 'bg-[#B64B3A] hover:bg-[#a43d2d]'} text-white rounded-full transition-all`}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={onEdit} className="hover:bg-[#9DBF7B]/10 hover:text-[#4F6139] hover:rotate-6 transition-all">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="hover:bg-[#B64B3A]/10 hover:text-[#B64B3A] transition-all">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
