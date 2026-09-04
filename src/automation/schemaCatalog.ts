import { FerramentaInfo } from '../types/pnbox';

export const ID_PLANO_PADRAO = 'HCOQIkjSk97gGcfGDPb0h';

export const FERRAMENTAS_PNBOX: FerramentaInfo[] = [
  // 1. Bloco CLIENTE - MERCADO
  {
    id: 'segmentacaoMercado',
    nome: 'Segmentação de Mercado',
    bloco: 'CLIENTE_MERCADO',
    blocoLabel: 'Cliente - Mercado',
    collectionName: 'segmentacaoMercado',
    metodosDDP: ['segmentacaoMercado.insert', 'segmentacaoMercado.update', 'segmentacaoMercado.remove', 'segmentacaoMercado.default'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/segmentacaoMercado`,
    descricao: 'Divisão de mercado em grupos homogêneos por variáveis demográficas, comportamentais e geográficas.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID identificador do plano de negócio', exemplo: ID_PLANO_PADRAO },
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Nome ou título do segmento', exemplo: 'Informe o nome do segmento baseado em pesquisa real' },
      { nome: 'variavel1', tipo: 'string', obrigatorio: false, descricao: '1ª Dimensão ou eixo de segmentação', exemplo: 'Informe a primeira dimensão de segmentação' },
      { nome: 'variavel1Oposto', tipo: 'string', obrigatorio: false, descricao: 'Oposto da 1ª dimensão', exemplo: 'Informe o oposto da primeira dimensão' },
      { nome: 'variavel2', tipo: 'string', obrigatorio: false, descricao: '2ª Dimensão ou comportamento', exemplo: 'Informe a segunda dimensão de comportamento' },
      { nome: 'variavel2Oposto', tipo: 'string', obrigatorio: false, descricao: 'Oposto da 2ª dimensão', exemplo: 'Informe o oposto da segunda dimensão' },
      { nome: 'segmento', tipo: 'string', obrigatorio: false, descricao: 'Classificação detalhada do público-alvo', exemplo: 'Informe a classificação do segmento' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'EXEMPLO: Substituir com dados reais da pesquisa',
      variavel1: 'EXEMPLO: Substituir com dados reais da pesquisa',
      variavel1Oposto: 'EXEMPLO: Substituir com dados reais da pesquisa',
      variavel2: 'EXEMPLO: Substituir com dados reais da pesquisa',
      variavel2Oposto: 'EXEMPLO: Substituir com dados reais da pesquisa',
      segmento: 'EXEMPLO: Substituir com dados reais da pesquisa'
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_01',
      result: 'sH82bK92mZpl01a'
    }
  },
  {
    id: 'geradorPersonas',
    nome: 'Gerador de Personas',
    bloco: 'CLIENTE_MERCADO',
    blocoLabel: 'Cliente - Mercado',
    collectionName: 'geradorPersonas',
    metodosDDP: ['geradorPersonas.insert', 'geradorPersonas.update', 'geradorPersonas.remove', 'geradorPersonas.default'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/geradorPersonas`,
    descricao: 'Construção do perfil semi-fictício do cliente ideal baseado em dados reais de mercado.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'nome', tipo: 'string', obrigatorio: true, descricao: 'Nome fictício da persona', exemplo: 'Informe o nome da persona baseado em pesquisa real' },
      { nome: 'idade', tipo: 'string', obrigatorio: false, descricao: 'Idade da persona', exemplo: 'Informe a idade da persona' },
      { nome: 'profissao', tipo: 'string', obrigatorio: false, descricao: 'Ocupação ou cargo', exemplo: 'Informe a profissão da persona' },
      { nome: 'escolaridade', tipo: 'string', obrigatorio: false, descricao: 'Nível de instrução', exemplo: 'Informe o nível de instrução' },
      { nome: 'renda', tipo: 'string', obrigatorio: false, descricao: 'Renda média estimada', exemplo: 'Informe a renda da persona' },
      { nome: 'habitos', tipo: 'string', obrigatorio: false, descricao: 'Comportamentos rotineiros', exemplo: 'Informe os hábitos da persona' },
      { nome: 'dores', tipo: 'string', obrigatorio: false, descricao: 'Problemas e frustrações diárias', exemplo: 'Informe as dores da persona' },
      { nome: 'objetivos', tipo: 'string', obrigatorio: false, descricao: 'Metas e desejos principais', exemplo: 'Informe os objetivos da persona' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      nome: 'EXEMPLO: Substituir com dados reais da pesquisa',
      idade: 'EXEMPLO: Substituir com dados reais da pesquisa',
      profissao: 'EXEMPLO: Substituir com dados reais da pesquisa',
      escolaridade: 'EXEMPLO: Substituir com dados reais da pesquisa',
      renda: 'EXEMPLO: Substituir com dados reais da pesquisa',
      habitos: 'EXEMPLO: Substituir com dados reais da pesquisa',
      dores: 'EXEMPLO: Substituir com dados reais da pesquisa',
      objetivos: 'EXEMPLO: Substituir com dados reais da pesquisa'
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_02',
      result: 'pY87gTk981nMq90'
    }
  },
  {
    id: 'jornadaCliente',
    nome: 'Jornada do Cliente',
    bloco: 'CLIENTE_MERCADO',
    blocoLabel: 'Cliente - Mercado',
    collectionName: 'jornadaCliente',
    metodosDDP: ['jornadaCliente.insert', 'jornadaCliente.update', 'jornadaCliente.remove'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/jornadaCliente`,
    descricao: 'Mapeamento de todos os pontos de contato e etapas de decisão do cliente.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'etapa', tipo: 'string', obrigatorio: true, descricao: 'Fase da jornada (Conhecimento, Consideração, Compra, Retenção)', exemplo: 'Informe a fase da jornada' },
      { nome: 'acoes', tipo: 'string', obrigatorio: true, descricao: 'O que o cliente faz nessa etapa', exemplo: 'Informe as ações do cliente nesta etapa' },
      { nome: 'pontosContato', tipo: 'string', obrigatorio: false, descricao: 'Canais de contato', exemplo: 'Informe os pontos de contato' },
      { nome: 'emocoes', tipo: 'string', obrigatorio: false, descricao: 'Sentimento percebido', exemplo: 'Informe o sentimento percebido' },
      { nome: 'oportunidadesMelhoria', tipo: 'string', obrigatorio: false, descricao: 'Ações que o negócio pode implementar', exemplo: 'Informe as oportunidades de melhoria' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      etapa: 'EXEMPLO: Substituir com dados reais da pesquisa',
      acoes: 'EXEMPLO: Substituir com dados reais da pesquisa',
      pontosContato: 'EXEMPLO: Substituir com dados reais da pesquisa',
      emocoes: 'EXEMPLO: Substituir com dados reais da pesquisa',
      oportunidadesMelhoria: 'EXEMPLO: Substituir com dados reais da pesquisa'
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_03',
      result: 'jK81aNz092Lmq11'
    }
  },

  // 2. Bloco PROBLEMA - SOLUÇÃO
  {
    id: 'propostaValor',
    nome: 'Proposta de Valor (Value Proposition Canvas)',
    bloco: 'PROBLEMA_SOLUCAO',
    blocoLabel: 'Problema - Solução',
    collectionName: 'propostaValor',
    metodosDDP: ['propostaValor.insert', 'propostaValor.update', 'propostaValor.remove'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/propostaValor`,
    descricao: 'Alinhamento entre o perfil do cliente (dores/ganhos) e o mapa de valor do produto.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'tarefasCliente', tipo: 'string', obrigatorio: false, descricao: 'Tarefas que o cliente precisa realizar', exemplo: 'Informe as tarefas do cliente' },
      { nome: 'dores', tipo: 'string', obrigatorio: false, descricao: 'Dores evitadas', exemplo: 'Informe as dores evitadas' },
      { nome: 'ganhos', tipo: 'string', obrigatorio: false, descricao: 'Ganhos desejados', exemplo: 'Informe os ganhos desejados' },
      { nome: 'produtosServicos', tipo: 'string', obrigatorio: false, descricao: 'Oferta concreta', exemplo: 'Informe a oferta concreta' },
      { nome: 'aliviadoresDores', tipo: 'string', obrigatorio: false, descricao: 'Como a oferta elimina a dor', exemplo: 'Informe como a oferta elimina a dor' },
      { nome: 'criadoresGanhos', tipo: 'string', obrigatorio: false, descricao: 'Como a oferta gera benefícios extras', exemplo: 'Informe como a oferta gera benefícios extras' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      tarefasCliente: 'EXEMPLO: Substituir com dados reais da pesquisa',
      dores: 'EXEMPLO: Substituir com dados reais da pesquisa',
      ganhos: 'EXEMPLO: Substituir com dados reais da pesquisa',
      produtosServicos: 'EXEMPLO: Substituir com dados reais da pesquisa',
      aliviadoresDores: 'EXEMPLO: Substituir com dados reais da pesquisa',
      criadoresGanhos: 'EXEMPLO: Substituir com dados reais da pesquisa'
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_04',
      result: 'pv67gK091Zpl77'
    }
  },
  {
    id: 'analiseConcorrencia',
    nome: 'Análise da Concorrência',
    bloco: 'PROBLEMA_SOLUCAO',
    blocoLabel: 'Problema - Solução',
    collectionName: 'analiseConcorrencia',
    metodosDDP: ['analiseConcorrencia.insert', 'analiseConcorrencia.update', 'analiseConcorrencia.remove'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/analiseConcorrencia`,
    descricao: 'Mapeamento de competidores diretos e indiretos, comparando diferenciais e precificação.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'nomeConcorrente', tipo: 'string', obrigatorio: true, descricao: 'Nome da empresa concorrente', exemplo: 'Informe o nome do concorrente' },
      { nome: 'pontosFortes', tipo: 'string', obrigatorio: false, descricao: 'Vantagens competitivas do concorrente', exemplo: 'Informe os pontos fortes do concorrente' },
      { nome: 'pontosFracos', tipo: 'string', obrigatorio: false, descricao: 'Desvantagens ou lacunas', exemplo: 'Informe as desvantagens ou lacunas' },
      { nome: 'preco', tipo: 'string', obrigatorio: false, descricao: 'Nível de preço relativo', exemplo: 'Informe o nível de preço relativo' },
      { nome: 'diferencial', tipo: 'string', obrigatorio: false, descricao: 'Nosso diferencial em relação a ele', exemplo: 'Informe o diferencial em relação ao concorrente' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      nomeConcorrente: 'EXEMPLO: Substituir com dados reais da pesquisa',
      pontosFortes: 'EXEMPLO: Substituir com dados reais da pesquisa',
      pontosFracos: 'EXEMPLO: Substituir com dados reais da pesquisa',
      preco: 'EXEMPLO: Substituir com dados reais da pesquisa',
      diferencial: 'EXEMPLO: Substituir com dados reais da pesquisa'
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_05',
      result: 'ac099187aKhZq1'
    }
  },

  // 3. Bloco ESTRATÉGIA
  {
    id: 'forcasFraquezas',
    nome: 'Forças e Fraquezas (Ambiente Interno)',
    bloco: 'ESTRATEGIA',
    blocoLabel: 'Estratégia',
    collectionName: 'forcasFraquezas',
    metodosDDP: ['forcasFraquezas.insert', 'forcasFraquezas.update', 'forcasFraquezas.remove'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/forcasFraquezas`,
    descricao: 'Diagnóstico dos fatores internos controláveis da organização.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'tipo', tipo: 'string', obrigatorio: true, descricao: 'Classificação: "forca" ou "fraqueza"', exemplo: 'Informe se é força ou fraqueza' },
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Detalhamento do ponto interno', exemplo: 'Informe o detalhe do ponto interno' },
      { nome: 'grauImportancia', tipo: 'string', obrigatorio: false, descricao: 'Nível de relevância: Alta, Média ou Baixa', exemplo: 'Informe o nível de importância' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      tipo: 'EXEMPLO: Substituir com dados reais da pesquisa',
      descricao: 'EXEMPLO: Substituir com dados reais da pesquisa',
      grauImportancia: 'EXEMPLO: Substituir com dados reais da pesquisa'
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_06',
      result: 'ff01837bMqp9'
    }
  },
  {
    id: 'oportunidadesAmeacas',
    nome: 'Oportunidades e Ameaças (Ambiente Externo)',
    bloco: 'ESTRATEGIA',
    blocoLabel: 'Estratégia',
    collectionName: 'oportunidadesAmeacas',
    metodosDDP: ['oportunidadesAmeacas.insert', 'oportunidadesAmeacas.update', 'oportunidadesAmeacas.remove'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/oportunidadesAmeacas`,
    descricao: 'Mapeamento das tendências de mercado, economia e concorrência externa.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'tipo', tipo: 'string', obrigatorio: true, descricao: 'Classificação: "oportunidade" ou "ameaca"', exemplo: 'Informe se é oportunidade ou ameaça' },
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Fator externo não controlável', exemplo: 'Informe o fator externo' },
      { nome: 'impacto', tipo: 'string', obrigatorio: false, descricao: 'Impacto potencial no negócio', exemplo: 'Informe o impacto potencial' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      tipo: 'EXEMPLO: Substituir com dados reais da pesquisa',
      descricao: 'EXEMPLO: Substituir com dados reais da pesquisa',
      impacto: 'EXEMPLO: Substituir com dados reais da pesquisa'
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_07',
      result: 'oa0199127bNc8'
    }
  },
  {
    id: 'analiseSwot',
    nome: 'Matriz SWOT Consolidada',
    bloco: 'ESTRATEGIA',
    blocoLabel: 'Estratégia',
    collectionName: 'analiseSwot',
    metodosDDP: ['analiseSwot.insert', 'analiseSwot.update', 'analiseSwot.remove'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/analiseSwot`,
    descricao: 'Cruzamento das forças, fraquezas, oportunidades e ameaças para gerar ações estratégicas.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'estrategiaDesenvolvimento', tipo: 'string', obrigatorio: false, descricao: 'Ações de Forças + Oportunidades', exemplo: 'Informe a estratégia de desenvolvimento' },
      { nome: 'estrategiaManutencao', tipo: 'string', obrigatorio: false, descricao: 'Ações de Forças + Ameaças', exemplo: 'Informe a estratégia de manutenção' },
      { nome: 'estrategiaSobrevivencia', tipo: 'string', obrigatorio: false, descricao: 'Ações de Fraquezas + Ameaças', exemplo: 'Informe a estratégia de sobrevivência' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      estrategiaDesenvolvimento: 'EXEMPLO: Substituir com dados reais da pesquisa',
      estrategiaManutencao: 'EXEMPLO: Substituir com dados reais da pesquisa',
      estrategiaSobrevivencia: 'EXEMPLO: Substituir com dados reais da pesquisa'
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_08',
      result: 'sw0188992aZk'
    }
  },

  // 4. Bloco FINANÇAS
  {
    id: 'investimentoFixo',
    nome: 'Investimento Fixo (Máquinas, Móveis, Equipamentos)',
    bloco: 'FINANCAS',
    blocoLabel: 'Finanças',
    collectionName: 'investimentoFixo',
    metodosDDP: ['investimentoFixo.insert', 'investimentoFixo.update', 'investimentoFixo.remove'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/investimentoFixo`,
    descricao: 'Estimativa de bens duráveis necessários para a operação do negócio.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Item de investimento', exemplo: 'Informe o item de investimento' },
      { nome: 'quantidade', tipo: 'number', obrigatorio: true, descricao: 'Quantidade a adquirir', exemplo: 'Informe a quantidade' },
      { nome: 'valorUnitario', tipo: 'number', obrigatorio: true, descricao: 'Valor unitário em R$', exemplo: 'Informe o valor unitário' },
      { nome: 'subtotal', tipo: 'number', obrigatorio: false, descricao: 'Subtotal calculado', exemplo: 'Informe o subtotal' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'EXEMPLO: Substituir com dados reais da pesquisa',
      quantidade: 0,
      valorUnitario: 0,
      subtotal: 0
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_09',
      result: 'if99182901aZ'
    }
  },
  {
    id: 'investimentoPreOperacional',
    nome: 'Investimento Pré-Operacional',
    bloco: 'FINANCAS',
    blocoLabel: 'Finanças',
    collectionName: 'investimentoPreOperacional',
    metodosDDP: ['investimentoPreOperacional.insert', 'investimentoPreOperacional.update', 'investimentoPreOperacional.remove'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/investimentoPreOperacional`,
    descricao: 'Gastos incorridos antes da abertura das portas (reformas, taxas, identidade visual).',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'Tipo de despesa pré-operacional', exemplo: 'Informe o tipo de despesa pré-operacional' },
      { nome: 'valor', tipo: 'number', obrigatorio: true, descricao: 'Valor total do gasto em R$', exemplo: 'Informe o valor total' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'EXEMPLO: Substituir com dados reais da pesquisa',
      valor: 0
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_10',
      result: 'ip0028919aLk'
    }
  },
  {
    id: 'estoqueInicial',
    nome: 'Estoque Inicial',
    bloco: 'FINANCAS',
    blocoLabel: 'Finanças',
    collectionName: 'estoqueInicial',
    metodosDDP: ['estoqueInicial.insert', 'estoqueInicial.update', 'estoqueInicial.remove'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/estoqueInicial`,
    descricao: 'Insumos e mercadorias necessárias para começar as vendas no primeiro mês.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'Mercadoria ou insumo inicial', exemplo: 'Informe o insumo inicial' },
      { nome: 'quantidade', tipo: 'number', obrigatorio: true, descricao: 'Quantidade inicial', exemplo: 'Informe a quantidade inicial' },
      { nome: 'valorUnitario', tipo: 'number', obrigatorio: true, descricao: 'Custo unitário em R$', exemplo: 'Informe o custo unitário' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'EXEMPLO: Substituir com dados reais da pesquisa',
      quantidade: 0,
      valorUnitario: 0
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_11',
      result: 'ei8819021aMl'
    }
  },
  {
    id: 'capitalGiro',
    nome: 'Capital de Giro',
    bloco: 'FINANCAS',
    blocoLabel: 'Finanças',
    collectionName: 'capitalGiro',
    metodosDDP: ['capitalGiro.insert', 'capitalGiro.update', 'capitalGiro.remove'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/capitalGiro`,
    descricao: 'Cálculo da reserva de liquidez para cobrir prazos de recebimento e pagamento.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'prazoMedioVendas', tipo: 'number', obrigatorio: false, descricao: 'Prazo médio em dias para receber vendas', exemplo: 'Informe o prazo médio de vendas' },
      { nome: 'prazoMedioCompras', tipo: 'number', obrigatorio: false, descricao: 'Prazo médio em dias para pagar fornecedores', exemplo: 'Informe o prazo médio de compras' },
      { nome: 'reservaFinanceira', tipo: 'number', obrigatorio: false, descricao: 'Valor da reserva em R$', exemplo: 'Informe o valor da reserva financeira' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      prazoMedioVendas: 0,
      prazoMedioCompras: 0,
      reservaFinanceira: 0
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_12',
      result: 'cg0919208aKq'
    }
  },
  {
    id: 'custoFixo',
    nome: 'Custos Fixos Mensais',
    bloco: 'FINANCAS',
    blocoLabel: 'Finanças',
    collectionName: 'custoFixo',
    metodosDDP: ['custoFixo.insert', 'custoFixo.update', 'custoFixo.remove'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/custoFixo`,
    descricao: 'Gastos recorrentes independentes do volume de vendas (aluguel, condomínio, internet).',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'Nome do custo fixo', exemplo: 'Informe o nome do custo fixo' },
      { nome: 'valor', tipo: 'number', obrigatorio: true, descricao: 'Valor mensal em R$', exemplo: 'Informe o valor mensal' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'EXEMPLO: Substituir com dados reais da pesquisa',
      valor: 0
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_13',
      result: 'cf0019283aWq'
    }
  },
  {
    id: 'produtoServico',
    nome: 'Produtos e Serviços / Faturamento',
    bloco: 'FINANCAS',
    blocoLabel: 'Finanças',
    collectionName: 'produtoServico',
    metodosDDP: ['produtoServico.insert', 'produtoServico.update', 'produtoServico.remove'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/produtoServico`,
    descricao: 'Cadastro do mix de produtos com preço de venda, custos unitários e projeção de faturamento.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'Nome do produto/serviço', exemplo: 'Informe o nome do produto/serviço' },
      { nome: 'precoVenda', tipo: 'number', obrigatorio: true, descricao: 'Preço de venda em R$', exemplo: 'Informe o preço de venda' },
      { nome: 'custoUnitario', tipo: 'number', obrigatorio: false, descricao: 'Custo dos materiais em R$', exemplo: 'Informe o custo unitário' },
      { nome: 'estimativaVendasMes', tipo: 'number', obrigatorio: false, descricao: 'Quantidade mensal projetada', exemplo: 'Informe a quantidade mensal projetada' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'EXEMPLO: Substituir com dados reais da pesquisa',
      precoVenda: 0,
      custoUnitario: 0,
      estimativaVendasMes: 0
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_14',
      result: 'ps01920981aB'
    }
  },

  // 5. Bloco COMPLEMENTARES
  {
    id: 'quadroExperimentacao',
    nome: 'Quadro de Experimentação e Hipóteses',
    bloco: 'COMPLEMENTARES',
    blocoLabel: 'Complementares',
    collectionName: 'quadroExperimentacaoHipotese',
    metodosDDP: ['quadroExperimentacaoHipotese.save', 'quadroExperimentacaoHipotese.insert', 'quadroExperimentacaoHipotese.update'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/quadroExperimentacao`,
    descricao: 'Testagem de premissas críticas do negócio com métricas e critérios de sucesso.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Hipótese a validar (máx 200 caracteres)', exemplo: 'Informe a hipótese a validar' },
      { nome: 'categoria', tipo: 'string', obrigatorio: false, descricao: 'Cliente, Problema ou Solução', exemplo: 'Informe a categoria' },
      { nome: 'nivelIncerteza', tipo: 'string', obrigatorio: false, descricao: 'Baixo, Médio ou Alto', exemplo: 'Informe o nível de incerteza' },
      { nome: 'nivelImportancia', tipo: 'string', obrigatorio: false, descricao: 'Importância para viabilidade', exemplo: 'Informe o nível de importância' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'EXEMPLO: Substituir com dados reais da pesquisa',
      categoria: 'EXEMPLO: Substituir com dados reais da pesquisa',
      nivelIncerteza: 'EXEMPLO: Substituir com dados reais da pesquisa',
      nivelImportancia: 'EXEMPLO: Substituir com dados reais da pesquisa'
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_15',
      result: 'qe8819001aX'
    }
  },
  {
    id: 'funilVendas',
    nome: 'Funil de Vendas e Aquisição',
    bloco: 'COMPLEMENTARES',
    blocoLabel: 'Complementares',
    collectionName: 'funilVendas',
    metodosDDP: ['funilVendas.insert', 'funilVendas.update', 'funilVendas.remove'],
    endpointHttp: 'wss://pnbox.sebrae.com.br/websocket',
    metodoHttp: 'WS/DDP',
    rotaInterface: `/planoNegocio/ferramentas/${ID_PLANO_PADRAO}/funilVendas`,
    descricao: 'Etapas de conversão de visitantes até clientes fiéis e promotores.',
    statusDescoberta: 'validado_direto',
    suportaExecucaoSemRenderizacao: true,
    camposSchema: [
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'nome', tipo: 'string', obrigatorio: true, descricao: 'Nome da campanha ou canal', exemplo: 'Informe o nome da campanha ou canal' },
      { nome: 'orcamento', tipo: 'number', obrigatorio: false, descricao: 'Investimento em R$', exemplo: 'Informe o investimento' },
      { nome: 'qtdPessoasAlcancadas', tipo: 'number', obrigatorio: false, descricao: 'Alcance topo de funil', exemplo: 'Informe o alcance topo de funil' },
      { nome: 'qtdPessoasChamadas', tipo: 'number', obrigatorio: false, descricao: 'Cliques ou conversões meio de funil', exemplo: 'Informe as conversões meio de funil' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      nome: 'EXEMPLO: Substituir com dados reais da pesquisa',
      orcamento: 0,
      qtdPessoasAlcancadas: 0,
      qtdPessoasChamdas: 0
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_16',
      result: 'fv0919283aQq'
    }
  }
];

