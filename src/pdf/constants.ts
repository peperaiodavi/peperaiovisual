// Centraliza constantes e conversões para o sistema de PDF A4 em milímetros

export const A4_MM = { largura: 210, altura: 297 } as const;
// Margens padrão conforme orientação atual
export const MARGENS_MM = { sup: 20, esq: 25, dir: 25, inf: 20 } as const;

// DPI virtual usado no preview em tela (mantém escala previsível)
export const DPI = 144;

export const mmToPx = (mm: number) => (DPI / 25.4) * mm;
export const pxToMm = (px: number) => (px * 25.4) / DPI;

export const LARGURA_CONTEUDO = A4_MM.largura - MARGENS_MM.esq - MARGENS_MM.dir;

export const pageStyleA4: React.CSSProperties = {
  width: mmToPx(A4_MM.largura),
  height: mmToPx(A4_MM.altura),
  background: '#fff',
};
