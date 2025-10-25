export function currencyBR(v: number): string {
  const n = Number(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function numberBR(v: number, fractionDigits = 2): string {
  const n = Number(v) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
}
