      return { ...p, items: next };
    });

  const addItem = () =>
    setFormData((p) => ({
      ...p,
      items: [...p.items, { descricao: '', qtde: '', valor_unitario: '', valor_total: '' }]
    }));

  /* ============ HELPERS PDF (centralização + quebra) ============ */
  const writeCentered = (doc: any, text: string, W: number, y: number, lineHeight = 16) => {
    const lines = doc.splitTextToSize(text, W - 96);
    lines.forEach((l: string) => {
      doc.text(l, W / 2, y, { align: 'center' });
      y += lineHeight;
    });
    return y;
  };

  // Novo gerador de PDF usando layout compartilhado
  async function gerarPDF(layout: LayoutConfig) {
    try {
      setIsGenerating(true);
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 48;

      // Pag. 1
      const head1 = drawHeaderLikeModelLayout(doc, W, M, dataEmissao, { showMeta:true, showTitle:true, layout });
      doc.setFont('helvetica','normal'); doc.setFontSize(layout.fontSize);
      let y = head1.contentStart + layout.titleOffset + 30;
      y = writeInBox(doc, layout, CORPO_CARTA_FIXO.trim(), y, layout.bodyLineHeight);

      // Assinatura dentro do box no rodape
      const { BOX_X, BOX_W } = getBox(doc, layout);
      const assinaturaLinhas = doc.splitTextToSize(ASSINATURA_CARTA_FIXA.trim(), BOX_W);
      const assinaturaAltura = assinaturaLinhas.length * layout.bodyLineHeight;
      const yAss = H - layout.bottomMargin - assinaturaAltura;
      doc.text('Atenciosamente,', BOX_X, yAss - 12);
      assinaturaLinhas.forEach((l: string, i: number) => doc.text(l, BOX_X, yAss + i * layout.bodyLineHeight));

      // Pag. 2 – Indice
      doc.addPage();
      const head2 = drawHeaderLikeModelLayout(doc, W, M, dataEmissao, { showMeta:false, showTitle:false, layout });
      y = head2.contentStart + layout.marginTop;
      y = titleInBox(doc, layout, 'Conteudo!', y);
      [
        '1 – ESCOPO DE FORNECIMENTO',
        '2 – EXCLUSÕES / LISTA DE DESVIOS',
        '3 – NOTAS TÉCNICAS',
        '4 – PREÇOS',
        '5 – CONDIÇÕES GERAIS DE VENDAS',
        '6 – TERMO DE GARANTIA DE PRODUTOS ENGENHEIRADOS'
      ].forEach((s) => { y = writeInBox(doc, layout, s, y, 18); });

      // Pag. 3 – Escopo
      doc.addPage();
      const head3 = drawHeaderLikeModelLayout(doc, W, M, dataEmissao, { showMeta:false, showTitle:false, layout });
      y = head3.contentStart + layout.marginTop;
      y = titleInBox(doc, layout, '1 – ESCOPO DE FORNECIMENTO', y);
      [
        ['Descrição do Serviço:', formData.descricao_servico || '_________________________'],
        ['Dimensões:', formData.dimensoes || '_________________________'],
        ['Composição e Materiais:', formData.materiais || '_________________________'],
        ['Cores definidas:', formData.cores || '_________________________'],
        ['Prazo de Execução:', formData.prazo_execucao || '_________________________'],
      ].forEach(([t,v])=>{
        y = addPageIfOverflow(doc, layout, y, () => drawHeaderLikeModelLayout(doc, W, M, dataEmissao, { showMeta:false, showTitle:false, layout }));
        y = writeInBox(doc, layout, `${t}\n${v}`, y, layout.bodyLineHeight);
        y += 6;
      });

      // Pag. 4 – Exclusões e Notas Técnicas
      doc.addPage();
      const head4 = drawHeaderLikeModelLayout(doc, W, M, dataEmissao, { showMeta:false, showTitle:false, layout });
      y = head4.contentStart + layout.marginTop;
      y = titleInBox(doc, layout, '2 – EXCLUSÕES / LISTA DE DESVIOS', y);
      EXCLUSOES_FIXAS.forEach((t) => {
        y = addPageIfOverflow(doc, layout, y, () => drawHeaderLikeModelLayout(doc, W, M, dataEmissao, { showMeta:false, showTitle:false, layout }));
        y = writeInBox(doc, layout, `• ${t}`, y, layout.bodyLineHeight);
      });
      y = titleInBox(doc, layout, '3 – NOTAS TÉCNICAS', y + 10);
      NOTAS_TECNICAS_FIXAS.forEach((t) => {
        y = addPageIfOverflow(doc, layout, y, () => drawHeaderLikeModelLayout(doc, W, M, dataEmissao, { showMeta:false, showTitle:false, layout }));
        y = writeInBox(doc, layout, `• ${t}`, y, layout.bodyLineHeight);
      });

      // Pag. 5 – Preços e Condições
      doc.addPage();
      const head5 = drawHeaderLikeModelLayout(doc, W, M, dataEmissao, { showMeta:false, showTitle:false, layout });
      y = head5.contentStart + layout.marginTop;
      y = titleInBox(doc, layout, '4 – PREÇOS', y);
      doc.setFont('helvetica','bold');
      y = writeInBox(doc, layout, 'DESCRIÇÃO | QTDE | VL. UNIT. | VL. TOTAL', y, 16);
      doc.setFont('helvetica','normal');
      formData.items.forEach((it) => {
        if (!it.descricao && !it.valor_total && !it.qtde && !it.valor_unitario) return;
        y = addPageIfOverflow(doc, layout, y, () => drawHeaderLikeModelLayout(doc, W, M, dataEmissao, { showMeta:false, showTitle:false, layout }));
        y = writeInBox(doc, layout, `${it.descricao || '-'} | ${it.qtde || '-'} | ${it.valor_unitario || '-'} | ${it.valor_total || '-'}`, y, 14);
      });
      y += 10;
      doc.setFont('helvetica','bold');
      y = addPageIfOverflow(doc, layout, y, () => drawHeaderLikeModelLayout(doc, W, M, dataEmissao, { showMeta:false, showTitle:false, layout }));
      y = writeInBox(doc, layout, `Importa a presente proposta o valor final total de ${formData.valor_total_servico || 'R$ 0,00'}`, y, 16);
      doc.setFont('helvetica','normal');
      y = addPageIfOverflow(doc, layout, y, () => drawHeaderLikeModelLayout(doc, W, M, dataEmissao, { showMeta:false, showTitle:false, layout }));
      y = writeInBox(doc, layout, `Pagamento: ${formData.condicoes_pagamento || '__________'}`, y, 16);

      y += 8;
      y = titleInBox(doc, layout, '5 – CONDIÇÕES GERAIS DE VENDA', y);
      CONDICOES_GERAIS_FIXAS(dataEmissao).forEach((t) => {
        y = addPageIfOverflow(doc, layout, y, () => drawHeaderLikeModelLayout(doc, W, M, dataEmissao, { showMeta:false, showTitle:false, layout }));
        y = writeInBox(doc, layout, `• ${t}`, y, layout.bodyLineHeight);
      });

      // Pag. 6+ – Garantia
      doc.addPage();
      const head6 = drawHeaderLikeModelLayout(doc, W, M, dataEmissao, { showMeta:false, showTitle:false, layout });
