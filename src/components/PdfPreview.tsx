import React, { useMemo } from 'react';
import { A4_MM, BlocoPosicionado, MARGENS_MM, MM_TO_PX, PdfCampos } from '../types/pdf';
import EditableBlock from './EditableBlock';

export interface PdfPreviewProps {
  campos: PdfCampos;
  blocos: BlocoPosicionado[];
  /** HTML por bloco (para persistir formatação). */
  blocoHtml: Record<string, string>;
  onChangeHtml: (id: string, html: string) => void;
  onChangePos: (id: string, xMm: number, yMm: number) => void;
  onSelect?: (id: string) => void;
  selectedId?: string;
  dpi?: number; // DPI virtual para preview (default 144)
  /** Ref do container raiz (usado para exportação). */
  rootRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Preview de páginas A4 com posicionamento em mm convertido para px.
 * Renderiza os blocos editáveis e elementos estáticos.
 */
const PdfPreview: React.FC<PdfPreviewProps> = ({
  campos,
  blocos,
  blocoHtml,
  onChangeHtml,
  onChangePos,
  onSelect,
  selectedId,
  dpi = 144,
  rootRef,
}) => {
  const mmToPx = useMemo(() => (mm: number) => MM_TO_PX(dpi) * mm, [dpi]);
  const pagePx = useMemo(() => ({
    w: mmToPx(A4_MM.largura),
    h: mmToPx(A4_MM.altura),
    útil: {
      left: MARGENS_MM.esq,
      top: MARGENS_MM.sup,
      right: A4_MM.largura - MARGENS_MM.dir,
      bottom: A4_MM.altura - MARGENS_MM.inf,
    },
  }), [mmToPx]);

  const boundsMm = pagePx.útil;

  // Auxiliares para textos estáticos que não são editáveis
  const headerDireitaTexto = `Proposta: ${campos.numeroProposta} ${campos.versao} – Técnica e Comercial / Emissão: ${campos.dataEmissao}`;
  const titulo = '********** PROPOSTA TÉCNICA E COMERCIAL ***********';
  const introParagrafo = `Apresentamos a seguir nossa proposta técnica e comercial para atendimento às necessidades descritas. Este documento detalha as especificações, prazos e condições da prestação de serviços, visando garantir a melhor relação custo-benefício e qualidade.`;

  // Páginas
  return (
    <div ref={rootRef} className="pdf-root space-y-8">
      {/* Página 1 */}
      <div className="pdf-page bg-white relative shadow-sm" style={{ width: pagePx.w, height: pagePx.h }}>
        {/* Margens visuais (opcional) */}
        <div
          className="absolute inset-0"
          style={{
            border: '0px solid transparent',
            width: pagePx.w,
            height: pagePx.h,
          }}
        />

        {/* Cabeçalho direita (Y=20mm, X≈120–190mm) 10pt bold */}
        <div
          className="absolute font-[Helvetica,Arial,sans-serif]"
          style={{
            left: mmToPx(120),
            top: mmToPx(20),
            width: mmToPx(70),
            fontSize: '10pt',
            fontWeight: 700,
            textAlign: 'right',
          }}
        >
          {headerDireitaTexto}
        </div>

        {/* DE / PARA à esquerda: X=25mm (Y=40–50mm) */}
        <div className="absolute" style={{ left: mmToPx(25), top: mmToPx(38), width: mmToPx(90) }}>
          <div style={{ fontSize: '11pt', fontWeight: 700 }}>DE / PARA</div>
        </div>

        {blocos
          .filter((b) => ['cliente', 'responsavel', 'titulo', 'intro', 'assMarcosNome', 'assMarcosCargo', 'assMarcosTelefone', 'assMarcosEmail'].includes(b.id))
          .map((b) => (
            <EditableBlock
              key={b.id}
              block={b}
              html={blocoHtml[b.id] ?? ''}
              editable={!['titulo', 'intro', 'sumario'].includes(b.id)}
              mmToPx={mmToPx}
              boundsMm={boundsMm}
              selected={selectedId === b.id}
              onSelect={onSelect}
              onChangeHtml={onChangeHtml}
              onChangePos={onChangePos}
            />
          ))}

        {/* Sumário central Y=180mm 11pt bold - linhas itemizadas estáticas para guia visual */}
        <div className="absolute text-center" style={{ left: mmToPx(20), top: mmToPx(180), width: mmToPx(170), fontSize: '11pt', fontWeight: 700 }}>
          SUMÁRIO
          <div style={{ marginTop: mmToPx(2), fontWeight: 400, fontSize: '10pt', lineHeight: 1.6 }}>
            <div>1. Escopo dos Serviços</div>
            <div>2. Materiais e Cores</div>
            <div>3. Prazos de Execução</div>
            <div>4. Preços e Condições</div>
            <div>5. Garantia</div>
            <div>6. Validade</div>
          </div>
        </div>
      </div>

      {/* Página 2: Seções 1–3 */}
  <div className="pdf-page bg-white relative shadow-sm" style={{ width: pagePx.w, height: pagePx.h }}>
        {/* Seção 1 */}
        <div className="absolute" style={{ left: mmToPx(25), top: mmToPx(25), width: mmToPx(160) }}>
          <div style={{ fontSize: '12pt', fontWeight: 700, marginBottom: mmToPx(2) }}>1. Escopo dos Serviços</div>
          <div style={{ fontSize: '11pt', textAlign: 'justify', lineHeight: 1.5 }}>
            Descrição geral do escopo conforme necessidades do cliente. Dimensões principais:
          </div>
        </div>

        {blocos
          .filter((b) => ['dimLargura', 'dimAltura', 'dimComprimento', 'materiaisCores', 'prazoExecucao'].includes(b.id))
          .map((b) => (
            <EditableBlock
              key={b.id}
              block={b}
              html={blocoHtml[b.id] ?? ''}
              editable={true}
              mmToPx={mmToPx}
              boundsMm={boundsMm}
              selected={selectedId === b.id}
              onSelect={onSelect}
              onChangeHtml={onChangeHtml}
              onChangePos={onChangePos}
            />
          ))}

        {/* Seção 2 */}
        <div className="absolute" style={{ left: mmToPx(25), top: mmToPx(95), width: mmToPx(160) }}>
          <div style={{ fontSize: '12pt', fontWeight: 700, marginBottom: mmToPx(2) }}>2. Materiais e Cores</div>
          <div style={{ fontSize: '11pt', textAlign: 'justify', lineHeight: 1.5 }}>
            Especificações de materiais e acabamentos.
          </div>
        </div>

        {/* Seção 3 */}
        <div className="absolute" style={{ left: mmToPx(25), top: mmToPx(140), width: mmToPx(160) }}>
          <div style={{ fontSize: '12pt', fontWeight: 700, marginBottom: mmToPx(2) }}>3. Prazos de Execução</div>
          <div style={{ fontSize: '11pt', textAlign: 'justify', lineHeight: 1.5 }}>
            Prazo estimado para execução completa do projeto.
          </div>
        </div>
      </div>

      {/* Página 3: Seção 4 (Preços) + 5 e 6 */}
  <div className="pdf-page bg-white relative shadow-sm" style={{ width: pagePx.w, height: pagePx.h }}>
        {/* Seção 4: Tabela de Preços */}
        <div className="absolute" style={{ left: mmToPx(25), top: mmToPx(25), width: mmToPx(160) }}>
          <div style={{ fontSize: '12pt', fontWeight: 700, marginBottom: mmToPx(2) }}>4. Preços e Condições</div>
        </div>

        {/* Cabeçalho da tabela */}
        <div className="absolute" style={{ left: mmToPx(25), top: mmToPx(35), width: mmToPx(160), fontSize: '10pt', fontWeight: 700 }}>
          <div className="relative" style={{ height: mmToPx(7) }}>
            <div className="absolute" style={{ left: mmToPx(0), width: mmToPx(75) }}>Descrição</div>
            <div className="absolute text-center" style={{ left: mmToPx(80), width: mmToPx(15) }}>Qtde</div>
            <div className="absolute text-right" style={{ left: mmToPx(100), width: mmToPx(20) }}>Vl. Unit.</div>
            <div className="absolute text-right" style={{ left: mmToPx(125), width: mmToPx(30) }}>Vl. Total</div>
          </div>
        </div>

        {/* Linha total destacada */}
        {blocos
          .filter((b) => ['valorTotal', 'condicoesPagamento', 'validade'].includes(b.id))
          .map((b) => (
            <EditableBlock
              key={b.id}
              block={b}
              html={blocoHtml[b.id] ?? ''}
              editable={true}
              mmToPx={mmToPx}
              boundsMm={boundsMm}
              selected={selectedId === b.id}
              onSelect={onSelect}
              onChangeHtml={onChangeHtml}
              onChangePos={onChangePos}
            />
          ))}

        {/* Seção 5: Garantia */}
        <div className="absolute" style={{ left: mmToPx(25), top: mmToPx(190), width: mmToPx(160) }}>
          <div style={{ fontSize: '12pt', fontWeight: 700, marginBottom: mmToPx(2) }}>5. Garantia</div>
          <div style={{ fontSize: '11pt', textAlign: 'justify', lineHeight: 1.5 }}>
            Garantias padrão de qualidade e conformidade técnica.
          </div>
        </div>

        {/* Assinatura Isaac */}
        {blocos
          .filter((b) => ['assIsaacNome', 'assIsaacTelefone', 'assIsaacSetor'].includes(b.id))
          .map((b) => (
            <EditableBlock
              key={b.id}
              block={b}
              html={blocoHtml[b.id] ?? ''}
              editable={true}
              mmToPx={mmToPx}
              boundsMm={boundsMm}
              selected={selectedId === b.id}
              onSelect={onSelect}
              onChangeHtml={onChangeHtml}
              onChangePos={onChangePos}
            />
          ))}
      </div>
    </div>
  );
};

export default PdfPreview;
