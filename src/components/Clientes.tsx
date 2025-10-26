import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { supabase } from '../lib/supabaseClient';

interface Cliente {
  id: string;
  nome: string;
  cnpj: string;
  contato: string;
  data: string;
}

const STORAGE_KEY = 'peperaio_clientes'; // legado; pode remover depois

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState({ nome: '', cnpj: '', contato: '', data: '' });

  // 1) Carregar do Supabase
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setClientes(data as any);
    })();
  }, []);

  // 2) Salvar (insert/update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingCliente) {
      const { error } = await supabase
        .from('clientes')
        .update({
          nome: formData.nome,
          cnpj: formData.cnpj,
          contato: formData.contato,
          data: formData.data,
        })
        .eq('id', editingCliente.id)
        .eq('owner_id', user.id);
      if (!error) {
        setClientes((arr) => arr.map(c => c.id === editingCliente.id ? { ...c, ...formData } as any : c));
        toast.success('Cliente atualizado com sucesso!');
      }
    } else {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          owner_id: user.id,
          nome: formData.nome,
          cnpj: formData.cnpj,
          contato: formData.contato,
          data: formData.data,
        })
        .select()
        .single();
      if (!error && data) {
        setClientes((arr) => [data as any, ...arr]);
        toast.success('Cliente adicionado com sucesso!');
      }
    }

    setDialogOpen(false);
    setFormData({ nome: '', cnpj: '', contato: '', data: '' });
    setEditingCliente(null);
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({ nome: cliente.nome, cnpj: cliente.cnpj, contato: cliente.contato, data: cliente.data });
    setDialogOpen(true);
  };

  // 3) Remover
  const handleDelete = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) {
      setClientes((arr) => arr.filter((c) => c.id !== id));
      toast.success('Cliente removido com sucesso!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl mb-1">Clientes</h1>
          <p className="text-[#626262]">Gerencie seus clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingCliente(null);
                setFormData({ nome: '', cnpj: '', contato: '', data: '' });
              }}
              className="bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl transition-all duration-300 hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[20px]">
            <DialogHeader>
              <DialogTitle>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nome: e.target.value })}
                  className="rounded-xl"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cnpj: e.target.value })}
                  className="rounded-xl"
                  required
                />
              </div>
              <div>
                <Label htmlFor="contato">Contato</Label>
                <Input
                  id="contato"
                  value={formData.contato}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contato: e.target.value })}
                  className="rounded-xl"
                  required
                />
              </div>
              <div>
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  value={formData.data}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, data: e.target.value })}
                  className="rounded-xl"
                  placeholder="DD/MM/AAAA"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl">
                {editingCliente ? 'Salvar' : 'Adicionar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell>{cliente.nome}</TableCell>
                    <TableCell>{cliente.cnpj}</TableCell>
                    <TableCell>{cliente.contato}</TableCell>
                    <TableCell>{cliente.data}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cliente)}
                          className="hover:bg-[#9DBF7B]/10 hover:text-[#4F6139] transition-all duration-300 hover:rotate-6"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cliente.id)}
                          className="hover:bg-[#B64B3A]/10 hover:text-[#B64B3A] transition-all duration-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

