import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { A4_MM, MARGENS_MM } from './constants';

// Conversões
const mmToPt = (mm: number) => (72 / 25.4) * mm;

// Geometria da página
const PAGE_W_PT = mmToPt(A4_MM.largura);
const PAGE_H_PT = mmToPt(A4_MM.altura);
const M = {
  l: mmToPt(MARGENS_MM.esq),
  r: mmToPt(MARGENS_MM.dir),
  t: mmToPt(MARGENS_MM.sup),
  b: mmToPt(MARGENS_MM.inf),
};
const CONTENT_W = PAGE_W_PT - M.l - M.r;

// Tipografia
const SIZE = {
  body: 12,
  h: 16,
  sub: 14,
  cap: 12,
};

export type ItemPreco = { descricao: string; qtde: number; vlUnit: number };
export type CorItem = { parte: string; cores: string };

export type PropostaVectorData = {
  para: string;
  numeroProposta: string;
  dataEmissao: string;
  sufixoProposta: string;
  descricao: string;
  largura: number | '';
  altura: number | '';
  comprimento: number | '';
  composicaoMateriais: string;
  coresDefinidas: CorItem[];
  itens: ItemPreco[];
  valorPorExtenso: string;
  contato: { nome: string; cargo: string; tel: string; email: string };
  exclusoes: string[];
  notasTecnicas: string[];
  condicoesGerais: string[];
  garantia: string[]; // linhas do termo
};

async function tryLoadLogo(doc: PDFDocument): Promise<{ bytes: Uint8Array; type: 'png'|'jpg' } | null> {
  const candidates = ['/logo-peperaio.png', '/logo-peperaio.jpg', '/logo-peperaio.jpeg'];
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      const type = url.endsWith('.png') ? 'png' : 'jpg';
      return { bytes: buf, type };
    } catch {}
  }
  return null;
}

// Util: quebra de texto por largura
function wrapText(text: string, maxWidth: number, font: any, size: number): string[] {
  const words = text.replace(/\r/g, '').split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    const width = font.widthOfTextAtSize(trial, size);
    if (width <= maxWidth) {
      cur = trial;
    } else {
      if (cur) lines.push(cur);
      // palavra isolada pode ser muito longa; quebrar por caracteres
      if (font.widthOfTextAtSize(w, size) > maxWidth) {
        let buf = '';
        for (const ch of w) {
          const t = buf + ch;
          if (font.widthOfTextAtSize(t, size) <= maxWidth) buf = t; else { lines.push(buf); buf = ch; }
        }
        cur = buf;
      } else {
        cur = w;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function centerX(font: any, text: string, size: number) {
  const tw = font.widthOfTextAtSize(text, size);
  return M.l + (CONTENT_W - tw) / 2;
}

function extractCodigo(numeroProposta: string): string {
  // tenta capturar bloco numérico após o ano, ex.: "2025 570–R04" => 570
  const m = numeroProposta.match(/\b(\d{3,})/);
  return m ? m[1] : '';
}

// Gerenciador de página com cabeçalho simples (texto puro, sem logo)
async function addPage(doc: PDFDocument, fonts: Fonts) {
  const page = doc.addPage([PAGE_W_PT, PAGE_H_PT]);
  // Cabeçalho técnico centralizado (3 linhas)
  return { page, y: PAGE_H_PT - mmToPt(30) }; // y inicial temporário; o cabeçalho é desenhado sob demanda na capa
}

type Fonts = { body: any; bold: any; italic: any };

export async function exportPropostaVector(data: PropostaVectorData, fileName: string) {
  const doc = await PDFDocument.create();
  const body = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const fonts: Fonts = { body, bold, italic };

  const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // 1) Página 1 com coordenadas absolutas fornecidas
  let { page, y } = await addPage(doc, fonts);
  // Logo no topo (opcional, se existir em /public)
  let yAfterLogo = PAGE_H_PT - mmToPt(20);
  try {
    const logo = await tryLoadLogo(doc);
    if (logo) {
      const img = logo.type === 'png' ? await doc.embedPng(logo.bytes) : await doc.embedJpg(logo.bytes);
      const maxH = mmToPt(28); // altura máxima ~28mm (como no exemplo)
      const maxW = CONTENT_W;  // ocupar a largura útil
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = M.l + (CONTENT_W - w) / 2;
      const yTop = PAGE_H_PT - mmToPt(20);
      page.drawImage(img, { x, y: yTop - h, width: w, height: h });
      yAfterLogo = yTop - h - mmToPt(6); // respiro abaixo da logo

      // Bloco de contatos à direita (duas linhas)
      const contatoNome1 = 'Isaac Peperaio';
      const contatoTel1 = '62 98427-4856';
      const contatoNome2 = 'Marcos Peperaio';
      const contatoTel2 = '61 98196-6308';
      const yContTop = yTop - 6; // levemente abaixo da parte superior da imagem
      const nameSize = 12; const telSize = 12;
      const rowGap = 16;
      const row1 = `${contatoNome1}    ${contatoNome2}`;
      const row2 = `${contatoTel1}    ${contatoTel2}`;
      const rightX = PAGE_W_PT - M.r; // alinhar à direita
      page.drawText(row1, { x: rightX - body.widthOfTextAtSize(row1, nameSize), y: yContTop - nameSize, size: nameSize, font: body });
      page.drawText(row2, { x: rightX - body.widthOfTextAtSize(row2, telSize), y: yContTop - nameSize - rowGap, size: telSize, font: body });
    }
  } catch {}

  // Linha "Proposta ..." (esquerda) e "Emissão ..." (direita) centradas como um bloco
  const leftText = `Proposta: ${data.numeroProposta} – Técnica e Comercial`;
  const rightText = `Emissão: ${data.dataEmissao}`;
  const gap = 28; // espaço entre blocos
  const lw = bold.widthOfTextAtSize(leftText, 12);
  const rw = bold.widthOfTextAtSize(rightText, 12);
  const total = lw + gap + rw;
  const startX = M.l + (CONTENT_W - total) / 2;
  const yHeaderBase = yAfterLogo - 2; // ligeiro ajuste vertical
  page.drawText(leftText, { x: startX, y: yHeaderBase - 12, size: 12, font: bold });
  page.drawText(rightText, { x: startX + lw + gap, y: yHeaderBase - 12, size: 12, font: bold });

  // Bloco DE/PARA (Y ≈ 40 mm)
  const yDePara = yHeaderBase - mmToPt(12); // ~12mm abaixo da linha de proposta/emissão
  page.drawText('DE: PEPERAIO COMUNICAÇÃO VISUAL', { x: M.l, y: yDePara, size: 11, font: bold });
  page.drawText(`PARA: ${data.para || ''}`.toUpperCase(), { x: M.l, y: yDePara - 14, size: 11, font: bold });

  // Título central (Y ≈ 65 mm)
  const title = '********** PROPOSTA TÉCNICA E COMERCIAL ***********';
  const yTitle = PAGE_H_PT - mmToPt(65);
  page.drawText(title, { x: centerX(bold, title, SIZE.cap), y: yTitle, size: SIZE.cap, font: bold });

  // Corpo introdutório (Y ≈ 85 mm)
  y = PAGE_H_PT - mmToPt(85);
  const carta = [
    `Prezado(a) ${data.para || '__________'}, atendendo a sua consulta, temos a satisfação de`,
    'apresentar-lhe nossa Proposta Técnica / Comercial para o fornecimento de',
    'fachada em referência, os quais serão construídos de acordo com as',
    'características técnicas mencionadas na proposta técnica.',
    '',
    'Esperamos desta forma ter correspondido às suas expectativas e',
    'colocamo-nos ao seu inteiro dispor para quaisquer esclarecimentos',
    'complementares.',
    '',
    'Atenciosamente,'
  ].join('\n');
  const cartaLines = carta.split('\n').flatMap(line => wrapText(line, CONTENT_W, fonts.body, SIZE.body));
  for (const line of cartaLines) { page.drawText(line, { x: M.l, y: y - SIZE.body, size: SIZE.body, font: body }); y -= SIZE.body * 1.35; }
  // Assinatura (Y ≈ 230 mm)
  const yAss = PAGE_H_PT - mmToPt(230);
  const center = (text: string, size = 11, font = body) => ({ x: centerX(font, text, size), size, font });
  page.drawText('Atenciosamente;', { ...center('Atenciosamente;', 11, body), y: yAss });
  page.drawText(data.contato.nome, { ...center(data.contato.nome, 11, bold), y: yAss - 14 });
  page.drawText(data.contato.cargo, { ...center(data.contato.cargo, 11, body), y: yAss - 28 });
  page.drawText(data.contato.tel, { ...center(data.contato.tel, 11, body), y: yAss - 42 });
  const email = data.contato.email.replace(/^E-mail:\s*/i, '').trim();
  const emailW = body.widthOfTextAtSize(email, 11);
  const emailX = M.l + (CONTENT_W - emailW) / 2;
  const emailY = yAss - 56;
  page.drawText(email, { x: emailX, y: emailY, size: 11, font: body, color: rgb(0, 0, 1) });
  // Link mailto
  const linkAnn = doc.context.obj({
    Type: 'Annot', Subtype: 'Link', Rect: [emailX, emailY, emailX + emailW, emailY + 12], Border: [0,0,0],
    A: doc.context.obj({ S: 'URI', URI: doc.context.obj(`mailto:${email}`) })
  });
  const annots = page.node.Annots();
  if (annots) annots.push(linkAnn); else page.node.setAnnots(doc.context.obj([linkAnn]));

  // 2) Sumário (página 2, alinhado à esquerda, 11 pt, negrito nos títulos)
  ({ page, y } = await addPage(doc, fonts));
  y = PAGE_H_PT - mmToPt(30);
  page.drawText('Conteúdo!', { x: M.l, y, size: 12, font: bold });
  y -= 16;
  const items = [
    '1 - ESCOPO DE FORNECIMENTO',
    '2 – EXCLUSÕES / LISTA DE DESVIOS',
    '3 – NOTAS TÉCNICAS',
    '4 – PREÇOS',
    '5 – CONDIÇÕES GERAIS DE VENDAS',
    '6 – TERMO DE GARANTIA DE PRODUTOS ENGENHEIRADOS'
  ];
  for (const it of items) { page.drawText(it, { x: M.l, y, size: 11, font: bold }); y -= 14; }

  // Helper para novo parágrafo com título
  const drawSectionTitle = (t: string) => { page.drawText(t, { x: M.l, y: y - SIZE.h, size: SIZE.h, font: bold }); y -= SIZE.h + 8; };
  const writeParagraph = async (txt: string) => {
    const lines = wrapText(txt, CONTENT_W, body, SIZE.body);
    for (const l of lines) {
      if (y - SIZE.body < mmToPt(MARGENS_MM.inf + 26)) { ({ page, y } = await addPage(doc, fonts)); }
      page.drawText(l, { x: M.l, y: y - SIZE.body, size: SIZE.body, font: body });
      y -= SIZE.body * 1.35;
    }
  };
  const writeList = async (arr: string[]) => { for (const li of arr) { await writeParagraph(li); } };

  // 3) Escopo (+ especificações + cores) e tentar encaixar 2 e 3
  ({ page, y } = await addPage(doc, fonts));
  drawSectionTitle('1 - ESCOPO DE FORNECIMENTO');
  if (data.descricao) await writeParagraph(data.descricao);
  const specLines: string[] = [];
  if (data.largura !== '' || data.altura !== '' || data.comprimento !== '') {
    const fmt = (v: number | '') => v === '' ? '' : `${Number(v).toFixed(2).replace('.', ',')} m`;
    if (data.largura !== '') specLines.push(`Largura: ${fmt(data.largura)}`);
    if (data.altura !== '') specLines.push(`Altura: ${fmt(data.altura)}`);
    if (data.comprimento !== '') specLines.push(`Comprimento: ${fmt(data.comprimento)}`);
  }
  if (specLines.length || data.composicaoMateriais) {
    page.drawText('Descrição do Serviço:', { x: M.l, y: y - SIZE.sub, size: 11, font: bold }); y -= 11 + 6;
    for (const s of specLines) await writeParagraph(s);
    if (data.composicaoMateriais) {
      page.drawText('Composição e Materiais:', { x: M.l, y: y - 11, size: 11, font: bold }); y -= 11 + 6;
      await writeParagraph(data.composicaoMateriais);
    }
  }
  if (data.coresDefinidas?.length) {
    page.drawText('Cores Definidas', { x: M.l, y: y - 11, size: 11, font: bold }); y -= 11 + 6;
    for (const c of data.coresDefinidas) await writeParagraph(`${c.parte || 'Parte/Local'}: ${c.cores || ''}`);
  }
  // Seções 2 e 3
  drawSectionTitle('2 – EXCLUSÕES / LISTA DE DESVIOS');
  await writeList(data.exclusoes);
  drawSectionTitle('3 – NOTAS TÉCNICAS');
  await writeList(data.notasTecnicas);

  // 4) Preços (tabela simplificada)
  ({ page, y } = await addPage(doc, fonts));
  drawSectionTitle('4 – PREÇOS');
  // cabeçalho da tabela
  const col = [CONTENT_W * 0.5, CONTENT_W * 0.1, CONTENT_W * 0.2, CONTENT_W * 0.2];
  const x0 = M.l; const rowH = 18;
  const drawRow = async (values: string[], boldRow = false) => {
    if (y - rowH < mmToPt(MARGENS_MM.inf + 26)) { ({ page, y } = await addPage(doc, fonts)); drawSectionTitle('4. PREÇOS'); }
    let xx = x0; const f = boldRow ? bold : body;
    const labels = values;
    page.drawRectangle({ x: x0, y: y - rowH + 3, width: CONTENT_W, height: rowH, borderColor: rgb(0,0,0), borderWidth: 1 });
    for (let i = 0; i < labels.length; i++) {
      const text = labels[i];
      const tx = i === 0 ? xx + 4 : (i === 1 ? xx + col[i]/2 - f.widthOfTextAtSize(text, SIZE.body)/2 : xx + col[i] - f.widthOfTextAtSize(text, SIZE.body) - 4);
      page.drawText(text, { x: tx, y: y - SIZE.body - 2, size: SIZE.body, font: f });
      // col divider
      if (i < labels.length - 1) page.drawLine({ start: { x: xx + col[i], y: y - rowH + 3 }, end: { x: xx + col[i], y }, color: rgb(0,0,0), thickness: 1 });
      xx += col[i];
    }
    y -= rowH + 2;
  };
  await drawRow(['DESCRIÇÃO','QTDE','VL. UNIT.','VL. TOTAL'], true);
  let totalQtde = 0; let totalGeral = 0;
  for (const it of data.itens) {
    const qt = Number(it.qtde) || 0; const vu = Number(it.vlUnit) || 0; const vt = qt * vu; totalQtde += qt; totalGeral += vt;
    await drawRow([it.descricao || '', String(qt), fmtBRL(vu), fmtBRL(vt)]);
  }
  await drawRow(['VALOR TOTAL:', String(totalQtde), '', fmtBRL(totalGeral)], true);
  // observações
  if (data.valorPorExtenso) await writeParagraph(`Importa a presente proposta o valor final total de ${fmtBRL(totalGeral)}\n${data.valorPorExtenso}`);

  // 5) Condições Gerais (+ Garantia nas próximas páginas conforme necessário)
  ({ page, y } = await addPage(doc, fonts));
  drawSectionTitle('5 – CONDIÇÕES GERAIS DE VENDAS');
  await writeList(data.condicoesGerais);
  drawSectionTitle('6 – TERMO DE GARANTIA DE PRODUTOS ENGENHEIRADOS');
  await writeList(data.garantia);

  // assinatura final no rodapé da última página
  const last = doc.getPage(doc.getPageCount() - 1);
  last.drawText('Isaac Peperaio', { x: M.l + (CONTENT_W - bold.widthOfTextAtSize('Isaac Peperaio', 12))/2, y: mmToPt(MARGENS_MM.inf)+24, size: 12, font: bold });
  last.drawText('(61) 981966308', { x: M.l + (CONTENT_W - body.widthOfTextAtSize('(61) 981966308', 12))/2, y: mmToPt(MARGENS_MM.inf)+10, size: 12, font: body });
  last.drawText('Depto. Engenharia e Montagem', { x: M.l + (CONTENT_W - body.widthOfTextAtSize('Depto. Engenharia e Montagem', 12))/2, y: mmToPt(MARGENS_MM.inf), size: 12, font: body });

  const bytes = await doc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  // salvar no browser sem depender de libs externas
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}
