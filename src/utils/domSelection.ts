/**
 * Utilitários para aplicar estilos na seleção atual do documento dentro de
 * elementos contentEditable. Usa execCommand como fallback para ampla
 * compatibilidade e, quando necessário, envolve a seleção com spans estilizadas.
 */

/** Aplica um comando simples via execCommand, se disponível. */
function exec(cmd: string, value?: string) {
  try {
    // execCommand ainda é amplamente suportado em contentEditable
    document.execCommand(cmd, false, value);
  } catch {
    // ignora
  }
}

/**
 * Envolve a seleção atual com uma tag span e aplica estilos inline.
 */
function wrapSelectionWithSpan(style: Partial<CSSStyleDeclaration>) {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  const span = document.createElement('span');
  Object.assign(span.style, style);
  try {
    range.surroundContents(span);
  } catch {
    // Fallback: document.execCommand
    // Tentar aplicar estilos diretos quando surround falha (range cruza nós)
    Object.entries(style).forEach(([k, v]) => {
      if (k === 'fontWeight' && v) exec('bold');
      if (k === 'fontStyle' && v) exec('italic');
      if (k === 'textDecoration' && v) exec('underline');
      if (k === 'color' && v) exec('foreColor', v as string);
      if (k === 'fontSize' && v) exec('fontSize', v as string);
    });
  }
}

/** Deixa a seleção em negrito. */
export function applyBold() { exec('bold'); }

/** Deixa a seleção em itálico. */
export function applyItalic() { exec('italic'); }

/** Sublinhar seleção. */
export function applyUnderline() { exec('underline'); }

/** Altera a cor da fonte da seleção. */
export function applyColor(hex: string) {
  if (!hex) return;
  // execCommand com foreColor aceita valores hex
  exec('foreColor', hex);
  // Garante via span quando possível
  wrapSelectionWithSpan({ color: hex } as Partial<CSSStyleDeclaration>);
}

/**
 * Altera o tamanho de fonte da seleção em pontos (pt). 1pt ~= 1.333px, mas
 * aqui preservamos em pt para o html2canvas rasterizar semelhante ao CSS.
 */
export function applyFontSize(pt: number) {
  if (!pt) return;
  wrapSelectionWithSpan({ fontSize: `${pt}pt` } as Partial<CSSStyleDeclaration>);
}

/** Remove formatação inline da seleção. */
export function resetFormatting() {
  exec('removeFormat');
}

/**
 * Alinhamento é melhor aplicado ao bloco (container), então aqui não fazemos
 * nada na seleção; o alinhamento é controlado por propriedade do bloco
 * selecionado via estado de React.
 */
export type AlignOption = 'left' | 'center' | 'right' | 'justify';
