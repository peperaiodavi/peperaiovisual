import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { supabase } from '../lib/supabaseClient';
import { Require } from './Require';

type Fornecedor = {
  id: string;
  nome: string;
  cnpj?: string;
  contato?: string;
  endereco?: string;
  tipo?: string;
};

interface Material {
  id: string;
  nome: string;
  fornecedor: string;
  unidade: string;
  categoria: string;
  preco: string;
}

interface Compra {
  id: string;
  fornecedor: string;
  materiais: string;
  quantidade: string;
  valor: string;
  pagamento: string;
  obra: string;
  parcela: string;
  pago: boolean;
}

export function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);

  const [dialogFornecedor, setDialogFornecedor] = useState(false);
  const [editingFornecedorId, setEditingFornecedorId] = useState<string | null>(null);
  const [dialogMaterial, setDialogMaterial] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [dialogCompra, setDialogCompra] = useState(false);
  const [editingCompraId, setEditingCompraId] = useState<string | null>(null);

  const [fornecedorForm, setFornecedorForm] = useState({ nome: '', cnpj: '', contato: '', endereco: '', tipo: '' });
  const [materialForm, setMaterialForm] = useState({ nome: '', fornecedor: '', unidade: '', categoria: '', preco: '' });
  const [compraForm, setCompraForm] = useState({ fornecedor: '', materiais: '', quantidade: '', valor: '', pagamento: '', obra: '', parcela: '' });

  useEffect(() => {
    // 1) Fornecedores sempre do banco
    fetchFornecedores();

    // 2) Materiais/Compras: só carrega se existir; não criar seed
    const storedM = localStorage.getItem('peperaio_materiais');
    const storedC = localStorage.getItem('peperaio_compras');

    setMateriais(storedM ? JSON.parse(storedM) : []);
    setCompras(storedC ? JSON.parse(storedC) : []);
  }, []);

  // Busca atualizada no banco (Supabase)
  const fetchFornecedores = async () => {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('id,nome,cnpj,contato,endereco,tipo')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[fornecedores] erro ao buscar:', error);
      return; // mantém estado atual se falhar
    }
    setFornecedores((data as any) || []);
  };

  // Removido: fornecedores agora vêm do Supabase

  useEffect(() => {
    if (materiais.length > 0) localStorage.setItem('peperaio_materiais', JSON.stringify(materiais));
  }, [materiais]);

  useEffect(() => {
    if (compras.length > 0) localStorage.setItem('peperaio_compras', JSON.stringify(compras));
  }, [compras]);

  const handleAddFornecedor = async () => {
    if (!fornecedorForm.nome) return;
    const { data, error } = await supabase
      .from('fornecedores')
      .insert({
        nome: fornecedorForm.nome,
        cnpj: fornecedorForm.cnpj || null,
        contato: fornecedorForm.contato || null,
        endereco: fornecedorForm.endereco || null,
        tipo: fornecedorForm.tipo || null,
      })
      .select('id,nome,cnpj,contato,endereco,tipo')
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    await fetchFornecedores();
    setFornecedorForm({ nome: '', cnpj: '', contato: '', endereco: '', tipo: '' });
    setDialogFornecedor(false);
    toast.success('Fornecedor adicionado!');
  };

  const startEditFornecedor = (f: Fornecedor) => {
    setEditingFornecedorId(f.id);
    setFornecedorForm({
      nome: f.nome,
      cnpj: f.cnpj ?? '',
      contato: f.contato ?? '',
      endereco: f.endereco ?? '',
      tipo: f.tipo ?? '',
    });
    setDialogFornecedor(true);
  };

  const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

  const handleUpdateFornecedor = async () => {
    if (!editingFornecedorId) return;
    if (!isUUID(editingFornecedorId)) { alert(`ID inválido: ${editingFornecedorId}`); return; }
    if (!fornecedorForm.nome) return;
    const { error } = await supabase
      .from('fornecedores')
      .update({
        nome: fornecedorForm.nome,
        cnpj: fornecedorForm.cnpj || null,
        contato: fornecedorForm.contato || null,
        endereco: fornecedorForm.endereco || null,
        tipo: fornecedorForm.tipo || null,
      })
      .eq('id', editingFornecedorId);
    if (error) { alert(`Não foi possível atualizar: ${error.message}`); return; }
    await fetchFornecedores();
    setEditingFornecedorId(null);
    setFornecedorForm({ nome: '', cnpj: '', contato: '', endereco: '', tipo: '' });
    setDialogFornecedor(false);
    toast.success('Fornecedor atualizado!');
  };

  const handleDeleteFornecedor = async (id: string) => {
    if (!isUUID(id)) { alert(`ID inválido: ${id}`); return; }
    const { error } = await supabase
      .from('fornecedores')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { alert(`Não foi possível excluir: ${error.message}`); return; }
    await fetchFornecedores();
    toast.success('Fornecedor removido!');
  };

  const handleAddMaterial = () => {
    if (!materialForm.nome) return;
    setMateriais([...materiais, { ...materialForm, id: Date.now().toString() }]);
    setMaterialForm({ nome: '', fornecedor: '', unidade: '', categoria: '', preco: '' });
    setDialogMaterial(false);
    toast.success('Material adicionado!');
  };

  const handleDeleteMaterial = (id: string) => {
    setMateriais(materiais.filter(m => m.id !== id));
    toast.success('Material removido!');
  };

  const startEditMaterial = (m: Material) => {
    setEditingMaterialId(m.id);
    setMaterialForm({
      nome: m.nome,
      fornecedor: m.fornecedor,
      unidade: m.unidade,
      categoria: m.categoria,
      preco: m.preco,
    });
    setDialogMaterial(true);
  };

  const handleUpdateMaterial = () => {
    if (!editingMaterialId) return;
    if (!materialForm.nome) return;
    setMateriais(
      materiais.map((m) => (m.id === editingMaterialId ? { ...m, ...materialForm } : m))
    );
    setEditingMaterialId(null);
    setMaterialForm({ nome: '', fornecedor: '', unidade: '', categoria: '', preco: '' });
    setDialogMaterial(false);
    toast.success('Material atualizado!');
  };

  const handleAddCompra = () => {
    if (!compraForm.fornecedor) return;
    setCompras([...compras, { ...compraForm, id: Date.now().toString(), pago: false }]);
    setCompraForm({ fornecedor: '', materiais: '', quantidade: '', valor: '', pagamento: '', obra: '', parcela: '' });
    setDialogCompra(false);
    toast.success('Compra registrada!');
  };

  const handleDeleteCompra = (id: string) => {
    setCompras(compras.filter(c => c.id !== id));
    toast.success('Compra removida!');
  };

  const startEditCompra = (c: Compra) => {
    setEditingCompraId(c.id);
    setCompraForm({
      fornecedor: c.fornecedor,
      materiais: c.materiais,
      quantidade: c.quantidade,
      valor: c.valor,
      pagamento: c.pagamento,
      obra: c.obra,
      parcela: c.parcela,
    });
    setDialogCompra(true);
  };

  const handleUpdateCompra = () => {
    if (!editingCompraId) return;
    if (!compraForm.fornecedor) return;
    setCompras(
      compras.map((c) => (c.id === editingCompraId ? { ...c, ...compraForm } : c))
    );
    setEditingCompraId(null);
    setCompraForm({ fornecedor: '', materiais: '', quantidade: '', valor: '', pagamento: '', obra: '', parcela: '' });
    setDialogCompra(false);
    toast.success('Compra atualizada!');
  };

  const togglePagamento = (id: string) => {
    setCompras(compras.map(c => c.id === id ? { ...c, pago: !c.pago } : c));
    const compra = compras.find(c => c.id === id);
    toast.success(compra?.pago ? 'Marcado como pendente' : 'Pagamento confirmado!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl mb-1">Fornecedores e Materiais</h1>
        <p className="text-[#626262]">Gerencie fornecedores, materiais e compras</p>
      </div>

      <Tabs defaultValue="fornecedores" className="w-full">
        <TabsList className="bg-white rounded-xl p-1 shadow-sm">
          <TabsTrigger value="fornecedores" className="rounded-lg data-[state=active]:bg-[#4F6139] data-[state=active]:text-white transition-all duration-300">
            Fornecedores
          </TabsTrigger>
          <TabsTrigger value="materiais" className="rounded-lg data-[state=active]:bg-[#4F6139] data-[state=active]:text-white transition-all duration-300">
            Materiais
          </TabsTrigger>
          <TabsTrigger value="historico" className="rounded-lg data-[state=active]:bg-[#4F6139] data-[state=active]:text-white transition-all duration-300">
            Histórico de Compras
          </TabsTrigger>
        </TabsList>

        {/* FORNECEDORES */}
        <TabsContent value="fornecedores">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex justify-end">
              <Dialog open={dialogFornecedor} onOpenChange={(open: boolean) => {
                setDialogFornecedor(open);
                if (!open) {
                  setEditingFornecedorId(null);
                  setFornecedorForm({ nome: '', cnpj: '', contato: '', endereco: '', tipo: '' });
                }
              }}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingFornecedorId(null);
                      setFornecedorForm({ nome: '', cnpj: '', contato: '', endereco: '', tipo: '' });
                    }}
                    className="bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Fornecedor
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[20px]">
                  <DialogHeader>
                    <DialogTitle>{editingFornecedorId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <Input 
                        className="rounded-xl" 
                        value={fornecedorForm.nome}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFornecedorForm({ ...fornecedorForm, nome: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>CNPJ</Label>
                      <Input 
                        className="rounded-xl" 
                        value={fornecedorForm.cnpj}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFornecedorForm({ ...fornecedorForm, cnpj: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Contato</Label>
                      <Input 
                        className="rounded-xl" 
                        value={fornecedorForm.contato}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFornecedorForm({ ...fornecedorForm, contato: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Endereço</Label>
                      <Input 
                        className="rounded-xl" 
                        value={fornecedorForm.endereco}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFornecedorForm({ ...fornecedorForm, endereco: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Input 
                        className="rounded-xl" 
                        value={fornecedorForm.tipo}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFornecedorForm({ ...fornecedorForm, tipo: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={editingFornecedorId ? handleUpdateFornecedor : handleAddFornecedor}
                      className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl"
                    >
                      {editingFornecedorId ? 'Salvar alterações' : 'Adicionar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fornecedores.map((fornecedor) => (
                    <TableRow key={fornecedor.id}>
                      <TableCell>{fornecedor.nome}</TableCell>
                      <TableCell>{fornecedor.cnpj}</TableCell>
                      <TableCell>{fornecedor.contato}</TableCell>
                      <TableCell>{fornecedor.tipo}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Require roles="admin">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditFornecedor(fornecedor)}
                            className="hover:bg-[#9DBF7B]/10 hover:text-[#4F6139] hover:rotate-6 transition-all"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          </Require>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteFornecedor(fornecedor.id)}
                            className="hover:bg-[#B64B3A]/10 hover:text-[#B64B3A] transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        </TabsContent>

        {/* MATERIAIS */}
        <TabsContent value="materiais">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex justify-end">
              <Dialog
                open={dialogMaterial}
                onOpenChange={(open: boolean) => {
                  setDialogMaterial(open);
                  if (!open) {
                    setEditingMaterialId(null);
                    setMaterialForm({ nome: '', fornecedor: '', unidade: '', categoria: '', preco: '' });
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingMaterialId(null);
                      setMaterialForm({ nome: '', fornecedor: '', unidade: '', categoria: '', preco: '' });
                    }}
                    className="bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Material
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[20px]">
                  <DialogHeader>
                    <DialogTitle>{editingMaterialId ? 'Editar Material' : 'Novo Material'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <Input 
                        className="rounded-xl" 
                        value={materialForm.nome}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaterialForm({ ...materialForm, nome: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Fornecedor</Label>
                      <Select value={materialForm.fornecedor} onValueChange={(v: string) => setMaterialForm({ ...materialForm, fornecedor: v })}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {fornecedores.map(f => (
                            <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Unidade</Label>
                      <Input 
                        className="rounded-xl" 
                        placeholder="Ex: m², kg, un" 
                        value={materialForm.unidade}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaterialForm({ ...materialForm, unidade: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Input 
                        className="rounded-xl" 
                        value={materialForm.categoria}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaterialForm({ ...materialForm, categoria: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Preço de Compra</Label>
                      <Input 
                        className="rounded-xl" 
                        placeholder="R$ 0,00" 
                        value={materialForm.preco}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaterialForm({ ...materialForm, preco: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={editingMaterialId ? handleUpdateMaterial : handleAddMaterial}
                      className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl"
                    >
                      {editingMaterialId ? 'Salvar alterações' : 'Adicionar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materiais.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>{material.nome}</TableCell>
                      <TableCell>{material.fornecedor}</TableCell>
                      <TableCell>{material.unidade}</TableCell>
                      <TableCell>{material.categoria}</TableCell>
                      <TableCell>{material.preco}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Require roles="admin">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditMaterial(material)}
                            className="hover:bg-[#9DBF7B]/10 hover:text-[#4F6139] hover:rotate-6 transition-all"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          </Require>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteMaterial(material.id)}
                            className="hover:bg-[#B64B3A]/10 hover:text-[#B64B3A] transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        </TabsContent>

        {/* HISTÓRICO DE COMPRAS */}
        <TabsContent value="historico">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex justify-end">
              <Dialog
                open={dialogCompra}
                onOpenChange={(open: boolean) => {
                  setDialogCompra(open);
                  if (!open) {
                    setEditingCompraId(null);
                    setCompraForm({ fornecedor: '', materiais: '', quantidade: '', valor: '', pagamento: '', obra: '', parcela: '' });
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingCompraId(null);
                      setCompraForm({ fornecedor: '', materiais: '', quantidade: '', valor: '', pagamento: '', obra: '', parcela: '' });
                    }}
                    className="bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Compra
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[20px]">
                  <DialogHeader>
                    <DialogTitle>{editingCompraId ? 'Editar Compra' : 'Nova Compra'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Fornecedor</Label>
                      <Select value={compraForm.fornecedor} onValueChange={(v: string) => setCompraForm({ ...compraForm, fornecedor: v })}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {fornecedores.map(f => (
                            <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Materiais</Label>
                      <Input 
                        className="rounded-xl" 
                        value={compraForm.materiais}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompraForm({ ...compraForm, materiais: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Quantidade</Label>
                      <Input 
                        className="rounded-xl" 
                        value={compraForm.quantidade}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompraForm({ ...compraForm, quantidade: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Valor Total</Label>
                      <Input 
                        className="rounded-xl" 
                        placeholder="R$ 0,00" 
                        value={compraForm.valor}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompraForm({ ...compraForm, valor: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Forma de Pagamento</Label>
                      <Select value={compraForm.pagamento} onValueChange={(v: string) => setCompraForm({ ...compraForm, pagamento: v })}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="avista">À Vista</SelectItem>
                          <SelectItem value="2x">2x</SelectItem>
                          <SelectItem value="3x">3x</SelectItem>
                          <SelectItem value="6x">6x</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Parcela Atual</Label>
                      <Input 
                        className="rounded-xl" 
                        placeholder="Ex: 1/3" 
                        value={compraForm.parcela}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompraForm({ ...compraForm, parcela: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Obra Vinculada</Label>
                      <Input 
                        className="rounded-xl" 
                        value={compraForm.obra}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompraForm({ ...compraForm, obra: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={editingCompraId ? handleUpdateCompra : handleAddCompra}
                      className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl"
                    >
                      {editingCompraId ? 'Salvar alterações' : 'Adicionar Compra'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {compras.map((compra) => (
                <Card key={compra.id} className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3>{compra.fornecedor}</h3>
                        <Badge className={compra.pago ? 'bg-[#9DBF7B]' : 'bg-[#B64B3A]'}>
                          {compra.pago ? 'Pago' : 'Pendente'}
                        </Badge>
                      </div>
                      <p className="text-sm text-[#626262]">
                        {compra.materiais} • {compra.quantidade}
                      </p>
                      <p className="text-sm text-[#626262]">
                        Obra: {compra.obra} • Parcela: {compra.parcela}
                      </p>
                      <p className="text-[#2C2C2C]">{compra.valor}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => togglePagamento(compra.id)}
                        size="icon"
                        className={`rounded-xl transition-all ${compra.pago ? 'bg-[#9DBF7B] hover:bg-[#8aae6a]' : 'bg-[#B64B3A] hover:bg-[#a43d2d]'}`}
                      >
                        {compra.pago ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditCompra(compra)}
                        className="hover:bg-[#9DBF7B]/10 hover:text-[#4F6139] hover:rotate-6 transition-all"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteCompra(compra.id)}
                        className="hover:bg-[#B64B3A]/10 hover:text-[#B64B3A] transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

