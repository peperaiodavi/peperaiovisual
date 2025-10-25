export type EquipeObra = {
  id: string;
  nome: string; // cidade
  obra: string; // nome da obra
  status?: 'ativo' | 'concluido';
};

const KEY = 'peperaio_equipes';

export function readEquipesObras(): EquipeObra[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Array<any>;
    return (arr || []).map((o) => ({ id: String(o.id), nome: String(o.nome ?? ''), obra: String(o.obra ?? ''), status: (o.status as any) ?? 'ativo' }));
  } catch {
    return [];
  }
}

export function equipesObrasOptions() {
  const list = readEquipesObras();
  return list
    .filter((o) => !!o.id)
    .sort((a, b) => a.obra.localeCompare(b.obra))
    .map((o) => ({ id: o.id, label: o.obra }));
}
