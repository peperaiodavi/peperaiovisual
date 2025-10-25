import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BlocoPosicionado } from '../types/pdf';

/**
 * Props para um bloco editável posicionado por milímetros, com suporte a drag
 * restrito pela área útil e emissão de alterações de HTML e posição.
 */
export interface EditableBlockProps {
  block: BlocoPosicionado;
  html: string;
  editable?: boolean;
  mmToPx: (mm: number) => number;
  /** Limites da área útil em mm */
  boundsMm: { left: number; top: number; right: number; bottom: number };
  selected?: boolean;
  onSelect?: (id: string) => void;
  onChangeHtml: (id: string, html: string) => void;
  onChangePos: (id: string, xMm: number, yMm: number) => void;
}

const handleStyle = 'absolute -top-2 -left-2 w-4 h-4 rounded bg-blue-500 text-white text-[10px] grid place-items-center cursor-move opacity-80';

const EditableBlock: React.FC<EditableBlockProps> = ({
  block,
  html,
  editable = true,
  mmToPx,
  boundsMm,
  selected,
  onSelect,
  onChangeHtml,
  onChangePos,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; leftPx: number; topPx: number } | null>(null);

  const style = useMemo(() => {
    const left = mmToPx(block.xMm);
    const top = mmToPx(block.yMm);
    const width = mmToPx(block.widthMm);
    const height = block.heightMm ? mmToPx(block.heightMm) : undefined;
    return {
      left,
      top,
      width,
      height,
      textAlign: block.align ?? 'left',
    } as React.CSSProperties;
  }, [block, mmToPx]);

  // Drag handlers
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging || !ref.current || !start.current) return;
      e.preventDefault();
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      const newLeftPx = start.current.leftPx + dx;
      const newTopPx = start.current.topPx + dy;

      // Converte para mm e aplica clamp nos limites
      const xMm = newLeftPx / mmToPx(1);
      const yMm = newTopPx / mmToPx(1);
      const minX = boundsMm.left;
      const minY = boundsMm.top;
      const maxX = boundsMm.right - block.widthMm;
      const maxY = boundsMm.bottom - (block.heightMm ?? 0);
      const clampedX = Math.max(minX, Math.min(xMm, maxX));
      const clampedY = Math.max(minY, Math.min(yMm, maxY));

      // aplica visualmente
      const el = ref.current;
      el.style.left = `${mmToPx(clampedX)}px`;
      el.style.top = `${mmToPx(clampedY)}px`;
    }

    function onUp() {
      if (!dragging || !ref.current || !start.current) return;
      setDragging(false);

      // Emite posição final convertida
      const leftPx = parseFloat(ref.current.style.left.replace('px', ''));
      const topPx = parseFloat(ref.current.style.top.replace('px', ''));
      const xMm = leftPx / mmToPx(1);
      const yMm = topPx / mmToPx(1);
      onChangePos(block.id, xMm, yMm);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, block.id, block.widthMm, block.heightMm, boundsMm, mmToPx, onChangePos]);

  const beginDrag = (e: React.MouseEvent) => {
    if (!ref.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = ref.current.getBoundingClientRect();
    start.current = { x: e.clientX, y: e.clientY, leftPx: rect.left + window.scrollX, topPx: rect.top + window.scrollY };
    setDragging(true);
  };

  return (
    <div
      ref={ref}
      className={
        'absolute p-1 outline-none ' +
        (selected ? 'ring-2 ring-blue-500 rounded' : '')
      }
      style={style}
      onMouseDown={(e) => {
        if (onSelect) onSelect(block.id);
      }}
      aria-label={`Bloco ${block.id}`}
    >
      {/* Handle para drag acessível */}
      <button
        type="button"
        className={handleStyle}
        onMouseDown={beginDrag}
        aria-label={`Arrastar bloco ${block.id}`}
        title="Arrastar"
      >
        ⣿
      </button>

      <div
        contentEditable={editable}
        suppressContentEditableWarning
        style={{ minHeight: block.heightMm ? mmToPx(block.heightMm) : undefined }}
        className="pdf-editable prose-sm"
        onInput={(e) => onChangeHtml(block.id, (e.target as HTMLElement).innerHTML)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

export default EditableBlock;
