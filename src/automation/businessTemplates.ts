export interface BusinessTemplate {
  id: string;
  nome: string;
  setor: string;
  descricao: string;
  planoId: string;
  dados: Record<string, Record<string, unknown>[]>;
}

/**
 * Estruturas de template sem identidade de plano.
 * O plano é sempre fornecido pelo usuário e confirmado pelo PNBOX.
 */
export const TEMPLATES_NEGOCIO: BusinessTemplate[] = [
  {
    id: 'placeholder',
    nome: 'Template de Estrutura PNBOX',
    setor: '',
    descricao: '',
    planoId: '',
    dados: {
      segmentacaoMercado: [],
      geradorPersonas: [],
      jornadaCliente: [],
      propostaValor: [],
      analiseConcorrencia: [],
      forcasFraquezas: [],
      oportunidadesAmeacas: [],
      analiseSwot: [],
      investimentoFixo: [],
      investimentoPreOperacional: [],
      estoqueInicial: [],
      capitalGiro: [],
      custoFixo: [],
      produtoServico: [],
      quadroExperimentacao: [],
      funilVendas: []
    }
  }
];
