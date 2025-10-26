import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Plus, Pencil, Trash2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback } from './ui/avatar'
import { useFinanceiro, ensureFinanceObraId } from '../financeiro/useFinanceiro'
import { Require } from './Require'
import { isoToPtBr, safeToIso } from '../utils/date'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import useEquipesObras, { type ObraEquipe as ObraEquipeHookType } from '../hooks/useEquipesObras'
import useFuncionarios from '../hooks/useFuncionarios'

interface Despesa { id: string; nome: string; valor: number; data: string }
type ObraEquipe = ObraEquipeHookType


export function Equipes() {
  // Fonte única: hook com Supabase (sem localStorage)
  const { equipesObras: obras, setEquipesObras: setObras } = useEquipesObras()
  const [dialogObra, setDialogObra] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [obraForm, setObraForm] = useState({ nome: '', obra: '', custos: '' })
  const { funcionarios } = useFuncionarios()
  const [selectedMembros, setSelectedMembros] = useState<string[]>([])
  const [editedDespesas, setEditedDespesas] = useState<Despesa[]>([])
  const [expandedObras, setExpandedObras] = useState<Record<string, boolean>>({})

  // Despesas
  const [dialogDespesaObraId, setDialogDespesaObraId] = useState<string | null>(null)
  const [despesaForm, setDespesaForm] = useState({ nome: '', valor: '', data: '' })
  const [editingDespesa, setEditingDespesa] = useState<{ obraId: string; despesaId: string } | null>(null)

  // Helpers

  // Removido: carregamento/persistência localStorage — agora por Supabase via hook

  // Funcionários agora vêm do Supabase via hook

  // Removido: persistência/dispatch local — hook já publica via realtime

  const openNovaObra = () => {
    setEditingId(null)
    setObraForm({ nome: '', obra: '', custos: '' })
    setSelectedMembros([])
    setEditedDespesas([])
    setDialogObra(true)
  }

  const startEditObra = (o: ObraEquipe) => {
    setEditingId(o.id)
    setObraForm({ nome: o.nome, obra: o.obra, custos: String(o.custos) })
    setSelectedMembros(o.membros || [])
    setEditedDespesas([...(o.despesas || [])])
    setDialogObra(true)
  }

  const updateEditedDespesa = (index: number, patch: Partial<Despesa>) => {
    setEditedDespesas((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } as Despesa : d)))
  }
  const removeEditedDespesa = (index: number) => {
    setEditedDespesas((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSalvarObra = async () => {
    const cidade = obraForm.nome.trim()
    const nomeObra = obraForm.obra.trim()
    const custosNum = Number(obraForm.custos)
  if (!cidade || !nomeObra || !obraForm.custos) return toast.error('Preencha Cidade, Nome da Obra e Orçamento.')
  if (isNaN(custosNum) || custosNum <= 0) return toast.error('Informe um orçamento válido (maior que zero).')

    if (editingId) {
      setObras((prev) => prev.map((e) => (
        e.id === editingId
          ? { ...e, nome: cidade, obra: nomeObra, membros: selectedMembros, custos: custosNum, despesas: editedDespesas }
          : e
      )))
      // Upsert + atualização de estado local (aparece na hora)
      try {
        const finId = `fin_${editingId}`
        await finAtualizarObra(finId, { id: finId, nome: nomeObra, status: 'ativo' } as any)
      } catch {}
      toast.success('Obra atualizada com sucesso!')
    } else {
      const nova: ObraEquipe = { id: Date.now().toString(), nome: cidade, obra: nomeObra, membros: selectedMembros, custos: custosNum, status: 'ativo', despesas: [] }
      setObras((prev) => [...prev, nova])
      // Upsert + atualização de estado local (aparece na hora)
      try {
        const finId = `fin_${nova.id}`
        await finAtualizarObra(finId, { id: finId, nome: nomeObra, status: 'ativo' } as any)
      } catch {}
      toast.success('Obra cadastrada com sucesso!')
    }
    setDialogObra(false)
  }

  const removerObra = (id: string) => {
    setObras((prev) => prev.filter((e) => e.id !== id))
    toast.success('Obra removida com sucesso!')
  }

  const { db: finDB, addLancamento: finAddLanc, atualizarObra: finAtualizarObra } = useFinanceiro();

  // ensureFinanceObraId agora é importado do módulo financeiro (centralizado)

  const finalizarObra = async (id: string) => {
    const obra = obras.find((e) => e.id === id)
    if (!obra) return
    const dataPt = new Date().toLocaleDateString('pt-BR')
    const totalDespesas = (obra.despesas || []).reduce((s, d) => s + (Number(d.valor) || 0), 0)
    const receitaOrcada = Number(obra.custos || 0)
    const restante = Math.max(0, receitaOrcada - totalDespesas)

    if (restante > 0) {
      // 1) Entrada no CAIXA (soma no saldo)
      try {
        await finAddLanc({
          id: `${Date.now()}_caixa_final_${id}`,
          data: dataPt,
          tipo: 'entrada',
          valor: restante,
          descricao: `Fechamento de Obra - ${obra.obra}`,
          escopo: 'caixa',
          contabilizaCaixa: true,
        } as any)
      } catch {}
      // 2) Registro na aba Obras (não soma no saldo)
      try {
        const finObraId = await ensureFinanceObraId(obra.id, obra.obra)
        await finAddLanc({
          id: `${Date.now()}_obra_final_${id}`,
          data: dataPt,
          tipo: 'entrada',
          valor: restante,
          descricao: `Fechamento de Obra - ${obra.obra}`,
          obraId: finObraId,
          escopo: 'obra',
          contabilizaCaixa: false,
        } as any)
        try { await finAtualizarObra(finObraId, { status: 'finalizada', nome: obra.obra } as any) } catch {}
      } catch {}
    }

    toast.success('Obra finalizada: valor lançado no CAIXA e registrado na aba Obras.')
    setObras((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'concluido' } : e)))
  }

  // Despesas
  const openDespesaDialog = (obraId: string) => {
    setDialogDespesaObraId(obraId)
    setEditingDespesa(null)
    setDespesaForm({ nome: '', valor: '', data: '' })
  }

  const openEditarDespesa = (obraId: string, d: Despesa) => {
    setDialogDespesaObraId(obraId)
    setEditingDespesa({ obraId, despesaId: d.id })
    setDespesaForm({ nome: d.nome, valor: String(d.valor), data: safeToIso(d.data) })
  }

  // Salvar (adicionar ou editar) despesa no dialogo
  const handleSalvarDespesa = async () => {
    if (!dialogDespesaObraId) return
    const nome = despesaForm.nome.trim()
    const valorNum = Number(despesaForm.valor)
    const dataIso = despesaForm.data.trim()
    const data = dataIso ? isoToPtBr(dataIso) : new Date().toLocaleDateString('pt-BR')
    if (!nome) return toast.error('Informe o nome da despesa.')
    if (!valorNum || isNaN(valorNum) || valorNum <= 0) return toast.error('Informe um valor valido.')
    if (editingDespesa) {
      setObras((prev) => prev.map((e) => {
        if (e.id !== dialogDespesaObraId) return e
        const updated = (e.despesas || []).map((x) => (x.id === editingDespesa.despesaId ? { ...x, nome, valor: valorNum, data } : x))
        return { ...e, despesas: updated }
      }))
      toast.success('Despesa atualizada.')
    } else {
      setObras((prev) => prev.map((e) => (
        e.id === dialogDespesaObraId
          ? { ...e, despesas: [...(e.despesas || []), { id: Date.now().toString(), nome, valor: valorNum, data }] }
          : e
      )))
      toast.success('Despesa adicionada.')
      // Registrar também no financeiro como SAÍDA diária (escopo 'obra'), sem afetar caixas/cards
      try {
        const finObraId = dialogDespesaObraId ? `fin_${dialogDespesaObraId}` : undefined;
        const authUser = (() => { try { return JSON.parse(localStorage.getItem('peperaio_auth_user')||'null'); } catch { return null; } })();
        await finAddLanc({
          id: Date.now().toString(),
          data, // dd/mm/aaaa
          tipo: 'saida',
          valor: valorNum,
          descricao: nome,
          obraId: finObraId,
          escopo: 'obra',
          contabilizaCaixa: false,
          createdBy: authUser?.id,
          createdByName: authUser?.nome,
        } as any);
        // Abrir o Diário no dia do gasto
        localStorage.setItem('peperaio_financeiro_jump_to_diario', (dataIso && dataIso.length ? dataIso : new Date().toISOString().slice(0,10)));
      } catch (e) {
        console.error('Falha ao registrar no financeiro', e)
      }
    }
    setDialogDespesaObraId(null)
    setEditingDespesa(null)
    setDespesaForm({ nome: '', valor: '', data: '' })
  }

  // Excluir despesa individual
  const excluirDespesa = (obraId: string, despesaId: string) => {
    setObras((prev) => prev.map((e) => (
      e.id === obraId
        ? { ...e, despesas: (e.despesas || []).filter((d) => d.id !== despesaId) }
        : e
    )))
    toast.success('Despesa removida.')
  }

  // (removido) handleAddDespesa redundante

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Equipes</h2>
          <p className="text-[#626262]">Gerencie suas obras e equipes</p>
        </div>
        <Dialog open={dialogObra} onOpenChange={setDialogObra}>
          <DialogTrigger asChild>
            <Button onClick={openNovaObra} className="bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Nova Obra
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[20px]">
            <DialogHeader>
              <DialogTitle className="text-center">{editingId ? 'Editar Obra' : 'Nova Obra'}</DialogTitle>
              <DialogDescription className="text-center">Preencha os dados da obra. A seleção de membros é opcional.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input className="rounded-xl" value={obraForm.nome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setObraForm({ ...obraForm, nome: e.target.value })} />
              </div>
              {editingId && (
                <div>
                  <Label>Selecione os Membros (opcional)</Label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-auto rounded-xl border border-[rgba(79,97,57,0.2)] bg-[#FAFBF7] px-4 py-3">
                    {funcionarios.length === 0 && <span className="text-sm text-[#626262]">Nenhum funcionário cadastrado (opcional)</span>}
                    {funcionarios.map((f) => {
                      const checked = selectedMembros.includes(f.nome)
                      return (
                        <label key={f.id} className={`flex items-center gap-2 text-sm leading-none font-medium select-none rounded-full px-3 py-2 transition-colors duration-300 cursor-pointer ${checked ? 'bg-[#9DBF7B]/10 text-[#4F6139]' : 'hover:bg-[#9DBF7B]/5'}`}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded-full border border-[#4F6139]/30 bg-white appearance-none checked:bg-[#4F6139] checked:border-[#4F6139] transition-colors duration-200"
                            checked={checked}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              if (e.target.checked) setSelectedMembros((m) => [...m, f.nome])
                              else setSelectedMembros((m) => m.filter((n) => n !== f.nome))
                            }}
                          />
                          {f.nome}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Nome da Obra</Label>
                <Input className="rounded-xl" value={obraForm.obra} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setObraForm({ ...obraForm, obra: e.target.value })} />
              </div>
              {editingId && (
                <div className="space-y-2">
                  <Label>Despesas</Label>
                  <div className="grid gap-2 max-h-64 overflow-auto">
                    {(editedDespesas?.length ?? 0) === 0 && (
                      <span className="text-sm text-[#626262]">Nenhuma despesa cadastrada</span>
                    )}
                    {editedDespesas.map((d, idx) => (
                      <div key={d.id} className="grid grid-cols-12 gap-2 items-center">
                        <Input className="rounded-xl col-span-5" value={d.nome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEditedDespesa(idx, { nome: e.target.value })} />
                        <Input type="number" className="rounded-xl col-span-3" value={String(d.valor)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEditedDespesa(idx, { valor: Number(e.target.value) || 0 })} />
                        <Input type="date" className="rounded-xl col-span-3" value={safeToIso(d.data)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEditedDespesa(idx, { data: isoToPtBr(e.target.value) })} />
                        <Button variant="outline" size="sm" className="col-span-1 rounded-xl" onClick={() => removeEditedDespesa(idx)}>Remover</Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Orçamento</Label>
                <Input type="number" className="rounded-xl" value={obraForm.custos} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setObraForm({ ...obraForm, custos: e.target.value })} />
              </div>
              <Button onClick={handleSalvarObra} className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl">{editingId ? 'Salvar alterações' : 'Cadastrar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {obras.filter((e)=> e.status === 'ativo').map((equipe, index) => {
          const total = (equipe.despesas || []).reduce((s, d) => s + (Number(d.valor) || 0), 0)
          const restante = (equipe.custos || 0) - total
          return (
            <motion.div key={equipe.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card onClick={() => setExpandedObras((s) => ({ ...s, [equipe.id]: !s[equipe.id] }))} className="text-card-foreground flex flex-col gap-6 border p-6 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all cursor-pointer relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  <Require roles="admin">
                    <Button variant="outline" size="icon" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); startEditObra(equipe) }} className="rounded-xl border-[rgba(79,97,57,0.2)] hover:bg-[#9DBF7B]/10 hover:border-[#4F6139] transition-all">
                      <Pencil className="h-4 w-4 text-[#4F6139]" />
                    </Button>
                  </Require>
                  <Require roles="admin">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); }} className="rounded-xl border-[rgba(182,75,58,0.2)] hover:bg-[#B64B3A]/10 hover:border-[#B64B3A] transition-all">
                          <Trash2 className="h-4 w-4 text-[#B64B3A]" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[16px]">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover obra?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita. Deseja continuar?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction className="bg-[#B64B3A] hover:bg-[#9a3f31]" onClick={() => removerObra(equipe.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </Require>
                </div>

                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3>{equipe.obra}</h3>
                      <Badge className={equipe.status === 'ativo' ? 'bg-[#9DBF7B]' : 'bg-[#626262]'}>
                        {equipe.status === 'ativo' ? 'Ativo' : 'Concluído'}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#626262]">Cidade: {equipe.nome}</p>
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-sm text-[#626262] mb-2">Membros ({equipe.membros.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {equipe.membros.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-[#F8F7F4] rounded-xl">
                        <Avatar className="w-6 h-6"><AvatarFallback className="text-xs bg-[#4F6139] text-white">{(m || '').split(' ').map((n) => (n ? n[0] : '')).join('')}</AvatarFallback></Avatar>
                        <span className="text-sm text-[#2C2C2C]">{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#626262]">Orçamento</span>
                    <span className="text-[#2C2C2C]">R$ {equipe.custos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#626262]">Orçamento Atualizado</span>
                    <span className={restante >= 0 ? 'text-[#4F6139]' : 'text-[#B64B3A]'}>R$ {restante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {expandedObras[equipe.id] && (equipe.despesas?.length ?? 0) > 0 && (
                    <div className="grid gap-2">
                      {equipe.despesas!.map((d) => (
                        <div key={d.id} className="flex items-center justify-between border p-3 bg-white rounded-[16px]">
                          <span className="text-sm text-[#2C2C2C]">{d.data} - {d.nome}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[#B64B3A]">- R$ {Number(d.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <Require roles="admin">
                              <Button variant="outline" size="icon" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); openEditarDespesa(equipe.id, d) }} className="size-9 rounded-xl border-[rgba(79,97,57,0.2)] hover:bg-[#9DBF7B]/10 hover:border-[#4F6139] transition-all">
                                <Pencil className="h-4 w-4 text-[#4F6139]" />
                              </Button>
                            </Require>
                            <Button variant="outline" size="icon" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); excluirDespesa(equipe.id, d.id) }} className="size-9 rounded-xl border-[rgba(182,75,58,0.2)] hover:bg-[#B64B3A]/10 hover:border-[#B64B3A] transition-all">
                              <Trash2 className="h-4 w-4 text-[#B64B3A]" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {equipe.status === 'ativo' && (
                    <>
                      <Require nivel={2}>
                        <Button
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); openDespesaDialog(equipe.id) }}
                          className="flex-1 bg-[#B64B3A] hover:bg-[#a04638] text-white rounded-xl transition-all hover:scale-105"
                        >
                          Cadastrar Despesa
                        </Button>
                      </Require>
                      <Require roles="admin">
                        <Button
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); finalizarObra(equipe.id) }}
                          className="flex-1 bg-[#9DBF7B] hover:bg-[#8aae6a] text-white rounded-xl transition-all hover:scale-105"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" /> Finalizar Obra
                        </Button>
                      </Require>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Dialog de Despesa */}
      <Dialog open={dialogDespesaObraId !== null} onOpenChange={(open: boolean) => { if (!open) setDialogDespesaObraId(null) }}>
        <DialogContent className="rounded-[20px]">
          <DialogHeader><DialogTitle>{editingDespesa ? 'Editar Despesa' : 'Cadastrar Despesa'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input className="rounded-xl" value={despesaForm.nome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDespesaForm({ ...despesaForm, nome: e.target.value })} /></div>
            <div><Label>Valor</Label><Input type="number" className="rounded-xl" value={despesaForm.valor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDespesaForm({ ...despesaForm, valor: e.target.value })} /></div>
            <div><Label>Data</Label><Input type="date" className="rounded-xl" value={despesaForm.data} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDespesaForm({ ...despesaForm, data: e.target.value })} /></div>
            <Button onClick={handleSalvarDespesa} className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] rounded-xl">{editingDespesa ? 'Salvar' : 'Cadastrar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
