/**
 * Tipos para o editor de proposta em PDF (A4 mm-based).
 *
 * Todos os nomes em PT-BR, camelCase e com forte tipagem.
 */

/**
 * Campos dinâmicos permitidos para edição na proposta.
 */
export interface PdfCampos {
  /** Cliente (DE) */
  cliente: string;
  /** Responsável (PARA) */
  responsavel: string;
  /** Número da proposta */
  numeroProposta: string;
  /** Versão da proposta (ex: R04) */
  versao: string;
  /** Data de emissão (dd/mm/aaaa) */
  dataEmissao: string;

  /** Dimensões principais */
  dimensoes: {
    largura: string;
    altura: string;
    comprimento: string;
  };

  /** Materiais e cores (descrição sucinta) */
  materiaisCores: string;

  /** Prazo de execução */
  prazoExecucao: string;

  /** Valor total da proposta (formatado ex: R$ 00,00) */
  valorTotal: string;

  /** Condições de pagamento */
  condicoesPagamento: string;

  /** Validade da proposta */
  validade: string;

  /** Assinatura Marcos */
  assinaturaMarcos: {
    nome: string;
    cargo: string;
    telefone: string;
    email: string;
  };

  /** Assinatura Isaac (garantia) */
  assinaturaIsaac: {
    nome: string;
    telefone: string;
    setor: string;
  };
}

/**
 * Representa um bloco posicionado em milímetros dentro da área útil da página.
 */
export interface BlocoPosicionado {
  /** Identificador único do bloco */
  id: string;
  /** Posição X em mm (origem no canto superior esquerdo da página) */
  xMm: number;
  /** Posição Y em mm (origem no canto superior esquerdo da página) */
  yMm: number;
  /** Largura do bloco em mm */
  widthMm: number;
  /** Altura do bloco em mm (opcional, para clamping do drag) */
  heightMm?: number;
  /** Alinhamento do texto no bloco */
  align?: "left" | "center" | "right" | "justify";
}

/**
 * Contrato básico de callbacks de atualização de bloco.
 */
export interface AtualizacaoBloco {
  onPosicao?: (id: string, xMm: number, yMm: number) => void;
  onAlinhamento?: (id: string, align: "left" | "center" | "right" | "justify") => void;
  onHtml?: (id: string, html: string) => void;
}

/**
 * Conversão baseada em DPI virtual.
 *
 * MM_TO_PX = dpi / 25.4
 */
export const MM_TO_PX = (dpi: number) => dpi / 25.4;

/**
 * Dimensões A4 em mm.
 */
export const A4_MM = { largura: 210, altura: 297 } as const;

/**
 * Margens padrão da proposta em mm.
 * superior: 20, esquerda: 20, direita: 20, inferior: 15
 */
export const MARGENS_MM = { sup: 20, esq: 20, dir: 20, inf: 15 } as const;
