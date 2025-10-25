import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardAction, CardContent, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

import { exportToPdf, PdfHeader as HeaderPagina, PdfPage, mmToPx, A4_MM, MARGENS_MM } from '../pdf';
import { toast } from 'sonner';
// import useReceber from '../hooks/useReceber';

// =================== TEXTO E CONTEÚDOS FIXOS ===================
const CABECALHO_DIREITA_PADRAO = (numeroProposta: string, dataEmissao: string) =>
  `Proposta: ${numeroProposta} Técnica e Comercial | Emissão: ${dataEmissao}`;

const TITULO_CENTRAL = '********** PROPOSTA TÉCNICA E COMERCIAL ***********';

const CARTA_APRESENTACAO = (destinatario: string) => [
  `Prezado(a) ${destinatario || '__________'}, atendendo a sua consulta, temos a satisfação de`,
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

const EXCLUSOES_FIXAS: string[] = [
  '2.1 Não estão inclusos os serviços e materiais de instalação elétrica (externo aos painéis presentes nesta oferta), assim como a montagem e instalação dos mesmos; nos ateremos apenas, as letras e painéis apresentados no projeto, qualquer acréscimo de iluminação, será cobrado à parte.',
  '2.2 Não estão inclusos no escopo de fornecimento quaisquer serviços que não estejam relacionados nesta proposta.',
  '2.3 Não estamos ofertando luminárias, ficando a cargo do cliente as escolhas das mesmas, se assim desejar, e caso queira nos contratar para tal, os valores não estão inclusos nesta proposta.',
  '2.4 Não serão fornecidos quaisquer materiais e serviços que não estejam claramente mencionados no Item 1 desta proposta – Escopo de Fornecimento e/ou que não foram negociados entre as partes, tais como: Luminárias, forros, instalações elétricas e outros.'
];

const NOTAS_TECNICAS_FIXAS: string[] = [
  '3.1 Para elaboração da presente proposta consideramos as documentações técnicas e lista de materiais encaminhada nesta proposta.',
  '3.2 O material relacionado, possui garantia de 5 anos;',
  '3.3 O projeto acima proposto, tem direitos autorais, sendo vedada a execução do mesmo por terceiros, sendo passível de multas previstas em lei.',
  '3.4 A garantia do serviço se dará na mesma quantidade da garantia do material.',
  '3.5 Quaisquer divergências entre o ofertado e suas reais necessidades, poderão ser ajustadas mediante novo contrato, para tal, reservamo-nos o direito de rever os preços e prazos de entrega.'
];

const CONDICOES_GERAIS_FIXAS = (dataEmissao: string) => [
  `5.1 DATA BASE DA PROPOSTA: ${dataEmissao}`,
  '5.2 CONDIÇÕES DE PAGAMENTO: 50% na entrada e o restante na entrega. Ou dividido no cartão com os acréscimos da maquininha no ato de contratação do serviço.',
  '5.3 IMPOSTOS: Empresa optante pelo simples nacional, não destaca impostos como ICMS e IPI, com todos os impostos inclusos para faturamento como Materiais avulsos por; Peperaio Comunicação Visual: CNPJ 34.004.933/0001-79. Rua 05 Qd. 61 Lt. 02 Setor Santos Dumont - Goiânia-GO.',
  '5.4 PRAZO DE ENTREGA: 10 dias úteis após a contratação.',
  '5.7 VALIDADE DESTA PROPOSTA: 10 dias da data de emissão. Caso o cliente emita o “aceite” após o prazo de validade, os preços apresentados estão sujeitos a reajuste. CANCELAMENTO – No caso de cancelamento pelo cliente, posterior à aprovação da proposta, a Peperaio Comunicação Visual emitirá fatura, com vencimento à vista, incluindo todas as despesas decorrentes, deduzidos os valores até então recebidos do cliente. Em qualquer hipótese de rescisão, as partes procederão a um acerto de contas, considerando o valor dos serviços executados e/ou comprometidos e despesas decorrentes da rescisão para a Peperaio Comunicação Visual, contra o valor dos pagamentos até então recebidos por esta do cliente.',
  '5.8 CONDIÇÕES GERAIS DE FORNECIMENTO: Fazem parte integrante da presente proposta as “Condições Gerais de Fornecimento de Bens e Serviços Peperaio”, que acompanham o presente.',
  '5.9 ATRASO NO PAGAMENTO: Ocorrendo atraso no pagamento, seja de parcela principal e/ou de reajuste, os valores em atraso serão acrescidos de multa moratória equivalente a 1,5% (um e meio por cento), bem como, juros equivalentes a 2% (dois por cento) ao mês, pelo prazo que perdurar o atraso.'
];

const GARANTIA_FIXA: string[] = [
  '6. TERMO DE GARANTIA PRODUTOS ENGENHEIRADOS',
  '1. É condição essencial para a validade desta garantia que a compradora examine minuciosamente o produto adquirido imediatamente após a sua entrega, observando atentamente as suas características e as instruções de instalação, ajuste, operação e manutenção do mesmo. O produto será considerado aceito e automaticamente aprovado pela compradora, quando não ocorrer a manifestação por escrito da compradora sobre problemas técnicos ou arrependimento quando cabível, no prazo máximo de sete dias úteis após a data de entrega.',
  '2. O prazo total de garantia dos produtos é de sessenta (60) meses, contados da data de fornecimento da Peperaio Comunicação Visual, comprovado através da nota fiscal de compra do Material engenhado.',
  '3. A garantia total acima é composta de: (a) tratando-se de relação de consumo, os primeiros 90 (noventa) dias serão considerados para fins de garantia a que se refere o inciso II do art. 26 da Lei 8.078/90, e o restante do período será considerado como garantia contratual, nos termos do art. 50 da referida Lei; e (b) nos demais casos, os primeiros 30 (trinta) dias serão considerados para fins de garantia a que se refere o caput do artigo 445 do Código Civil Brasileiro.',
  '4. Em caso de defeito ou situações inadequadas do produto em garantia, os serviços em garantia serão realizados a critério da Peperaio Comunicação Visual.',
  '5. O produto, na ocorrência de uma anomalia deverá estar disponível para o fornecedor, pelo período necessário para a identificação da causa da anomalia e seus devidos reparos.',
  '6. A Peperaio Comunicação Visual examinará o produto ou material com defeito, e, caso comprove a existência de defeito coberto pela garantia, reparará, modificará ou substituirá o material defeituoso, ao seu critério, sem custos para a compradora, exceto os mencionados.',
  '7. A responsabilidade da presente garantia se limita exclusivamente ao reparo do produto fornecido, não se responsabilizando a Peperaio Comunicação Visual por danos a pessoas, a terceiros, a outros equipamentos ou instalações, lucros cessantes ou quaisquer outros danos emergentes ou consequentes.',
  '8. Outras despesas como fretes, embalagens, custos de montagem e desmontagem, parametrização, correrão por conta exclusiva da compradora, inclusive todas as despesas de locomoção/estadia do pessoal de assistência técnica e eventuais horas extras, quando for necessário e/ou solicitado um atendimento nas instalações do usuário.',
  '9. A presente garantia não abrange o desgaste normal dos produtos ou materiais, nem os danos decorrentes de operação ou instalação indevida ou negligente em desacordo com as especificações técnicas, parametrização incorreta, manutenção ou armazenagem inadequada, instalações de má qualidade ou influências de natureza química, eletroquímica, elétrica, mecânica ou atmosférica.',
  '10. Ficam excluídas da responsabilidade por defeitos as partes ou peças consideradas de consumo, tais como, Luminárias, relés fototimer, protetores contra surtos, protetores de raios, etc.',
  '11. A garantia extinguir-se-á, independentemente de qualquer aviso, se a compradora sem prévia autorização por escrito da Peperaio Comunicação Visual, fizer ou mandar fazer por terceiros, quaisquer modificações ou reparos no produto ou equipamento que vier a apresentar anomalia, ou qualquer modificação a gosto ou critério do cliente.',
  '12. O direito à garantia ficará suspenso em caso de mora ou inadimplemento de obrigações da compradora para com a Peperaio Comunicação Visual, nos termos do disposto no artigo 476 do Código Civil Brasileiro, sendo que o lapso temporal da suspensão será considerado garantia decorrida, caso a compradora, posteriormente, cumpra suas obrigações para com a Peperaio Visual.',
  '13. Quaisquer reparos, modificações, substituições decorrentes de defeitos de fabricação não interrompem nem prorrogam o prazo desta garantia.',
  '14. A garantia oferecida pela Peperaio Comunicação Visual está condicionada à observância destas condições gerais, sendo este o único termo de garantia válido.'
];

function AutomacaoPDF2() {
  // Campos editáveis
  const [para, setPara] = useState('Elizeu');
  const [numeroProposta, setNumeroProposta] = useState('2025 570–R04');
  const [dataEmissao, setDataEmissao] = useState(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  });
  const [sufixoProposta, setSufixoProposta] = useState('AC');

  const [descricao, setDescricao] = useState('');
  // Medidas (m) e especificações
  const [largura, setLargura] = useState<number | ''>('');
  const [altura, setAltura] = useState<number | ''>('');
  const [comprimento, setComprimento] = useState<number | ''>('');
  const [composicaoMateriais, setComposicaoMateriais] = useState('');
  type CorItem = { parte: string; cores: string };
  const [coresDefinidas, setCoresDefinidas] = useState<CorItem[]>([]);
  const [valores, setValores] = useState('');

  const [contatoNome, setContatoNome] = useState('Marcos Peperaio');
  const [contatoCargo, setContatoCargo] = useState('Vendedor Técnico/Comercial');
  const [contatoTel, setContatoTel] = useState('(61) 98196-6308');
  const [contatoEmail, setContatoEmail] = useState('E-mail: contato@peperaiovisual.com.br');

  type ItemPreco = { descricao: string; qtde: number; vlUnit: number };
  const [itens, setItens] = useState<ItemPreco[]>([
    { descricao: 'Material e mão de obra', qtde: 1, vlUnit: 15300 },
  ]);

  const [valorPorExtenso, setValorPorExtenso] = useState('( Quinze mil e trezentos reais )');

  // Utils
  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const totalGeral = itens.reduce((acc, it) => acc + (Number(it.qtde) || 0) * (Number(it.vlUnit) || 0), 0);
  const totalQtde = itens.reduce((acc, it) => acc + (Number(it.qtde) || 0), 0);
  const anoEmissao = useMemo(() => (dataEmissao.split('/')?.[2] || new Date().getFullYear().toString()), [dataEmissao]);
  const tituloTabela = `PROPOSTA ${numeroProposta} ${anoEmissao} ${sufixoProposta}`;

  const addItem = () => setItens((arr) => [...arr, { descricao: '', qtde: 1, vlUnit: 0 }]);
  const removeItem = (idx: number) => setItens((arr) => arr.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<ItemPreco>) => setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  // Financeiro (valor a receber) — removido o card de vinculação a pedido

  // Layout e métricas (mm -> px)
  const DPI = 144; // mantém para cálculos que dependem desta constante local
  const pxToMm = (px: number) => (px * 25.4) / DPI;
  const MARGENS = MARGENS_MM;
  const LARGURA_CONTEUDO = A4_MM.largura - MARGENS.esq - MARGENS.dir;
  // Altura reservada quando a assinatura de rodapé aparece na mesma página
  const ASSINATURA_FOOTER_ALTURA_MM = 26; // reserva ~26mm para 3 linhas em 12pt + espaçamentos

  // Âncoras
  const Y_APOS_CABECALHO = 30; // para páginas de conteúdo quando usando preview (vetor usa coordenadas próprias)
  const Y_BLOCO_DEPARA = 35;
  const Y_TITULO_CENTRAL = 60;
  const Y_CARTA_APRESENTACAO_DEFAULT = 88;
  const Y_ASSINATURA_NOME = 150;
  const Y_ASSINATURA_CARGO = 156;
  const Y_ASSINATURA_TEL = 162;
  const Y_ASSINATURA_EMAIL = 168;
  const Y_SUMARIO = 215;

  // Carta centralizada
  const cartaRef = useRef<HTMLDivElement>(null);
  const [cartaTop, setCartaTop] = useState(Y_CARTA_APRESENTACAO_DEFAULT);
  const [assinTop, setAssinTop] = useState(Y_ASSINATURA_NOME);
  const [sumarioTop, setSumarioTop] = useState(Y_SUMARIO);
  const recomputeCartaTop = () => {
    const el = cartaRef.current;
    if (!el) return;
    const cartaAltPx = el.offsetHeight || 0;
    const cartaAltMm = pxToMm(cartaAltPx);
    // Centraliza de fato no meio da página, com limites para não encostar no sumário
    const PAGE_CENTER = 297 / 2; // mm
    const idealTop = PAGE_CENTER - cartaAltMm / 2;
    const minTop = Y_CARTA_APRESENTACAO_DEFAULT; // não subir demais
    // limite superior provisório; o sumário também será ajustado dinamicamente abaixo
    const maxTopTemp = Math.max(Y_SUMARIO - 10 - cartaAltMm, minTop);
    const clampedTop = Math.min(Math.max(idealTop, minTop), maxTopTemp);
    setCartaTop(clampedTop);

    // Evitar encavalamento: assinaturas e sumário se ajustam abaixo da carta
    const cartaBottom = clampedTop + cartaAltMm; // mm
    const assinaturaStart = Math.max(Y_ASSINATURA_NOME, cartaBottom + 8);
    setAssinTop(assinaturaStart);
    const emailBottom = assinaturaStart + (Y_ASSINATURA_EMAIL - Y_ASSINATURA_NOME); // preserva espaçamento entre linhas
    const sumTop = Math.max(Y_SUMARIO, emailBottom + 12);
    setSumarioTop(sumTop);
  };
  useEffect(() => {
    recomputeCartaTop();
    const onResize = () => recomputeCartaTop();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [para, descricao]);

  // Controle de fluxo automático: se Escopo + (Exclusões/Notas) estourarem a página 2,
  // empurra Exclusões/Notas para a próxima página.
  const page2FlowRef = useRef<HTMLDivElement>(null);
  const [moveSec2e3ToNext, setMoveSec2e3ToNext] = useState(false);
  useEffect(() => {
    // mede após render
    setMoveSec2e3ToNext(false);
    const id = requestAnimationFrame(() => {
      const el = page2FlowRef.current;
      if (!el) return;
      const availablePx = mmToPx(A4_MM.altura - Y_APOS_CABECALHO - MARGENS.inf);
      const contentPx = el.offsetHeight;
      if (contentPx > availablePx) setMoveSec2e3ToNext(true);
    });
    return () => cancelAnimationFrame(id);
  }, [descricao, largura, altura, comprimento, composicaoMateriais, coresDefinidas]);

  const Secoes2e3 = () => (
    <>
      <div style={{ fontSize: '16pt', fontWeight: 700, marginTop: mmToPx(6), marginBottom: mmToPx(2) }}>2. Exclusões</div>
      <ul style={{ fontSize: '12pt', lineHeight: 1.6, paddingLeft: '1em' }}>
        {EXCLUSOES_FIXAS.map((t, i) => (<li key={i} style={{ marginBottom: mmToPx(2) }}>{t}</li>))}
      </ul>
      <div style={{ fontSize: '16pt', fontWeight: 700, marginTop: mmToPx(6), marginBottom: mmToPx(2) }}>3. Notas Técnicas</div>
      <ul style={{ fontSize: '12pt', lineHeight: 1.6, paddingLeft: '1em' }}>
        {NOTAS_TECNICAS_FIXAS.map((t, i) => (<li key={i} style={{ marginBottom: mmToPx(2) }}>{t}</li>))}
      </ul>
    </>
  );

  // Fluxo dinâmico para Condições Gerais (5) e Termo de Garantia (6)
  const page5WrapRef = useRef<HTMLDivElement>(null);
  const [moveGarantiaNext, setMoveGarantiaNext] = useState(false);
  useEffect(() => {
    const measure = () => {
      const wrap = page5WrapRef.current;
      if (!wrap) return;
      // Reservamos espaço para a assinatura de rodapé, evitando sobreposição do conteúdo
      const availablePx = mmToPx(
        A4_MM.altura - Y_APOS_CABECALHO - MARGENS.inf - ASSINATURA_FOOTER_ALTURA_MM
      ) - 12; // margem de segurança
      const contentPx = wrap.offsetHeight;
      setMoveGarantiaNext(contentPx > availablePx);
    };
    const id = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', measure);
    };
  }, [dataEmissao]);

  const BlocoGarantia = () => (
    <>
      <div style={{ fontSize: '16pt', fontWeight: 700, marginTop: mmToPx(6), marginBottom: mmToPx(2) }}>6. Termo de Garantia</div>
      <div style={{ fontSize: '12pt', lineHeight: 1.6, whiteSpace: 'pre-wrap', textAlign: 'justify', overflowWrap: 'anywhere' }}>{GARANTIA_FIXA.join('\n')}</div>
    </>
  );

  // Helpers para medidas e cores
  const formatMetro = (v: number | '') => {
    if (v === '' || isNaN(Number(v))) return '';
    const n = Number(v);
    return `${n.toFixed(2).replace('.', ',')} m`;
  };
  const addCorItem = () => setCoresDefinidas((arr) => [...arr, { parte: '', cores: '' }]);
  const removeCorItem = (idx: number) => setCoresDefinidas((arr) => arr.filter((_, i) => i !== idx));
  const updateCorItem = (idx: number, patch: Partial<CorItem>) => setCoresDefinidas((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  // Export
  const rootRef = useRef<HTMLDivElement>(null);
  const [exportando, setExportando] = useState(false);
  const onExport = async () => {
    if (!rootRef.current || exportando) return;
    setExportando(true);
    const t = toast.loading('Aguarde. gerando PDF');
    try {
      await exportToPdf(rootRef.current, `Proposta_${para || 'Destinatario'}.pdf`);
      toast.success('PDF gerado com sucesso', { id: t });
    } catch (e) {
      toast.error('Falha ao gerar PDF', { id: t });
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="border-2 rounded-lg bg-white shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">Dados da Proposta</CardTitle>
        </CardHeader>
        <div className="px-6 pt-4 flex justify-end">
          <Button onClick={onExport} disabled={exportando} className="!bg-emerald-600 hover:!bg-emerald-700 !text-white shadow-md disabled:opacity-60 disabled:cursor-not-allowed">{exportando ? 'Aguarde…' : 'Exportar PDF'}</Button>
        </div>
        <CardContent>
          <Tabs defaultValue="ident" className="w-full">
            <TabsList>
              <TabsTrigger value="ident">Identificação</TabsTrigger>
              <TabsTrigger value="escopo">Escopo</TabsTrigger>
              <TabsTrigger value="precos">Itens de Preço</TabsTrigger>
              <TabsTrigger value="valcont">Valores e Contato</TabsTrigger>
            </TabsList>

            <TabsContent value="ident" className="mt-3">
              <div className="rounded-xl border-2 bg-white/80 p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">Número da Proposta</Label>
                    <Input className="border-2 h-12 text-[15px]" value={numeroProposta} onChange={(e) => setNumeroProposta(e.target.value)} placeholder="Ex.: 454 R04" />
                  </div>
                  <div>
                    <Label className="text-sm">Data de Emissão</Label>
                    <Input className="border-2 h-12 text-[15px]" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} placeholder="DD/MM/AAAA" />
                  </div>
                  <div>
                    <Label className="text-sm">Sufixo da Proposta</Label>
                    <Input className="border-2 h-12 text-[15px]" value={sufixoProposta} onChange={(e) => setSufixoProposta(e.target.value)} placeholder="Ex.: AC" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Destinatário</Label>
                  <Input className="border-2 h-12 text-[15px]" value={para} onChange={(e) => setPara(e.target.value)} placeholder="Nome do destinatário" />
                  <p className="text-xs text-gray-500 mt-1">Usado também após “Prezado(a)” na carta.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="escopo" className="mt-3">
              <div className="rounded-xl border-2 bg-white/80 p-5 shadow-sm space-y-5">
                <div>
                  <Label className="text-sm">Descrição do serviço</Label>
                  <Textarea className="border-2 text-[15px] min-h-[200px]" rows={10} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o escopo técnico do projeto..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">Largura (m)</Label>
                    <Input type="number" step="0.01" min="0" className="border-2 h-12 text-[15px]" value={largura} onChange={(e) => setLargura(e.target.value === '' ? '' : Number(e.target.value))} placeholder="ex.: 3.50" />
                  </div>
                  <div>
                    <Label className="text-sm">Altura (m)</Label>
                    <Input type="number" step="0.01" min="0" className="border-2 h-12 text-[15px]" value={altura} onChange={(e) => setAltura(e.target.value === '' ? '' : Number(e.target.value))} placeholder="ex.: 2.40" />
                  </div>
                  <div>
                    <Label className="text-sm">Comprimento (m)</Label>
                    <Input type="number" step="0.01" min="0" className="border-2 h-12 text-[15px]" value={comprimento} onChange={(e) => setComprimento(e.target.value === '' ? '' : Number(e.target.value))} placeholder="ex.: 8.00" />
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Composição e materiais</Label>
                  <Textarea className="border-2 text-[15px] min-h-[120px]" rows={6} value={composicaoMateriais} onChange={(e) => setComposicaoMateriais(e.target.value)} placeholder="Descreva composição, materiais, acabamentos..." />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Cores Definidas</Label>
                    <Button size="sm" className="h-8 px-2 !bg-emerald-600 hover:!bg-emerald-700 !text-white border-2 !border-emerald-700 shadow-sm" onClick={addCorItem}>Adicionar estrutura/local</Button>
                  </div>
                  {coresDefinidas.length === 0 ? (
                    <div className="text-sm text-gray-500">Nenhuma estrutura/local adicionada.</div>
                  ) : (
                    <div className="space-y-3">
                      {coresDefinidas.map((c, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <Input className="md:col-span-2 border-2 h-11 text-[15px]" placeholder="Parte/Local (ex.: Letreiro frontal)" value={c.parte} onChange={(e) => updateCorItem(idx, { parte: e.target.value })} />
                          <Input className="md:col-span-3 border-2 h-11 text-[15px]" placeholder="Cores (ex.: Vermelho PANTONE X, Branco)" value={c.cores} onChange={(e) => updateCorItem(idx, { cores: e.target.value })} />
                          <div className="md:col-span-5 flex justify-end">
                            <Button variant="ghost" onClick={() => removeCorItem(idx)}>Remover</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="precos" className="mt-3">
              <div className="rounded-xl border-2 bg-white/80 p-5 shadow-sm space-y-4">
                {/* Card de vinculação com Financeiro removido */}
                <h4 className="text-base font-semibold text-gray-800">Itens de Preço</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Qtde</TableHead>
                      <TableHead className="text-right">Vl. Unit.</TableHead>
                      <TableHead className="text-right">Vl. Total</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((it, idx) => {
                      const total = (Number(it.qtde) || 0) * (Number(it.vlUnit) || 0);
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input className="border-2 h-11 text-[15px]" value={it.descricao} onChange={(e) => updateItem(idx, { descricao: e.target.value })} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input className="border-2 h-11 text-right text-[15px]" value={it.qtde} onChange={(e) => updateItem(idx, { qtde: Number(e.target.value) })} type="number" min={0} step={1} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input className="border-2 h-11 text-right text-[15px]" value={it.vlUnit} onChange={(e) => updateItem(idx, { vlUnit: Number(e.target.value) })} type="number" min={0} step={0.01} />
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatBRL(total)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" onClick={() => removeItem(idx)}>Remover</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between">
                  <Button variant="secondary" className="h-11 px-5" onClick={addItem}>Adicionar item</Button>
                  <div className="text-right font-semibold">Total: {formatBRL(totalGeral)}</div>
                </div>
                <div>
                  <Label>Valor por extenso (opcional)</Label>
                  <Input className="border-2 h-12 text-[15px]" value={valorPorExtenso} onChange={(e) => setValorPorExtenso(e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="valcont" className="mt-3">
              <div className="rounded-xl border-2 bg-white/80 p-5 shadow-sm space-y-4">
                <h4 className="text-base font-semibold text-gray-800">Valores (observações)</h4>
                <Textarea className="border-2 text-[15px] min-h-[160px]" rows={10} value={valores} onChange={(e) => setValores(e.target.value)} placeholder="Observações e condições adicionais..." />
                <h4 className="text-base font-semibold text-gray-800">Contato (Assinatura)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input className="border-2 h-12 text-[15px]" value={contatoNome} onChange={(e) => setContatoNome(e.target.value)} placeholder="Nome" />
                  <Input className="border-2 h-12 text-[15px]" value={contatoCargo} onChange={(e) => setContatoCargo(e.target.value)} placeholder="Cargo" />
                  <Input className="border-2 h-12 text-[15px]" value={contatoTel} onChange={(e) => setContatoTel(e.target.value)} placeholder="Telefone" />
                  <Input className="border-2 h-12 text-[15px]" value={contatoEmail} onChange={(e) => setContatoEmail(e.target.value)} placeholder="E-mail" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview A4 */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg font-semibold">Preview da Proposta (A4)</CardTitle>
          <CardAction>
            <Button onClick={onExport} className="bg-emerald-600 hover:bg-emerald-700 text-white">Exportar PDF</Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div ref={rootRef} className="pdf-root space-y-8">
            {/* Página 1 - Capa */}
            <PdfPage className="pdf-page shadow-sm">
              <HeaderPagina right={`Proposta: ${numeroProposta} Técnica e Comercial | Emissão: ${dataEmissao}`} />
              <div className="absolute" style={{ left: mmToPx(MARGENS.esq + 5), top: mmToPx(Y_BLOCO_DEPARA), width: mmToPx(LARGURA_CONTEUDO - 10) }}>
                <div style={{ display: 'flex', gap: 24, fontSize: '16pt' }}>
                  <div><strong>DE:</strong> PEPERAIO COMUNICAÇÃO VISUAL</div>
                  <div><strong>PARA:</strong> {para || '\u00A0'}</div>
                </div>
              </div>
              <div className="absolute text-center" style={{ left: mmToPx(MARGENS.esq), top: mmToPx(Y_TITULO_CENTRAL), width: mmToPx(LARGURA_CONTEUDO), fontSize: '22pt', fontWeight: 700 }}>{TITULO_CENTRAL}</div>
              <div ref={cartaRef} className="absolute" style={{ left: mmToPx(MARGENS.esq + 5), top: mmToPx(cartaTop), width: mmToPx(LARGURA_CONTEUDO - 10), fontSize: '17pt', lineHeight: 1.75, whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{CARTA_APRESENTACAO(para)}</div>
              {/* Assinatura centralizada no rodapé da capa */}
              <div className="absolute text-center" style={{ left: mmToPx(MARGENS.esq), bottom: mmToPx(MARGENS.inf), width: mmToPx(LARGURA_CONTEUDO) }}>
                <div style={{ fontSize: '16pt', fontWeight: 800 }}>{contatoNome}</div>
                <div style={{ fontSize: '14pt' }}>{contatoCargo}</div>
                <div style={{ fontSize: '14pt' }}>{contatoTel}</div>
                <div style={{ fontSize: '14pt' }}>{contatoEmail}</div>
              </div>
            </PdfPage>

            {/* Página 2 - Sumário (sozinho, centralizado) */}
            <PdfPage className="pdf-page shadow-sm">
              <HeaderPagina right={`Proposta: ${numeroProposta} Técnica e Comercial | Emissão: ${dataEmissao}`} />
              <div className="absolute" style={{ left: '50%', top: '45%', transform: 'translate(-50%, -50%)', width: mmToPx(LARGURA_CONTEUDO - 2) }}>
                <div style={{ fontSize: '34pt', fontWeight: 800, marginBottom: mmToPx(8), textAlign: 'center' }}>SUMÁRIO</div>
                <div style={{ fontSize: '24pt', lineHeight: 1.9, textAlign: 'center' }}>
                  <div>1. Escopo de Fornecimento</div>
                  <div>2. Exclusões</div>
                  <div>3. Notas Técnicas</div>
                  <div>4. Preços</div>
                  <div>5. Condições Gerais</div>
                  <div>6. Termo de Garantia</div>
                </div>
              </div>
            </PdfPage>

            {/* Página 3 - Conteúdo técnico (Escopo + seções seguintes conforme espaço) */}
            <PdfPage className="pdf-page shadow-sm">
              <HeaderPagina right={`Proposta: ${numeroProposta} Técnica e Comercial | Emissão: ${dataEmissao}`} />
              <div ref={page2FlowRef} className="absolute" style={{ left: mmToPx(MARGENS.esq + 5), top: mmToPx(Y_APOS_CABECALHO), width: mmToPx(LARGURA_CONTEUDO - 10) }}>
                <div style={{ fontSize: '16pt', fontWeight: 700, marginBottom: mmToPx(3) }}>1. Escopo de Fornecimento</div>
                <div style={{ fontSize: '12pt', lineHeight: 1.6, whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{descricao || '\u00A0'}</div>
                {(largura !== '' || altura !== '' || comprimento !== '' || composicaoMateriais || coresDefinidas.length > 0) && (
                  <div style={{ marginTop: mmToPx(5) }}>
                    <div style={{ fontSize: '14pt', fontWeight: 700, marginBottom: mmToPx(2) }}>Especificações do Projeto</div>
                    {(largura !== '' || altura !== '' || comprimento !== '') && (
                      <div style={{ fontSize: '12pt', marginBottom: mmToPx(2), lineHeight: 1.6 }}>
                        {largura !== '' && <div>Largura: {formatMetro(largura)}</div>}
                        {altura !== '' && <div>Altura: {formatMetro(altura)}</div>}
                        {comprimento !== '' && <div>Comprimento: {formatMetro(comprimento)}</div>}
                      </div>
                    )}
                    {composicaoMateriais && (
                      <div style={{ fontSize: '12pt', whiteSpace: 'pre-wrap', textAlign: 'justify', marginBottom: mmToPx(2), lineHeight: 1.6 }}>
                        <strong>Composição e materiais: </strong>{composicaoMateriais}
                      </div>
                    )}
                    {coresDefinidas.length > 0 && (
                      <div style={{ fontSize: '12pt' }}>
                        <div style={{ fontWeight: 700, marginBottom: mmToPx(1) }}>Cores Definidas</div>
                        <ul style={{ paddingLeft: '1em', lineHeight: 1.6 }}>
                          {coresDefinidas.map((c, i) => (
                            <li key={i}>
                              <strong>{c.parte || 'Parte/Local'}:</strong> {c.cores || '\u00A0'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {!moveSec2e3ToNext && (
                  <Secoes2e3 />
                )}
              </div>
            </PdfPage>

            {moveSec2e3ToNext && (
              <PdfPage className="pdf-page shadow-sm">
                <HeaderPagina right={`Proposta: ${numeroProposta} Técnica e Comercial | Emissão: ${dataEmissao}`} />
                <div className="absolute" style={{ left: mmToPx(MARGENS.esq + 5), top: mmToPx(Y_APOS_CABECALHO), width: mmToPx(LARGURA_CONTEUDO - 10) }}>
                  <Secoes2e3 />
                </div>
              </PdfPage>
            )}

            {/* Página 4 - Preços */}
            <PdfPage className="pdf-page shadow-sm">
              <HeaderPagina right={`Proposta: ${numeroProposta} Técnica e Comercial | Emissão: ${dataEmissao}`} />
              <div className="absolute" style={{ left: mmToPx(MARGENS.esq + 5), top: mmToPx(Y_APOS_CABECALHO), width: mmToPx(LARGURA_CONTEUDO - 10) }}>
                <div style={{ fontSize: '16pt', fontWeight: 700, marginBottom: mmToPx(4) }}>4. PREÇOS</div>
                <div style={{ width: '100%', border: '2px solid #000', borderCollapse: 'collapse', fontSize: '12pt' }}>
                  <div style={{ borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 700, color: '#d62727', padding: '6px 4px', fontSize: '12pt' }}>{tituloTabela}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'left', fontWeight: 700 }}>DESCRIÇÃO</th>
                        <th style={{ border: '1px solid #000', padding: '4px', width: mmToPx(20), textAlign: 'center', fontWeight: 700 }}>QTDE</th>
                        <th style={{ border: '1px solid #000', padding: '4px', width: mmToPx(35), textAlign: 'center', fontWeight: 700 }}>VL. UNIT.</th>
                        <th style={{ border: '1px solid #000', padding: '4px', width: mmToPx(35), textAlign: 'center', fontWeight: 700 }}>VL. TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((it, i) => {
                        const total = (Number(it.qtde) || 0) * (Number(it.vlUnit) || 0);
                        return (
                          <tr key={i}>
                            <td style={{ border: '1px solid #000', padding: '4px' }}>{it.descricao || '\u00A0'}</td>
                            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{it.qtde}</td>
                            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>{formatBRL(Number(it.vlUnit) || 0)}</td>
                            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 700 }}>{formatBRL(total)}</td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 700 }}>VALOR TOTAL:</td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{totalQtde}</td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}></td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 700 }}>{formatBRL(totalGeral)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: mmToPx(6), fontSize: '12pt' }}>
                  Importa a presente proposta o valor final total de <span style={{ color: '#d62727', fontWeight: 700 }}>{formatBRL(totalGeral)}</span><br />
                  <span style={{ color: '#d62727', fontWeight: 700 }}>{valorPorExtenso}</span>
                </div>
                {valores && (
                  <div style={{ marginTop: mmToPx(6), fontSize: '12pt', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{valores}</div>
                )}
              </div>
            </PdfPage>

            {/* Página 5 - Condições Gerais (+ Garantia se couber) */}
            <PdfPage className="pdf-page shadow-sm">
              <HeaderPagina right={`Proposta: ${numeroProposta} Técnica e Comercial | Emissão: ${dataEmissao}`} />
              <div
                ref={page5WrapRef}
                className="absolute"
                style={{
                  left: mmToPx(MARGENS.esq + 5),
                  top: mmToPx(Y_APOS_CABECALHO),
                  width: mmToPx(LARGURA_CONTEUDO - 10),
                  // Quando a garantia couber nesta mesma página, mantenha um padding inferior
                  // para que o texto não invada a área da assinatura de rodapé.
                  paddingBottom: mmToPx(ASSINATURA_FOOTER_ALTURA_MM)
                }}
              >
                <div style={{ fontSize: '16pt', fontWeight: 700, marginBottom: mmToPx(2) }}>5. Condições Gerais</div>
                <ul style={{ fontSize: '12pt', lineHeight: 1.6, paddingLeft: '1em' }}>
                  {CONDICOES_GERAIS_FIXAS(dataEmissao).map((t, i) => (<li key={i} style={{ marginBottom: mmToPx(2) }}>{t}</li>))}
                </ul>
                {!moveGarantiaNext && (
                  <BlocoGarantia />
                )}
              </div>
              {!moveGarantiaNext && (
                <div className="absolute text-center" style={{ left: mmToPx(MARGENS.esq), bottom: mmToPx(MARGENS.inf), width: mmToPx(LARGURA_CONTEUDO) }}>
                  <div style={{ fontSize: '12pt', fontWeight: 700 }}>Isaac Peperaio</div>
                  <div style={{ fontSize: '12pt' }}>(61) 981966308</div>
                  <div style={{ fontSize: '12pt' }}>Depto. Engenharia e Montagem</div>
                </div>
              )}
            </PdfPage>

            {moveGarantiaNext && (
              <PdfPage className="pdf-page shadow-sm">
                <HeaderPagina right={`Proposta: ${numeroProposta} Técnica e Comercial | Emissão: ${dataEmissao}`} />
                <div
                  className="absolute"
                  style={{
                    left: mmToPx(MARGENS.esq + 5),
                    top: mmToPx(Y_APOS_CABECALHO),
                    width: mmToPx(LARGURA_CONTEUDO - 10),
                    paddingBottom: mmToPx(ASSINATURA_FOOTER_ALTURA_MM)
                  }}
                >
                  <BlocoGarantia />
                </div>
                <div className="absolute text-center" style={{ left: mmToPx(MARGENS.esq), bottom: mmToPx(MARGENS.inf), width: mmToPx(LARGURA_CONTEUDO) }}>
                  <div style={{ fontSize: '12pt', fontWeight: 700 }}>Isaac Peperaio</div>
                  <div style={{ fontSize: '12pt' }}>(61) 981966308</div>
                  <div style={{ fontSize: '12pt' }}>Depto. Engenharia e Montagem</div>
                </div>
              </PdfPage>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-6 right-6 z-50">
        <Button onClick={onExport} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg px-6 py-3 rounded-md">Exportar PDF</Button>
      </div>
    </div>
  );
}

export default AutomacaoPDF2;
export { AutomacaoPDF2 };
