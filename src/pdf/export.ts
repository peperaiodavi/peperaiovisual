import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { A4_MM } from './constants';

export type ExportOptions = {
  fileName?: string;
  /** Força a escala do html2canvas. Por padrão calculamos com base no devicePixelRatio (clamp 2..3) */
  scale?: number;
  /** Callback opcional de progresso (0..1) */
  onProgress?: (p: number) => void;
};

/**
 * Exporta um container contendo páginas ".pdf-page" para um PDF A4 (mm),
 * com captura 1:1 da preview.
 */
export async function exportToPdf(rootEl: HTMLElement, fileName: string, opts?: ExportOptions): Promise<void> {
  const pages = Array.from(rootEl.querySelectorAll<HTMLElement>('.pdf-page'));
  if (pages.length === 0) return;

  const doc = new jsPDF({ unit: 'mm', format: [A4_MM.largura, A4_MM.altura] });

  // Escala automática com clamp para boa nitidez sem estourar o tamanho do arquivo
  const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  const AUTO_SCALE = Math.max(2, Math.min(3, dpr * 1.5));
  const EXPORT_SCALE = opts?.scale ?? AUTO_SCALE;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const width = Math.ceil(page.offsetWidth);
    const height = Math.ceil(page.offsetHeight);

    // Remover sombras temporariamente para não "vazar" no PDF
    const originalBoxShadow = page.style.boxShadow || '';
    page.style.boxShadow = 'none';

    const canvas = await html2canvas(page, {
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
      scale: EXPORT_SCALE,
    });

    page.style.boxShadow = originalBoxShadow;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) doc.addPage();
    doc.addImage(imgData, 'JPEG', 0, 0, A4_MM.largura, A4_MM.altura);

    opts?.onProgress?.((i + 1) / pages.length);
  }

  doc.save(fileName);
}
