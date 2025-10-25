import fs from 'node:fs';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function analyze(pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages = pdf.numPages;
  const result = [];

  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const widthPt = viewport.width; // points (1/72 in)
    const heightPt = viewport.height;
    const mm = (pt) => (pt * 25.4) / 72;
    const widthMm = mm(widthPt).toFixed(2);
    const heightMm = mm(heightPt).toFixed(2);

    const text = await page.getTextContent();
    const sizeMap = new Map();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const item of text.items) {
      const h = Number(item.height || (item.transform && Math.abs(item.transform[3])) || 0);
      if (!h) continue;
      const key = h.toFixed(2);
      sizeMap.set(key, (sizeMap.get(key) || 0) + (item.str?.length || 1));
      const t = item.transform;
      if (t && t.length >= 6) {
        const x = t[4];
        const y = t[5];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    const sizes = Array.from(sizeMap.entries())
      .map(([k, weight]) => ({ px: Number(k), pt: Number(k), // viewport scale 1 => 1px ~ 1pt
        mm: (Number(k) * 25.4) / 72,
        weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6);

    const hasText = Number.isFinite(minX);
    const margins = hasText ? {
      leftMm: mm(minX).toFixed(2),
      rightMm: (mm(widthPt - maxX)).toFixed(2),
      topMm: (mm(heightPt - maxY)).toFixed(2),
      bottomMm: mm(minY).toFixed(2),
    } : null;

    result.push({ page: i, widthMm, heightMm, topFontHeights: sizes, margins });
  }

  return { pages: pdf.numPages, result };
}

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: node tools/analyze-pdf.mjs <path-to-pdf>');
    process.exit(1);
  }
  const resolved = path.resolve(pdfPath);
  const stats = await analyze(resolved);
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
