import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  salario: number;
  vales: number;
  ativo: boolean;
}

interface Vale {
  id: string;
  funcionarioId: string;
  data: string;
  valor: number;
  motivo: string;
}

export function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [vales, setVales] = useState<Vale[]>([]);

  const [dialogFuncionario, setDialogFuncionario] = useState(false);
  const [dialogVale, setDialogVale] = useState(false);
  const [dialogEditFuncionario, setDialogEditFuncionario] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null);
  const [editingFuncionarioId, setEditingFuncionarioId] = useState<string | null>(null);

  const [funcionarioForm, setFuncionarioForm] = useState({ nome: '', cargo: '', salario: '' });
  const [valeForm, setValeForm] = useState({ data: '', valor: '', motivo: '' });
  const [funcionarioEditForm, setFuncionarioEditForm] = useState({ cargo: '', salario: '', vales: '' });

  useEffect(() => {
    const storedF = localStorage.getItem('peperaio_funcionarios');
    const storedV = localStorage.getItem('peperaio_vales');
    if (storedF) setFuncionarios(JSON.parse(storedF));
    else {
      const initial: Funcionario[] = [
        { id: '1', nome: 'Joao Silva', cargo: 'Instalador', salario: 3500, vales: 500, ativo: true },
        { id: '2', nome: 'Maria Santos', cargo: 'Designer', salario: 4200, vales: 0, ativo: true },
        { id: '3', nome: 'Pedro Costa', cargo: 'Montador', salario: 3200, vales: 300, ativo: true },
      ];
      setFuncionarios(initial);
      localStorage.setItem('peperaio_funcionarios', JSON.stringify(initial));
    }
    if (storedV) setVales(JSON.parse(storedV));
    else {
      const initialV: Vale[] = [
        { id: '1', funcionarioId: '1', data: '2025-10-10', valor: 200, motivo: 'Despesas' },
        { id: '2', funcionarioId: '1', data: '2025-10-15', valor: 300, motivo: 'Material' },
      ];
      setVales(initialV);
      localStorage.setItem('peperaio_vales', JSON.stringify(initialV));
    }
  }, []);

  useEffect(() => {
    if (funcionarios.length >= 0) localStorage.setItem('peperaio_funcionarios', JSON.stringify(funcionarios));
  }, [funcionarios]);

  useEffect(() => {
    if (vales.length >= 0) localStorage.setItem('peperaio_vales', JSON.stringify(vales));
  }, [vales]);

  // Reset mensal do contador de vales por funcionario
  useEffect(() => {
    const monthKey = 'peperaio_vales_month';
    const nowMonth = new Date().toISOString().slice(0, 7);
    const storedMonth = localStorage.getItem(monthKey);
    if (storedMonth !== nowMonth) {
      setFuncionarios(prev => {
        const updated = prev.map(f => ({ ...f, vales: 0 }));
        localStorage.setItem('peperaio_funcionarios', JSON.stringify(updated));
        return updated;
      });
      localStorage.setItem(monthKey, nowMonth);
    }
  }, []);

  const handleAddFuncionario = () => {
    if (!funcionarioForm.nome || !funcionarioForm.cargo || !funcionarioForm.salario) return;
    const newFunc: Funcionario = {
      id: Date.now().toString(),
      nome: funcionarioForm.nome,
      cargo: funcionarioForm.cargo,
      salario: parseFloat(funcionarioForm.salario),
      vales: 0,
      ativo: true,
    };
    setFuncionarios([...funcionarios, newFunc]);
    // Lcto de salario em financas + map
    try {
      const LANC_KEY = 'peperaio_lancamentos';
      const MAP_KEY = 'peperaio_func_to_lancamento';
      const lancRaw = localStorage.getItem(LANC_KEY);
      const lancamentos = lancRaw ? JSON.parse(lancRaw) : [];
      const lancamento = {
        id: `${Date.now().toString()}_sal`,
        data: new Date().toLocaleDateString('pt-BR'),
        tipo: 'saida',
        categoria: `Salario (${newFunc.nome})`,
        valor: newFunc.salario,
        obra: '-',
        status: 'Confirmado',
      } as any;
      lancamentos.push(lancamento);
      localStorage.setItem(LANC_KEY, JSON.stringify(lancamentos));
      const mapRaw = localStorage.getItem(MAP_KEY);
      const map = mapRaw ? JSON.parse(mapRaw) : {};
      map[newFunc.id] = lancamento.id;
      localStorage.setItem(MAP_KEY, JSON.stringify(map));
    } catch {}
    setFuncionarioForm({ nome: '', cargo: '', salario: '' });
    setDialogFuncionario(false);
    toast.success('Funcionario adicionado!');
  };

  const handleAddVale = () => {
    if (!selectedFuncionario || !valeForm.valor) return;
    const valor = parseFloat(valeForm.valor);
    const newVale: Vale = {
      id: Date.now().toString(),
      funcionarioId: selectedFuncionario.id,
      data: valeForm.data || new Date().toLocaleDateString('pt-BR'),
      valor,
      motivo: valeForm.motivo,
    };
    setVales([...vales, newVale]);
    setFuncionarios(funcionarios.map(f => f.id === selectedFuncionario.id ? { ...f, vales: f.vales + valor } : f));
    // Lcto de vale em financas + map
    try {
      const LANC_KEY = 'peperaio_lancamentos';
      const MAP_KEY = 'peperaio_vale_to_lancamento';
      const lancRaw = localStorage.getItem(LANC_KEY);
      const lancamentos = lancRaw ? JSON.parse(lancRaw) : [];
      const lancamento = {
        id: `${Date.now().toString()}_vale`,
        data: new Date().toLocaleDateString('pt-BR'),
        tipo: 'saida',
        categoria: `Vale (${selectedFuncionario.nome})`,
        valor,
        obra: '-',
        status: 'Confirmado',
      } as any;
      lancamentos.push(lancamento);
      localStorage.setItem(LANC_KEY, JSON.stringify(lancamentos));
      const mapRaw = localStorage.getItem(MAP_KEY);
      const map = mapRaw ? JSON.parse(mapRaw) : {};
      map[newVale.id] = lancamento.id;
      localStorage.setItem(MAP_KEY, JSON.stringify(map));
    } catch {}
    setValeForm({ data: '', valor: '', motivo: '' });
    setDialogVale(false);
    toast.success('Vale registrado!');
  };

  const handleClearHistoricoVales = () => {
    try {
      const LANC_KEY = 'peperaio_lancamentos';
      const MAP_KEY = 'peperaio_vale_to_lancamento';
      const mapRaw = localStorage.getItem(MAP_KEY);
      const map = mapRaw ? JSON.parse(mapRaw) : {};
      const lancRaw = localStorage.getItem(LANC_KEY);
      let lancamentos = lancRaw ? JSON.parse(lancRaw) : [];
      const idsLanc = vales.map(v => map[v.id]).filter(Boolean);
      if (idsLanc.length > 0) {
        lancamentos = lancamentos.filter((l: any) => !idsLanc.includes(l.id));
        localStorage.setItem(LANC_KEY, JSON.stringify(lancamentos));
      }
      localStorage.setItem(MAP_KEY, JSON.stringify({}));
    } catch {}
    setVales([]);
    localStorage.setItem('peperaio_vales', JSON.stringify([]));
    toast.success('Historico de vales limpo!');
  };

  const handleDeleteFuncionario = (id: string) => {
    setFuncionarios(funcionarios.filter(f => f.id !== id));
    if (selectedFuncionario?.id === id) setSelectedFuncionario(null);
    // remover lcto de salario
    try {
      const LANC_KEY = 'peperaio_lancamentos';
      const MAP_KEY = 'peperaio_func_to_lancamento';
      const mapRaw = localStorage.getItem(MAP_KEY);
      const map = mapRaw ? JSON.parse(mapRaw) : {};
      const lancId = map[id];
      if (lancId) {
        const lancRaw = localStorage.getItem(LANC_KEY);
        const lancamentos = lancRaw ? JSON.parse(lancRaw) : [];
        const filtered = lancamentos.filter((l: any) => l.id !== lancId);
        localStorage.setItem(LANC_KEY, JSON.stringify(filtered));
        delete map[id];
        localStorage.setItem(MAP_KEY, JSON.stringify(map));
      }
    } catch {}
    // remover lctos dos vales do funcionario e o proprio historico
    try {
      const LANC_KEY = 'peperaio_lancamentos';
      const MAP_KEY = 'peperaio_vale_to_lancamento';
      const mapRaw = localStorage.getItem(MAP_KEY);
      const map = mapRaw ? JSON.parse(mapRaw) : {};
      const lancRaw = localStorage.getItem(LANC_KEY);
      let lancamentos = lancRaw ? JSON.parse(lancRaw) : [];
      const doFuncionario = vales.filter(v => v.funcionarioId === id);
      const idsLanc = doFuncionario.map(v => map[v.id]).filter(Boolean);
      if (idsLanc.length > 0) {
        lancamentos = lancamentos.filter((l: any) => !idsLanc.includes(l.id));
        localStorage.setItem(LANC_KEY, JSON.stringify(lancamentos));
        doFuncionario.forEach(v => { delete map[v.id]; });
        localStorage.setItem(MAP_KEY, JSON.stringify(map));
      }
      const restantes = vales.filter(v => v.funcionarioId !== id);
      setVales(restantes);
      localStorage.setItem('peperaio_vales', JSON.stringify(restantes));
    } catch {}
    toast.success('Funcionario removido!');
  };

  const startEditFuncionario = (f: Funcionario) => {
    setEditingFuncionarioId(f.id);
    setFuncionarioEditForm({ cargo: f.cargo, salario: String(f.salario), vales: String(f.vales) });
    setDialogEditFuncionario(true);
  };

  const handleUpdateFuncionario = () => {
    if (!editingFuncionarioId) return;
    const prev = funcionarios.find(f => f.id === editingFuncionarioId);
    setFuncionarios(funcionarios.map(f => f.id === editingFuncionarioId ? {
      ...f,
      cargo: funcionarioEditForm.cargo,
      salario: parseFloat(funcionarioEditForm.salario) || 0,
      vales: parseFloat(funcionarioEditForm.vales) || 0,
    } : f));
    // atualizar lcto de salario
    try {
      const LANC_KEY = 'peperaio_lancamentos';
      const MAP_KEY = 'peperaio_func_to_lancamento';
      const mapRaw = localStorage.getItem(MAP_KEY);
      const map = mapRaw ? JSON.parse(mapRaw) : {};
      const lancId = map[editingFuncionarioId];
      const lancRaw = localStorage.getItem(LANC_KEY);
      const lancamentos = lancRaw ? JSON.parse(lancRaw) : [];
      if (lancId) {
        const updated = lancamentos.map((l: any) => l.id === lancId ? { ...l, categoria: `Salario (${prev?.nome ?? 'Funcionario'})`, valor: parseFloat(funcionarioEditForm.salario) || 0 } : l);
        localStorage.setItem(LANC_KEY, JSON.stringify(updated));
      } else if (prev) {
        const novo = { id: `${Date.now().toString()}_sal`, data: new Date().toLocaleDateString('pt-BR'), tipo: 'saida', categoria: `Salario (${prev.nome})`, valor: parseFloat(funcionarioEditForm.salario) || 0, obra: '-', status: 'Confirmado' } as any;
        const arr = [...lancamentos, novo];
        localStorage.setItem(LANC_KEY, JSON.stringify(arr));
        map[editingFuncionarioId] = novo.id;
        localStorage.setItem(MAP_KEY, JSON.stringify(map));
      }
    } catch {}
    setDialogEditFuncionario(false);
    setEditingFuncionarioId(null);
    setFuncionarioEditForm({ cargo: '', salario: '', vales: '' });
    toast.success('Funcionario atualizado!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl mb-1">Funcionarios</h1>
          <p className="text-[#626262]">Gerencie seus funcionarios e vales</p>
        </div>
        <Dialog open={dialogFuncionario} onOpenChange={setDialogFuncionario}>
          <DialogTrigger asChild>
            <Button className="bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Novo Funcionario
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[20px]">
            <DialogHeader>
              <DialogTitle>Novo Funcionario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input className="rounded-xl" value={funcionarioForm.nome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFuncionarioForm({ ...funcionarioForm, nome: e.target.value })} />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input className="rounded-xl" value={funcionarioForm.cargo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFuncionarioForm({ ...funcionarioForm, cargo: e.target.value })} />
              </div>
              <div>
                <Label>Salario</Label>
                <Input type="number" className="rounded-xl" placeholder="R$ 0,00" value={funcionarioForm.salario} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFuncionarioForm({ ...funcionarioForm, salario: e.target.value })} />
              </div>
              <Button onClick={handleAddFuncionario} className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl">Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {funcionarios.map((funcionario, index) => (
          <motion.div key={funcionario.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card className="text-card-foreground flex flex-col gap-6 border p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="mb-1">{funcionario.nome}</h3>
                  <p className="text-sm text-[#626262]">{funcionario.cargo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={funcionario.ativo ? 'bg-[#9DBF7B]' : 'bg-[#B64B3A]'}>
                    {funcionario.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => startEditFuncionario(funcionario)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:hover:bg-accent/50 size-9 rounded-md hover:bg-[#9DBF7B]/10 hover:text-[#4F6139] hover:rotate-6 transition-all">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteFuncionario(funcionario.id)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:hover:bg-accent/50 size-9 rounded-md hover:bg-[#B64B3A]/10 hover:text-[#B64B3A] transition-all">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-t border-[rgba(79,97,57,0.1)]">
                  <span className="text-sm text-[#626262]">Salario</span>
                  <span className="text-[#2C2C2C]">R$ {funcionario.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-[rgba(79,97,57,0.1)]">
                  <span className="text-sm text-[#626262]">Vales (mes)</span>
                  <span className="text-[#B64B3A]">R$ {funcionario.vales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-[rgba(79,97,57,0.1)]">
                  <span className="text-sm text-[#626262]">Liquido</span>
                  <span className="text-[#4F6139]">R$ {(funcionario.salario - funcionario.vales).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <Button onClick={() => { setSelectedFuncionario(funcionario); setDialogVale(true); }} className="w-full mt-4 bg-[#D8C39E] hover:bg-[#c9b38d] text-[#2C2C2C] rounded-xl transition-all hover:scale-105">
                <DollarSign className="h-4 w-4 mr-2" /> Registrar Vale
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>

  {/* Dialog Editar Funcionario */}
  <Dialog open={dialogEditFuncionario} onOpenChange={(open: boolean) => { setDialogEditFuncionario(open); if (!open) { setEditingFuncionarioId(null); setFuncionarioEditForm({ cargo: '', salario: '', vales: '' }); } }}>
        <DialogContent className="rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Editar Funcionario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Funcao</Label>
              <Input className="rounded-xl" value={funcionarioEditForm.cargo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFuncionarioEditForm({ ...funcionarioEditForm, cargo: e.target.value })} />
            </div>
            <div>
              <Label>Salario</Label>
              <Input type="number" className="rounded-xl" placeholder="R$ 0,00" value={funcionarioEditForm.salario} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFuncionarioEditForm({ ...funcionarioEditForm, salario: e.target.value })} />
            </div>
            <div>
              <Label>Vales</Label>
              <Input type="number" className="rounded-xl" placeholder="R$ 0,00" value={funcionarioEditForm.vales} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFuncionarioEditForm({ ...funcionarioEditForm, vales: e.target.value })} />
            </div>
            <Button onClick={handleUpdateFuncionario} className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl">Salvar alteracoes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Vale */}
      <Dialog open={dialogVale} onOpenChange={setDialogVale}>
        <DialogContent className="rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Registrar Vale</DialogTitle>
          </DialogHeader>
          {selectedFuncionario && (
            <div className="space-y-4">
              <div>
                <Label>Funcionario</Label>
                <Input value={selectedFuncionario.nome} disabled className="rounded-xl bg-[#F8F7F4]" />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" className="rounded-xl" value={valeForm.data} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValeForm({ ...valeForm, data: e.target.value })} />
              </div>
              <div>
                <Label>Valor</Label>
                <Input type="number" className="rounded-xl" placeholder="R$ 0,00" value={valeForm.valor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValeForm({ ...valeForm, valor: e.target.value })} />
              </div>
              <div>
                <Label>Motivo</Label>
                <Input className="rounded-xl" placeholder="Descreva o motivo" value={valeForm.motivo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValeForm({ ...valeForm, motivo: e.target.value })} />
              </div>
              <Button onClick={handleAddVale} className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl">Registrar Vale</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Historico de Vales */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="m-0">Historico de Vales</h2>
            <Button variant="ghost" onClick={handleClearHistoricoVales} className="rounded-xl border-[rgba(182,75,58,0.2)] hover:bg-[#B64B3A]/10 hover:text-[#B64B3A] transition-all">
              <Trash2 className="h-4 w-4 mr-2" /> Limpar historico
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionario</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const lancRaw = localStorage.getItem('peperaio_lancamentos');
                  const lancamentos = lancRaw ? JSON.parse(lancRaw) : [];
                  const mapRaw = localStorage.getItem('peperaio_vale_to_lancamento');
                  const vmap = mapRaw ? JSON.parse(mapRaw) : {};
                  const filtered = vales.filter((vale) => {
                    const funcionarioExiste = !!funcionarios.find(f => f.id === vale.funcionarioId);
                    const lancId = vmap[vale.id];
                    const lancExiste = !!(lancId && lancamentos.find((l: any) => l.id === lancId));
                    return funcionarioExiste && lancExiste;
                  });
                  return filtered.map((vale) => {
                    const funcionario = funcionarios.find(f => f.id === vale.funcionarioId);
                    return (
                      <TableRow key={vale.id}>
                        <TableCell>{funcionario?.nome}</TableCell>
                        <TableCell>{vale.data}</TableCell>
                        <TableCell className="text-[#B64B3A]">R$ {vale.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{vale.motivo}</TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

