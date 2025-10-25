import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDividaId: string | null;
  dividaForm: { descricao: string; valor: string };
  setDividaForm: (v: { descricao: string; valor: string }) => void;
  onSave: () => void;
};

export function DividaDialog({ open, onOpenChange, editingDividaId, dividaForm, setDividaForm, onSave }: Props) {
  return (
  <Dialog open={open} onOpenChange={(openState: boolean) => { onOpenChange(openState); if (!openState) { /* parent clears state */ } }}>
      <DialogContent className="rounded-[20px]">
        <DialogHeader>
          <DialogTitle>{editingDividaId ? 'Editar Dívida' : 'Cadastrar Dívida'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input className="rounded-xl" value={dividaForm.descricao} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDividaForm({ ...dividaForm, descricao: e.target.value })} />
          </div>
          <div>
            <Label>Valor</Label>
            <Input type="number" className="rounded-xl" value={dividaForm.valor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDividaForm({ ...dividaForm, valor: e.target.value })} />
          </div>
          <Button onClick={() => { if (!dividaForm.descricao || !dividaForm.valor) { toast.error('Preencha nome e valor'); return; } onSave(); }} className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl">{editingDividaId ? 'Salvar alterações' : 'Cadastrar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
