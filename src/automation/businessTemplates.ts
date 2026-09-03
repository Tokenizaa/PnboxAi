import { ID_PLANO_PADRAO } from './schemaCatalog';

export interface BusinessTemplate {
  id: string;
  nome: string;
  setor: string;
  descricao: string;
  planoId: string;
  dados: Record<string, Record<string, unknown>[]>;
}

export const TEMPLATES_NEGOCIO: BusinessTemplate[] = [
  {
    id: 'defesai_adeus_multas',
    nome: 'Defesai/AdeusMultas',
    setor: 'Legaltech & Soluções Administrativas de Trânsito',
    descricao: 'Plataforma SaaS com IA para elaboração e gestão de recursos e defesas de multas de trânsito (NIC e pessoa física).',
    planoId: ID_PLANO_PADRAO,
    dados: {
      segmentacaoMercado: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Segmentação 1',
          detalheVisual: 'Frotistas e PMEs com multas NIC | Condutores pessoa física autuados | Motoristas de app e entregadores | Advogados de direito de trânsito',
          variavel1: 'PMEs e empresas com frotas comerciais próprias sofrendo multas NIC',
          variavel1Oposto: 'Empresas sem veículos próprios',
          variavel2: 'Condutores pessoa física autuados buscando defesa técnica ágil',
          variavel2Oposto: 'Condutores que pagam sem contestar',
          segmento: 'B2B Frotas & B2C Motoristas'
        }
      ],
      geradorPersonas: [
        {
          idPlano: ID_PLANO_PADRAO,
          nome: 'Carlos Eduardo Mendes',
          idade: '41 anos',
          profissao: 'Gestor de Frotas / PME de Logística',
          escolaridade: 'Superior em Administração',
          renda: 'R$ 9.800,00',
          habitos: 'Gerencia 25 veículos utilitários; monitora custos com combustível e multas no Excel.',
          dores: 'Multas por Não Indicação do Condutor (NIC) que duplicam de valor gerando prejuízos severos.',
          objetivos: 'Automatizar as indicações de condutor e ter defesas prévias fundamentadas no CTB em menos de 10 minutos.'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          nome: 'Juliana Vasconcelos',
          idade: '34 anos',
          profissao: 'Motorista de Aplicativo & Autônoma',
          escolaridade: 'Ensino Médio Completo',
          renda: 'R$ 4.200,00',
          habitos: 'Dirige 10h por dia em grandes centros urbanos; depende da CNH ativa para seu sustento.',
          dores: 'Risco iminente de suspensão da CNH por acúmulo de pontos indevidos de fiscalização eletrônica falha.',
          objetivos: 'Recorrer de autuações com embasamento jurídico rápido e preço justo sem burocracia de despachante.'
        }
      ],
      jornadaCliente: [
        {
          idPlano: ID_PLANO_PADRAO,
          etapa: 'Notificação da Autuação',
          acoes: 'Recebe notificação de penalidade no app da Carteira Digital ou carta do Detran.',
          pontosContato: 'Google Search ("como recorrer multa de velocidade"), Instagram, WhatsApp.',
          emocoes: 'Frustração, senso de injustiça e urgência antes do prazo fatal.',
          oportunidadesMelhoria: 'Calculadora gratuita de risco de suspensão da CNH na landing page.'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          etapa: 'Geração do Recurso com IA',
          acoes: 'Faz upload da foto da notificação ou digita o auto; IA analisa inconsistências do auto e gera a minuta.',
          pontosContato: 'Plataforma web Defesai, WhatsApp bot com OCR.',
          emocoes: 'Alívio ao receber um recurso técnico completo com artigos do CTB e jurisprudência.',
          oportunidadesMelhoria: 'Protocolo digital automatizado junto ao órgão autuador via integração Gov.br.'
        }
      ],
      propostaValor: [
        {
          idPlano: ID_PLANO_PADRAO,
          tarefasCliente: 'Anular multas indevidas e evitar acúmulo de pontos na CNH e multas NIC milionárias.',
          dores: 'Despachantes caros e lentos, modelos genéricos da internet que são indeferidos sumariamente.',
          ganhos: 'Economia financeira, preservação do direito de dirigir e tranquilidade para trabalhar.',
          produtosServicos: 'SaaS com IA especializada em Código de Trânsito Brasileiro + Painel de Gestão de Frotas.',
          aliviadoresDores: 'Recursos gerados em 2 minutos com teses jurídicas personalizadas e jurisprudência atualizada.',
          criadoresGanhos: 'Redução de até 80% nos custos de multas corporativas com alertas preditivos de prazos.'
        }
      ],
      analiseConcorrencia: [
        {
          idPlano: ID_PLANO_PADRAO,
          nomeConcorrente: 'Despachantes Tradicionais',
          pontosFortes: 'Atendimento presencial e proximidade física com órgãos de trânsito.',
          pontosFracos: 'Valores abusivos (R$ 300+ por recurso), lentidão e processos manuais.',
          preco: 'Alto',
          diferencial: 'Preço 5x mais acessível, geração instantânea com IA e suporte 24/7 online.'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          nomeConcorrente: 'Sites de Modelos Prontos Word/PDF',
          pontosFortes: 'Preço muito baixo ou gratuito.',
          pontosFracos: 'Textos genéricos e desatualizados, quase 100% de indeferimento no JARI.',
          preco: 'Baixo',
          diferencial: 'Argumentação técnica customizada que aponta vícios formais reais do auto de infração.'
        }
      ],
      forcasFraquezas: [
        {
          idPlano: ID_PLANO_PADRAO,
          tipo: 'forca',
          descricao: 'Algoritmo proprietário de análise de consistência de autos de infração com IA generativa.',
          grauImportancia: 'Alta'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          tipo: 'forca',
          descricao: 'Parcerias com associações de motoristas de aplicativo e locadoras de veículos.',
          grauImportancia: 'Alta'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          tipo: 'fraqueza',
          descricao: 'Necessidade de constante atualização regulatória perante resoluções do CONTRAN.',
          grauImportancia: 'Média'
        }
      ],
      oportunidadesAmeacas: [
        {
          idPlano: ID_PLANO_PADRAO,
          tipo: 'oportunidade',
          descricao: 'Expansão de radares inteligentes e sistemas automáticos de fiscalização em todo o território nacional.',
          impacto: 'Alto'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          tipo: 'ameaca',
          descricao: 'Digitalização de processos pelos Detrans dificultando integrações não oficiais.',
          impacto: 'Médio'
        }
      ],
      analiseSwot: [
        {
          idPlano: ID_PLANO_PADRAO,
          estrategiaDesenvolvimento: 'Acelerar integrações com sistemas de gestão de frotas para capturar clientes B2B recorrentes.',
          estrategiaManutencao: 'Manter assessoria jurídica especializada para homologar novas teses de defesa em conformidade com o CTB.',
          estrategiaSobrevivencia: 'Oferecer garantias ou créditos para recursos julgados improcedentes na primeira instância.'
        }
      ],
      investimentoFixo: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Servidores em Nuvem, Workstations de Desenvolvimento e Infraestrutura de Segurança',
          quantidade: 1,
          valorUnitario: 22000,
          subtotal: 22000
        }
      ],
      investimentoPreOperacional: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Desenvolvimento do MVP, Registro de Marca no INPI e Assessoria Jurídica Regulatória',
          valor: 18000
        }
      ],
      custoFixo: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Infraestrutura Cloud (APIs Gemini, AWS, Vercel) e Ferramentas SaaS',
          valor: 3200
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Equipe de Suporte e Monitoramento Jurídico',
          valor: 7500
        }
      ],
      produtoServico: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Recurso Individual com IA (Pessoa Física)',
          precoVenda: 49.90,
          custoUnitario: 4.50,
          estimativaVendasMes: 350
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Plano Assinatura Gestão de Frota PME (Até 30 veículos)',
          precoVenda: 490.00,
          custoUnitario: 35.00,
          estimativaVendasMes: 45
        }
      ],
      quadroExperimentacao: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Motoristas autuados preferem preencher dados via WhatsApp do que instalar um novo aplicativo.',
          categoria: 'Cliente',
          nivelIncerteza: 'Médio',
          nivelImportancia: 'Alta'
        }
      ],
      funilVendas: [
        {
          idPlano: ID_PLANO_PADRAO,
          nome: 'Google Search "Recurso Multa NIC"',
          orcamento: 1500,
          qtdPessoasAlcancadas: 8500,
          qtdPessoasChamadas: 920
        }
      ]
    }
  },
  {
    id: 'cafeteria_coworking',
    nome: 'Cafeteria Especial & Coworking Híbrido',
    setor: 'Alimentos & Bebidas / Serviços',
    descricao: 'Espaço integrado para profissionais remotos com grãos especiais microlote, cabines acústicas e cardápio artesanal.',
    planoId: ID_PLANO_PADRAO,
    dados: {
      segmentacaoMercado: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Profissionais Remotos e Nômades Digitais',
          variavel1: 'Idade 24-42 anos, renda superior a R$ 6.000',
          variavel1Oposto: 'Consumo rápido sem permanência',
          variavel2: 'Necessidade de Wi-Fi de alta estabilidade e ambiente silencioso',
          variavel2Oposto: 'Bares e restaurantes ruidosos',
          segmento: 'B2C / B2B Freelancers'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Entusiastas de Cafés Especiais e Métodos Filtrados',
          variavel1: 'Busca por cafés pontuados acima de 84 pontos SCA',
          variavel1Oposto: 'Café comercial tradicional',
          variavel2: 'Consumo no local e compra de pacotes em grão para casa',
          variavel2Oposto: 'Apenas café expresso rápido',
          segmento: 'Consumidores Gourmet'
        }
      ],
      geradorPersonas: [
        {
          idPlano: ID_PLANO_PADRAO,
          nome: 'Lucas Silveira',
          idade: '32 anos',
          profissao: 'Tech Lead / Engenheiro de Software',
          escolaridade: 'Superior Completo em Ciência da Computação',
          renda: 'R$ 14.500,00',
          habitos: 'Trabalha em casa 3 dias e fora 2 dias por semana; adepto de cafés V60 e Aeropress.',
          dores: 'Falta de tomadas nas cafeterias comuns, Wi-Fi caindo durante reuniões e barulho excessivo.',
          objetivos: 'Ter um ponto de apoio confortável com ótimo café e infraestrutura para reuniões sem ruídos.'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          nome: 'Camila Rocha',
          idade: '28 anos',
          profissao: 'Consultora de Marketing & UX',
          escolaridade: 'Pós-graduação em Design Estratégico',
          renda: 'R$ 8.200,00',
          habitos: 'Faz reuniões presenciais com clientes, produz conteúdo no Instagram e consome lanches saudáveis.',
          dores: 'Espaços sem identidade visual agradável ou com atendimento impessoal.',
          objetivos: 'Encontrar um ambiente inspirador para levar clientes e desfrutar de cafés diferenciados.'
        }
      ],
      jornadaCliente: [
        {
          idPlano: ID_PLANO_PADRAO,
          etapa: 'Descoberta & Atração',
          acoes: 'Pesquisa no Google Maps por "cafés para trabalhar perto de mim" ou vê reels de barista no Instagram.',
          pontosContato: 'Google Meu Negócio, Instagram (@cafe.cowork), Recomendações de amigos.',
          emocoes: 'Curioso e em busca de confirmação da qualidade do ambiente.',
          oportunidadesMelhoria: 'Manter fotos do salão com notebooks e teste de velocidade do Wi-Fi nos destaques.'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          etapa: 'Experiência & Consumo',
          acoes: 'Chega, escolhe mesa com tomada, faz pedido via QR Code e trabalha por 3 a 4 horas.',
          pontosContato: 'Totem digital, atendimento no balcão, rede Wi-Fi dedicada.',
          emocoes: 'Focado, produtivo e satisfeito com o sabor do café.',
          oportunidadesMelhoria: 'Oferecer água filtrada como cortesia e combo de refil de café filtrado.'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          etapa: 'Retenção & Fidelização',
          acoes: 'Acumula pontos no clube de fidelidade digital e compra pacote de café moído na hora.',
          pontosContato: 'WhatsApp de pós-venda, cartão fidelidade digital, convite para cuppings.',
          emocoes: 'Sensação de pertencimento a uma comunidade.',
          oportunidadesMelhoria: 'Criar assinatura mensal de coworking com 10% de desconto em todo o cardápio.'
        }
      ],
      propostaValor: [
        {
          idPlano: ID_PLANO_PADRAO,
          tarefasCliente: 'Trabalhar com foco fora de casa e realizar reuniões sem ruído de fundo.',
          dores: 'Conexões lentas, ausência de tomadas, café industrial amargo e mesas desconfortáveis.',
          ganhos: 'Produtividade elevada, grãos de alta pontuação, assentos ergonômicos e ambiente acolhedor.',
          produtosServicos: 'Cafeteria Especializada + Estações Ergonômicas de Trabalho + Cabines de Call.',
          aliviadoresDores: 'Internet fibra redundante de 600 Mbps, isolamento acústico e tomadas 110/220V em 100% das mesas.',
          criadoresGanhos: 'Torrefação artesanal semanal, baristas premiados e eventos de networking profissional.'
        }
      ],
      analiseConcorrencia: [
        {
          idPlano: ID_PLANO_PADRAO,
          nomeConcorrente: 'Rede de Franquia Starbucks',
          pontosFortes: 'Força de marca internacional e grande fluxo em shoppings.',
          pontosFracos: 'Ambiente ruidoso, café comercial ultra-torrado e poucas tomadas disponíveis.',
          preco: 'Alto',
          diferencial: 'Cafés microlote rastreáveis, preparo artesanal e foco exclusivo em trabalho tranquilo.'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          nomeConcorrente: 'Padaria Artesanal Tradicional',
          pontosFortes: 'Mix amplo de pães e ponto comercial antigo.',
          pontosFracos: 'Rotatividade rápida, sem tomadas para notebooks e Wi-Fi público instável.',
          preco: 'Médio',
          diferencial: 'Estrutura preparada para permanência de 3+ horas sem pressão por consumo contínuo.'
        }
      ],
      forcasFraquezas: [
        {
          idPlano: ID_PLANO_PADRAO,
          tipo: 'forca',
          descricao: 'Baristas certificados e maquinário italiano La Marzocco de alta precisão.',
          grauImportancia: 'Alta'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          tipo: 'forca',
          descricao: 'Parceria direta e sem intermediários com fazendas premiadas da Mantiqueira de Minas.',
          grauImportancia: 'Alta'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          tipo: 'fraqueza',
          descricao: 'Marca nova no mercado local sem histórico prévio de vendas.',
          grauImportancia: 'Média'
        }
      ],
      oportunidadesAmeacas: [
        {
          idPlano: ID_PLANO_PADRAO,
          tipo: 'oportunidade',
          descricao: 'Consolidação do modelo híbrido de trabalho em mais de 60% das empresas de serviços na cidade.',
          impacto: 'Alto'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          tipo: 'oportunidade',
          descricao: 'Crescimento de 28% no consumo domiciliar de cafés em grão especiais moídos na hora.',
          impacto: 'Médio'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          tipo: 'ameaca',
          descricao: 'Alta oscilação do preço da saca de café verde no mercado internacional de commodities.',
          impacto: 'Médio'
        }
      ],
      analiseSwot: [
        {
          idPlano: ID_PLANO_PADRAO,
          estrategiaDesenvolvimento: 'Utilizar a expertise dos baristas para oferecer workshops mensais de café filtrado e cupping sensorial.',
          estrategiaManutencao: 'Firmar contratos de fornecimento futuro de grãos com os produtores para travar custos anuais.',
          estrategiaSobrevivencia: 'Criar promoções e combos matinais para alavancar consumo antes das 10h da manhã.'
        }
      ],
      investimentoFixo: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Máquina de Espresso Profissional 2 Grupos La Marzocco',
          quantidade: 1,
          valorUnitario: 38000,
          subtotal: 38000
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Moinhos Profissionais On-Demand (Mahlkönig & Mazzer)',
          quantidade: 2,
          valorUnitario: 9500,
          subtotal: 19000
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Mesas Ergonômicas com Calhas Elétricas e Cadeiras NR17',
          quantidade: 12,
          valorUnitario: 850,
          subtotal: 10200
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Cabines Acústicas Individuais para Chamadas / Videoconferência',
          quantidade: 2,
          valorUnitario: 7500,
          subtotal: 15000
        }
      ],
      investimentoPreOperacional: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Reforma de infraestrutura hidráulica, elétrica e tratamento acústico',
          valor: 28000
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Identidade visual, cardápio digital, sinalização e uniformes',
          valor: 5500
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Abertura de empresa, alvarás de funcionamento e licença sanitária',
          valor: 3200
        }
      ],
      estoqueInicial: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Café Especial em Grão Verde e Torrado (Lotes Catuaí e Bourbon)',
          quantidade: 80,
          valorUnitario: 65
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Leites Vegetais (Aveia, Amêndoas) e Leite Tipo A',
          quantidade: 150,
          valorUnitario: 8.5
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Embalagens Biodegradáveis, Copos Térmicos e Guardanapos',
          quantidade: 2000,
          valorUnitario: 1.4
        }
      ],
      capitalGiro: [
        {
          idPlano: ID_PLANO_PADRAO,
          prazoMedioVendas: 4,
          prazoMedioCompras: 28,
          reservaFinanceira: 22000
        }
      ],
      custoFixo: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Aluguel do Imóvel Comercial + IPTU',
          valor: 4800
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Energia Elétrica Comercial (Trifásica)',
          valor: 1400
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Internet Fibra 600 Mbps Dedicada com Link Redundante',
          valor: 420
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Contabilidade e Software de Gestão Fiscal/ERP',
          valor: 750
        }
      ],
      produtoServico: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Café Espresso Simples / Duplo (Grãos Microlote 86+)',
          precoVenda: 9.5,
          custoUnitario: 1.8,
          estimativaVendasMes: 1100
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Café Filtrado Especial Métodos (V60 / Kalita / Aeropress 300ml)',
          precoVenda: 16.0,
          custoUnitario: 3.4,
          estimativaVendasMes: 750
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Combo Diária Coworking + 2 Bebidas Especiais + Wi-Fi Full',
          precoVenda: 45.0,
          custoUnitario: 7.5,
          estimativaVendasMes: 260
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Pacote 250g Grãos Especiais Moídos na Hora para Levar',
          precoVenda: 38.0,
          custoUnitario: 18.0,
          estimativaVendasMes: 140
        }
      ],
      quadroExperimentacaoHipotese: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Clientes de trabalho remoto gastam em média 35% mais em lanches se tiverem tomada na mesa.',
          categoria: 'Cliente',
          nivelIncerteza: 'Médio',
          nivelImportancia: 'Alta'
        },
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Pelo menos 25% dos frequentadores do coworking comprarão pacotes de grãos para consumo em casa.',
          categoria: 'Solução',
          nivelIncerteza: 'Alto',
          nivelImportancia: 'Média'
        }
      ],
      funilVendas: [
        {
          idPlano: ID_PLANO_PADRAO,
          nome: 'Google Search & Google Maps Local Ads',
          orcamento: 650,
          qtdPessoasAlcancadas: 8500,
          qtdPessoasChamadas: 520
        },
        {
          idPlano: ID_PLANO_PADRAO,
          nome: 'Instagram Reels sobre Bastidores e Métodos de Café',
          orcamento: 450,
          qtdPessoasAlcancadas: 18000,
          qtdPessoasChamadas: 840
        }
      ]
    }
  },
  {
    id: 'saas_b2b',
    nome: 'Plataforma SaaS B2B de Gestão de Fornecedores',
    setor: 'Tecnologia / Software',
    descricao: 'Solução em nuvem para automação de cotações, homologação de fornecedores e compliance fiscal para PMEs.',
    planoId: ID_PLANO_PADRAO,
    dados: {
      segmentacaoMercado: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Diretores de Compras e CFOs de PMEs Industriais',
          variavel1: 'Empresas com 20 a 150 funcionários',
          variavel1Oposto: 'Grandes corporações com SAP instalado',
          variavel2: 'Processo de cotação 100% manual em planilhas',
          variavel2Oposto: 'Sistemas legados integrados',
          segmento: 'B2B Mid-Market'
        }
      ],
      geradorPersonas: [
        {
          idPlano: ID_PLANO_PADRAO,
          nome: 'Roberto Antunes',
          idade: '44 anos',
          profissao: 'Gerente de Suprimentos & Logística',
          escolaridade: 'Graduação em Engenharia de Produção',
          renda: 'R$ 16.000,00',
          habitos: 'Gerencia 40 fornecedores ativos em planilhas Excel desatualizadas.',
          dores: 'Erros em pedidos, perda de prazo de entrega e falta de histórico de preços negociados.',
          objetivos: 'Reduzir custos em 12% e automatizar aprovações de ordens de compra em minutos.'
        }
      ],
      jornadaCliente: [
        {
          idPlano: ID_PLANO_PADRAO,
          etapa: 'Geração de Lead e Demonstração',
          acoes: 'Baixa planilha de cotação gratuita no blog e agenda demo com consultor.',
          pontosContato: 'LinkedIn Ads, Webinar ao vivo, Landing page.',
          emocoes: 'Aliviado ao ver a facilidade de implantação.',
          oportunidadesMelhoria: 'Oferecer free trial de 14 dias sem necessidade de cartão de crédito.'
        }
      ],
      propostaValor: [
        {
          idPlano: ID_PLANO_PADRAO,
          tarefasCliente: 'Cotar com múltiplos fornecedores e homologar certidões fiscais.',
          dores: 'Tempo perdido em e-mails e risco de contratar fornecedores com débitos fiscais.',
          ganhos: 'Economia média de 15% nas compras e conformidade 100% garantida.',
          produtosServicos: 'Software Web em Nuvem + API de Integração com ERP + Consulta Automática de CNPJ.',
          aliviadoresDores: 'Disparo de cotações com 1 clique para múltiplos fornecedores simultaneamente.',
          criadoresGanhos: 'Dashboard de economia gerada (Saving Realizado) exportável para a diretoria.'
        }
      ],
      analiseConcorrencia: [
        {
          idPlano: ID_PLANO_PADRAO,
          nomeConcorrente: 'Sistemas ERP Legados (Totvs/Senior)',
          pontosFortes: 'Presença consolidada nas empresas.',
          pontosFracos: 'Módulos de compras complexos, caros e pouco intuitivos para fornecedores externos.',
          preco: 'Muito Alto',
          diferencial: 'Interface moderna, implantação em menos de 48 horas e sem taxa de setup.'
        }
      ],
      forcasFraquezas: [
        {
          idPlano: ID_PLANO_PADRAO,
          tipo: 'forca',
          descricao: 'Tecnologia nativa em nuvem com alta escalabilidade e baixo custo marginal por usuário.',
          grauImportancia: 'Alta'
        }
      ],
      oportunidadesAmeacas: [
        {
          idPlano: ID_PLANO_PADRAO,
          tipo: 'oportunidade',
          descricao: 'Aceleração da transformação digital e demanda por redução de custos operacionais.',
          impacto: 'Alto'
        }
      ],
      analiseSwot: [
        {
          idPlano: ID_PLANO_PADRAO,
          estrategiaDesenvolvimento: 'Integrar a plataforma diretamente com os principais emissores de NF-e do Brasil.',
          estrategiaManutencao: 'Manter segurança da informação e conformidade estrita com a LGPD.',
          estrategiaSobrevivencia: 'Oferecer planos de assinatura mensais flexíveis sem fidelidade contratual.'
        }
      ],
      investimentoFixo: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Servidores de Desenvolvimento e Estações de Trabalho dos Devs',
          quantidade: 4,
          valorUnitario: 6500,
          subtotal: 26000
        }
      ],
      investimentoPreOperacional: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Desenvolvimento do MVP e arquitetura inicial de segurança',
          valor: 35000
        }
      ],
      estoqueInicial: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Licenças de APIs de Consulta Cadastral e Certificados SSL',
          quantidade: 1,
          valorUnitario: 2500
        }
      ],
      capitalGiro: [
        {
          idPlano: ID_PLANO_PADRAO,
          prazoMedioVendas: 30,
          prazoMedioCompras: 30,
          reservaFinanceira: 40000
        }
      ],
      custoFixo: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Infraestrutura Cloud (AWS / Google Cloud) e Banco de Dados',
          valor: 1800
        }
      ],
      produtoServico: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Assinatura Plano Pro (Até 5 compradores e cotações ilimitadas)',
          precoVenda: 490.0,
          custoUnitario: 45.0,
          estimativaVendasMes: 35
        }
      ],
      quadroExperimentacaoHipotese: [
        {
          idPlano: ID_PLANO_PADRAO,
          descricao: 'Empresas industriais fecham contrato mais rápido após ver o cálculo de economia em uma demo.',
          categoria: 'Problema',
          nivelIncerteza: 'Baixo',
          nivelImportancia: 'Alta'
        }
      ],
      funilVendas: [
        {
          idPlano: ID_PLANO_PADRAO,
          nome: 'Outbound SDR via LinkedIn Sales Navigator',
          orcamento: 1500,
          qtdPessoasAlcancadas: 3000,
          qtdPessoasChamadas: 180
        }
      ]
    }
  }
];
