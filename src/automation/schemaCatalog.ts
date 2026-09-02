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
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Nome ou título do segmento', exemplo: 'Jovens Universitários Urbanos' },
      { nome: 'variavel1', tipo: 'string', obrigatorio: false, descricao: '1ª Dimensão ou eixo de segmentação', exemplo: 'Faixa Etária (18-25 anos)' },
      { nome: 'variavel1Oposto', tipo: 'string', obrigatorio: false, descricao: 'Oposto da 1ª dimensão', exemplo: 'Acima de 25 anos' },
      { nome: 'variavel2', tipo: 'string', obrigatorio: false, descricao: '2ª Dimensão ou comportamento', exemplo: 'Consumo digital diário' },
      { nome: 'variavel2Oposto', tipo: 'string', obrigatorio: false, descricao: 'Oposto da 2ª dimensão', exemplo: 'Consumo tradicional/offline' },
      { nome: 'segmento', tipo: 'string', obrigatorio: false, descricao: 'Classificação detalhada do público-alvo', exemplo: 'B2C' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'Consumidores de Café Especial e Trabalho Remoto',
      variavel1: 'Idade 22-38 anos com renda média-alta',
      variavel1Oposto: 'Consumidores de commodities',
      variavel2: 'Busca ambiente com Wi-Fi de alta velocidade e tomada',
      variavel2Oposto: 'Apenas consumo rápido balcão',
      segmento: 'B2C Premium'
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
      { nome: 'nome', tipo: 'string', obrigatorio: true, descricao: 'Nome fictício da persona', exemplo: 'Marina Souza' },
      { nome: 'idade', tipo: 'string', obrigatorio: false, descricao: 'Idade da persona', exemplo: '29 anos' },
      { nome: 'profissao', tipo: 'string', obrigatorio: false, descricao: 'Ocupação ou cargo', exemplo: 'Designer de Produto' },
      { nome: 'escolaridade', tipo: 'string', obrigatorio: false, descricao: 'Nível de instrução', exemplo: 'Superior Completo' },
      { nome: 'renda', tipo: 'string', obrigatorio: false, descricao: 'Renda média estimada', exemplo: 'R$ 6.500,00' },
      { nome: 'habitos', tipo: 'string', obrigatorio: false, descricao: 'Comportamentos rotineiros', exemplo: 'Trabalha em cafeterias 3x por semana' },
      { nome: 'dores', tipo: 'string', obrigatorio: false, descricao: 'Problemas e frustrações diárias', exemplo: 'Falta de cafés tranquilos com tomadas' },
      { nome: 'objetivos', tipo: 'string', obrigatorio: false, descricao: 'Metas e desejos principais', exemplo: 'Encontrar um espaço inspirador e silencioso' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      nome: 'Lucas Mendes',
      idade: '31 anos',
      profissao: 'Engenheiro de Software Remoto',
      escolaridade: 'Pós-graduação',
      renda: 'R$ 12.000,00',
      habitos: 'Consome cafés especiais, assina newsletters tech',
      dores: 'Barulho excessivo em cafeterias comuns e conexão instável',
      objetivos: 'Ter um local fixo para reuniões e trabalho focado com ótimo café'
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
      { nome: 'etapa', tipo: 'string', obrigatorio: true, descricao: 'Fase da jornada (Conhecimento, Consideração, Compra, Retenção)', exemplo: 'Descoberta' },
      { nome: 'acoes', tipo: 'string', obrigatorio: true, descricao: 'O que o cliente faz nessa etapa', exemplo: 'Busca no Google Maps por cafés perto' },
      { nome: 'pontosContato', tipo: 'string', obrigatorio: false, descricao: 'Canais de contato', exemplo: 'Instagram, Google Meu Negócio' },
      { nome: 'emocoes', tipo: 'string', obrigatorio: false, descricao: 'Sentimento percebido', exemplo: 'Curioso, buscando confiança' },
      { nome: 'oportunidadesMelhoria', tipo: 'string', obrigatorio: false, descricao: 'Ações que o negócio pode implementar', exemplo: 'Manter fotos atualizadas e cardápio online' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      etapa: 'Experiência no Estabelecimento',
      acoes: 'Chega, pede pelo QR code na mesa, consome e trabalha por 3h',
      pontosContato: 'Totem digital, atendimento no balcão, Wi-Fi com login simples',
      emocoes: 'Satisfeito e produtivo',
      oportunidadesMelhoria: 'Oferecer cartão fidelidade digital via WhatsApp'
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
      { nome: 'tarefasCliente', tipo: 'string', obrigatorio: false, descricao: 'Tarefas que o cliente precisa realizar', exemplo: 'Trabalhar fora de casa e fazer reuniões' },
      { nome: 'dores', tipo: 'string', obrigatorio: false, descricao: 'Dores evitadas', exemplo: 'Ruído alto, conexão instável, café frio' },
      { nome: 'ganhos', tipo: 'string', obrigatorio: false, descricao: 'Ganhos desejados', exemplo: 'Produtividade, conforto ergonômico, sabor excepcional' },
      { nome: 'produtosServicos', tipo: 'string', obrigatorio: false, descricao: 'Oferta concreta', exemplo: 'Coworking Café com cabines acústicas e baristas' },
      { nome: 'aliviadoresDores', tipo: 'string', obrigatorio: false, descricao: 'Como a oferta elimina a dor', exemplo: 'Cabines com isolamento acústico e link redundante 500Mbps' },
      { nome: 'criadoresGanhos', tipo: 'string', obrigatorio: false, descricao: 'Como a oferta gera benefícios extras', exemplo: 'Clube de assinatura com desconto e reserva garantida' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      tarefasCliente: 'Ter um local profissional para trabalhar com café gourmet',
      dores: 'Espaços lotados e sem privacidade',
      ganhos: 'Ambiente aconchegante e bebidas artesanais de alta qualidade',
      produtosServicos: 'Cafeteria Especializada + Estações Individuais de Trabalho',
      aliviadoresDores: 'Controle de volume sonoro e tomadas universais em todas as mesas',
      criadoresGanhos: 'Torra própria de grãos e networking com profissionais'
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
      { nome: 'nomeConcorrente', tipo: 'string', obrigatorio: true, descricao: 'Nome da empresa concorrente', exemplo: 'Cafeteria Central' },
      { nome: 'pontosFortes', tipo: 'string', obrigatorio: false, descricao: 'Vantagens competitivas do concorrente', exemplo: 'Ponto tradicional e grande fluxo de pedestres' },
      { nome: 'pontosFracos', tipo: 'string', obrigatorio: false, descricao: 'Desvantagens ou lacunas', exemplo: 'Grãos comerciais e sem tomadas para notebooks' },
      { nome: 'preco', tipo: 'string', obrigatorio: false, descricao: 'Nível de preço relativo', exemplo: 'Médio' },
      { nome: 'diferencial', tipo: 'string', obrigatorio: false, descricao: 'Nosso diferencial em relação a ele', exemplo: 'Cafés especiais microlote + ambiente focado para trabalho' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      nomeConcorrente: 'Starbucks Shopping',
      pontosFortes: 'Força de marca global e padronização',
      pontosFracos: 'Ambiente barulhento e café com perfil industrial',
      preco: 'Alto',
      diferencial: 'Experiência sensorial artesanal, método v60/aeropress e assentos ergonômicos'
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
      { nome: 'tipo', tipo: 'string', obrigatorio: true, descricao: 'Classificação: "forca" ou "fraqueza"', exemplo: 'forca' },
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Detalhamento do ponto interno', exemplo: 'Baristas certificados e maquinário italiano de ponta' },
      { nome: 'grauImportancia', tipo: 'string', obrigatorio: false, descricao: 'Nível de relevância: Alta, Média ou Baixa', exemplo: 'Alta' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      tipo: 'forca',
      descricao: 'Parceria direta com produtores de cafés premiados do Sul de Minas',
      grauImportancia: 'Alta'
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
      { nome: 'tipo', tipo: 'string', obrigatorio: true, descricao: 'Classificação: "oportunidade" ou "ameaca"', exemplo: 'oportunidade' },
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Fator externo não controlável', exemplo: 'Crescimento de 35% no trabalho híbrido na região' },
      { nome: 'impacto', tipo: 'string', obrigatorio: false, descricao: 'Impacto potencial no negócio', exemplo: 'Alto' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      tipo: 'oportunidade',
      descricao: 'Aumento na busca por cafés especiais e grãos moídos na hora para viagem',
      impacto: 'Alto'
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
      { nome: 'estrategiaDesenvolvimento', tipo: 'string', obrigatorio: false, descricao: 'Ações de Forças + Oportunidades', exemplo: 'Lançar plano mensal para nômades digitais' },
      { nome: 'estrategiaManutencao', tipo: 'string', obrigatorio: false, descricao: 'Ações de Forças + Ameaças', exemplo: 'Contrato de fornecimento de grãos de longo prazo' },
      { nome: 'estrategiaSobrevivencia', tipo: 'string', obrigatorio: false, descricao: 'Ações de Fraquezas + Ameaças', exemplo: 'Manter controle rigoroso de perdas de perecíveis' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      estrategiaDesenvolvimento: 'Aproveitar a equipe qualificada para ministrar workshops de café aos fins de semana',
      estrategiaManutencao: 'Criar promoções matinais para manter fluxo antes do horário comercial'
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
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Item de investimento', exemplo: 'Máquina de Espresso Profissional 2 Grupos' },
      { nome: 'quantidade', tipo: 'number', obrigatorio: true, descricao: 'Quantidade a adquirir', exemplo: 1 },
      { nome: 'valorUnitario', tipo: 'number', obrigatorio: true, descricao: 'Valor unitário em R$', exemplo: 25000 },
      { nome: 'subtotal', tipo: 'number', obrigatorio: false, descricao: 'Subtotal calculado', exemplo: 25000 }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'Moinho de Grãos Sob Demanda Mahlkönig',
      quantidade: 2,
      valorUnitario: 8500,
      subtotal: 17000
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
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Tipo de despesa pré-operacional', exemplo: 'Reforma acústica e elétrica do salão' },
      { nome: 'valor', tipo: 'number', obrigatorio: true, descricao: 'Valor total do gasto em R$', exemplo: 32000 }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'Abertura de empresa, alvarás e projeto de bombeiros',
      valor: 4500
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
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Mercadoria ou insumo inicial', exemplo: 'Grãos de Café Especial Catuaí Amarelo (kg)' },
      { nome: 'quantidade', tipo: 'number', obrigatorio: true, descricao: 'Quantidade inicial', exemplo: 50 },
      { nome: 'valorUnitario', tipo: 'number', obrigatorio: true, descricao: 'Custo unitário em R$', exemplo: 75 }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'Copos ecológicos e embalagens biodegradáveis',
      quantidade: 1000,
      valorUnitario: 1.8
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
      { nome: 'prazoMedioVendas', tipo: 'number', obrigatorio: false, descricao: 'Prazo médio em dias para receber vendas', exemplo: 5 },
      { nome: 'prazoMedioCompras', tipo: 'number', obrigatorio: false, descricao: 'Prazo médio em dias para pagar fornecedores', exemplo: 28 },
      { nome: 'reservaFinanceira', tipo: 'number', obrigatorio: false, descricao: 'Valor da reserva em R$', exemplo: 20000 }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      prazoMedioVendas: 7,
      prazoMedioCompras: 30,
      reservaFinanceira: 25000
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
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Nome do custo fixo', exemplo: 'Aluguel do Ponto Comercial + IPTU' },
      { nome: 'valor', tipo: 'number', obrigatorio: true, descricao: 'Valor mensal em R$', exemplo: 4500 }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'Internet Fibra Dedicada 600MB + Link de Backup',
      valor: 450
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
      { nome: 'idPlano', tipo: 'string', obrigatorio: true, descricao: 'ID do plano', exemplo: ID_PLANO_PADRAO },
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Nome do produto/serviço', exemplo: 'Café Filtrado Especial V60 (300ml)' },
      { nome: 'precoVenda', tipo: 'number', obrigatorio: true, descricao: 'Preço de venda em R$', exemplo: 16.5 },
      { nome: 'custoUnitario', tipo: 'number', obrigatorio: false, descricao: 'Custo dos materiais em R$', exemplo: 4.2 },
      { nome: 'estimativaVendasMes', tipo: 'number', obrigatorio: false, descricao: 'Quantidade mensal projetada', exemplo: 850 }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'Combo Diária Coworking + 2 Cafés Especiais',
      precoVenda: 45,
      custoUnitario: 8.5,
      estimativaVendasMes: 220
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
      { nome: 'descricao', tipo: 'string', obrigatorio: true, descricao: 'Hipótese a validar (máx 200 caracteres)', exemplo: 'Clientes remotos pagam R$ 45 por dia por internet ultra-rápida e café livre' },
      { nome: 'categoria', tipo: 'string', obrigatorio: false, descricao: 'Cliente, Problema ou Solução', exemplo: 'Solução' },
      { nome: 'nivelIncerteza', tipo: 'string', obrigatorio: false, descricao: 'Baixo, Médio ou Alto', exemplo: 'Médio' },
      { nome: 'nivelImportancia', tipo: 'string', obrigatorio: false, descricao: 'Importância para viabilidade', exemplo: 'Alta' }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      descricao: 'Pelo menos 40% dos clientes compram pacotes de grãos moídos após consumir na loja',
      categoria: 'Cliente',
      nivelIncerteza: 'Alto',
      nivelImportancia: 'Alta'
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
      { nome: 'nome', tipo: 'string', obrigatorio: true, descricao: 'Nome da campanha ou canal', exemplo: 'Tráfego Local Instagram Ads' },
      { nome: 'orcamento', tipo: 'number', obrigatorio: false, descricao: 'Investimento em R$', exemplo: 1200 },
      { nome: 'qtdPessoasAlcancadas', tipo: 'number', obrigatorio: false, descricao: 'Alcance topo de funil', exemplo: 15000 },
      { nome: 'qtdPessoasChamadas', tipo: 'number', obrigatorio: false, descricao: 'Cliques ou conversões meio de funil', exemplo: 480 }
    ],
    exemploPayload: {
      idPlano: ID_PLANO_PADRAO,
      nome: 'Google Search "Cafeteria Coworking Perto"',
      orcamento: 800,
      qtdPessoasAlcancadas: 3200,
      qtdPessoasChamadas: 310
    },
    respostaEsperada: {
      msg: 'result',
      id: 'req_16',
      result: 'fv0919283aQq'
    }
  }
];
