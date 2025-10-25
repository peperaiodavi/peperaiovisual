export const pad2 = (n: number) => String(n).padStart(2, '0');

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayPtBR(): string {
  const d = new Date();
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Extrai YYYY-MM de 'DD/MM/YYYY' ou 'YYYY-MM-DD'
export function monthKeyFromDate(s: string): string {
  if (!s) return '';
  if (s.includes('-')) {
    const [y, m] = s.split('-');
    if (y.length === 4) return `${y}-${m}`;
  }
  const parts = s.split('/');
  if (parts.length >= 3) {
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${pad2(Number(mm) || 0)}`;
  }
  return '';
}

export function isoToPtBr(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${pad2(Number(d) || 0)}/${pad2(Number(m) || 0)}/${y}`;
}

export function ptBrToIso(pt: string): string {
  if (!pt) return '';
  const [d, m, y] = pt.split('/');
  return `${y}-${pad2(Number(m) || 0)}-${pad2(Number(d) || 0)}`;
}

export function safeToIso(s: string): string {
  if (!s) return '';
  return s.includes('-') ? s : ptBrToIso(s);
}
