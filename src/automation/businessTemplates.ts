import { ID_PLANO_PADRAO } from './schemaCatalog';

export interface BusinessTemplate {
  id: string;
  nome: string;
  setor: string;
  descricao: string;
  planoId: string;
  dados: Record<string, Record<string, unknown>[]>;
}

/**
 * Templates de negócio vazios que devem ser preenchidos com dados reais
 * provenientes de pesquisa de mercado ou entrada do usuário.
 * NÃO contêm dados simulados ou mocks - apenas estruturas vazias
 * que indicam onde os dados reais devem ser colocados.
 */
export const TEMPLATES_NEGOCIO: BusinessTemplate[] = [
  {
    id: 'placeholder',
    nome: 'Template Placeholder - Substituir com Dados Reais',
    setor: 'Informe o setor baseado em pesquisa real',
    descricao: 'Este é um template placeholder. Os dados devem ser substituídos por informações reais obtidas através de pesquisa de mercado válida.',
    planoId: ID_PLANO_PADRAO,
    dados: {
      // Todas as estruturas vazias - serão preenchidas com dados reais da pesquisa
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
