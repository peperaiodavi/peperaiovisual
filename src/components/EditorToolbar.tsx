import React from 'react';
import type { AlignOption } from '../utils/domSelection';

/**
 * Toolbar minimalista para edição de conteúdo selecionado e alinhamento de blocos.
 */
export interface EditorToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onAlign: (align: AlignOption) => void;
  onColor: (hex: string) => void;
  onFontSize: (pt: number) => void;
  onReset: () => void;
  onExportPdf: () => void;
  /** Indica se há um bloco selecionado para aplicar alinhamento/tamanho. */
  hasSelection?: boolean;
}

const btnBase =
  'px-2 py-1 border rounded text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onBold,
  onItalic,
  onUnderline,
  onAlign,
  onColor,
  onFontSize,
  onReset,
  onExportPdf,
  hasSelection,
}) => {
  return (
    <div
      role="toolbar"
      aria-label="Ferramentas de edição"
      className="flex flex-wrap items-center gap-2 p-2 border rounded bg-white shadow-sm"
    >
      <button type="button" className={btnBase} onClick={onBold} aria-label="Negrito">
        B
      </button>
      <button type="button" className={btnBase} onClick={onItalic} aria-label="Itálico">
        I
      </button>
      <button type="button" className={btnBase} onClick={onUnderline} aria-label="Sublinhar">
        U
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <button type="button" className={btnBase} onClick={() => onAlign('left')} aria-label="Alinhar à esquerda" disabled={!hasSelection}>
        ⬅
      </button>
      <button type="button" className={btnBase} onClick={() => onAlign('center')} aria-label="Centralizar" disabled={!hasSelection}>
        ⬍
      </button>
      <button type="button" className={btnBase} onClick={() => onAlign('right')} aria-label="Alinhar à direita" disabled={!hasSelection}>
        ➡
      </button>
      <button type="button" className={btnBase} onClick={() => onAlign('justify')} aria-label="Justificado" disabled={!hasSelection}>
        ≋
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <label className="flex items-center gap-1 text-sm">
        Cor
        <input
          type="color"
          onChange={(e) => onColor(e.target.value)}
          className="w-8 h-6 p-0 border rounded cursor-pointer"
          aria-label="Selecionar cor da fonte"
        />
      </label>

      <label className="flex items-center gap-1 text-sm">
        Tamanho
        <select
          className="border rounded px-2 py-1 text-sm"
          onChange={(e) => onFontSize(parseInt(e.target.value, 10))}
          aria-label="Selecionar tamanho da fonte"
          defaultValue={11}
        >
          {[10, 11, 12, 14, 16, 18].map((pt) => (
            <option key={pt} value={pt}>{pt} pt</option>
          ))}
        </select>
      </label>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <button type="button" className={btnBase} onClick={onReset} aria-label="Remover formatação">
        Reset
      </button>

      <div className="ml-auto" />

      <button type="button" className={btnBase + ' bg-emerald-600 text-white hover:bg-emerald-700'} onClick={onExportPdf}>
        Exportar PDF
      </button>
    </div>
  );
};

export default EditorToolbar;
