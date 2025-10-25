import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import useObras from '../hooks/useObras';
import { equipesObrasOptions } from '../utils/obras';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  form: { nome: string; valor: string; telefone: string; dataPrevista: string; obraId: string };
  setForm: React.Dispatch<React.SetStateAction<{ nome: string; valor: string; telefone: string; dataPrevista: string; obraId: string }>>;
  onSave: () => void;
};

export function RecebivelDialog({ open, onOpenChange, editingId, form, setForm, onSave }: Props) {
  const { obras } = useObras();
  const equipesOptions = equipesObrasOptions();
  return (
    <Dialog open={open} onOpenChange={(openState: boolean) => { onOpenChange(openState); if (!openState) { /* parent clears */ } }}>
      <DialogContent className="rounded-[20px]">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Editar Recebível' : 'Novo Recebível'}</DialogTitle>
          <DialogDescription>Informe os dados do recebível. Você pode relacioná-lo a uma obra, se quiser.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input className="rounded-xl" value={form.nome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Valor</Label>
            <Input type="number" className="rounded-xl" value={form.valor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, valor: e.target.value })} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input className="rounded-xl" value={form.telefone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, telefone: e.target.value })} />
          </div>
          <div>
            <Label>Data prevista</Label>
            <Input type="date" className="rounded-xl" value={form.dataPrevista} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, dataPrevista: e.target.value })} />
          </div>
          <div>
            <Label>Relacionar à obra (opcional)</Label>
            <Select
              value={form.obraId}
              onValueChange={(v: string) => setForm({ ...form, obraId: v })}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sem obra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem obra</SelectItem>
                {/* Opções vindas das obras de Equipes (fonte principal) */}
                {equipesOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
                {/* Fallback: obras do módulo legado, caso existam */}
                {equipesOptions.length === 0 && [...obras].sort((a,b)=>a.nome.localeCompare(b.nome)).map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { if (!form.nome || !form.valor) { toast.error('Preencha nome e valor'); return; } onSave(); }} className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl">{editingId ? 'Salvar' : 'Cadastrar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
