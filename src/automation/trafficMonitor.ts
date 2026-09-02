import { InterceptedTrafficEvent } from '../types/pnbox';

export const eventosDeTrafego: InterceptedTrafficEvent[] = [];

export function registrarEventoTrafego(evento: Omit<InterceptedTrafficEvent, 'id' | 'timestamp'>): InterceptedTrafficEvent {
  const novoEvento: InterceptedTrafficEvent = {
    id: 'evt_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    timestamp: new Date().toISOString(),
    ...evento
  };

  eventosDeTrafego.unshift(novoEvento);
  // Manter limite de 250 eventos para evitar estouro de memória
  if (eventosDeTrafego.length > 250) {
    eventosDeTrafego.pop();
  }

  return novoEvento;
}

export function limparEventosTrafego() {
  eventosDeTrafego.length = 0;
}

export function obterEventosTrafego(filtros?: {
  tipo?: string;
  apenasSalvamento?: boolean;
  ferramentaId?: string;
}) {
  let lista = [...eventosDeTrafego];

  if (filtros?.tipo && filtros.tipo !== 'all') {
    lista = lista.filter((e) => e.tipo === filtros.tipo);
  }

  if (filtros?.apenasSalvamento) {
    lista = lista.filter(
      (e) =>
        e.operacaoDetectada?.acao === 'insert' ||
        e.operacaoDetectada?.acao === 'update' ||
        e.operacaoDetectada?.acao === 'save' ||
        ['POST', 'PUT', 'PATCH'].includes(e.metodo)
    );
  }

  if (filtros?.ferramentaId) {
    lista = lista.filter(
      (e) =>
        e.operacaoDetectada?.ferramentaId === filtros.ferramentaId ||
        e.operacaoDetectada?.collection === filtros.ferramentaId
    );
  }

  return lista;
}

/**
 * Registra eventos capturados de exemplo durante a descoberta da ferramenta Cliente - Mercado
 */
export function popularEventosIniciaisDescoberta(idPlano = 'HCOQIkjSk97gGcfGDPb0h') {
  if (eventosDeTrafego.length > 0) return;

  // 1. Evento de Leitura / Subscrição DDP
  registrarEventoTrafego({
    tipo: 'websocket_ddp',
    metodo: 'SUB',
    url: 'wss://pnbox.sebrae.com.br/websocket [segmentacaoMercado.default]',
    status: 101,
    duracaoMs: 42,
    payloadEnviado: {
      msg: 'sub',
      id: 'sub_seg_mercado_01',
      name: 'segmentacaoMercado.default',
      params: [{ idPlano }]
    },
    respostaRecebida: {
      msg: 'ready',
      subs: ['sub_seg_mercado_01']
    },
    operacaoDetectada: {
      ferramentaId: 'segmentacaoMercado',
      acao: 'sub',
      collection: 'segmentacaoMercado'
    }
  });

  // 2. Evento de Salvamento Real (insert) em Cliente - Mercado
  registrarEventoTrafego({
    tipo: 'websocket_ddp',
    metodo: 'METHOD_CALL',
    url: 'wss://pnbox.sebrae.com.br/websocket [segmentacaoMercado.insert]',
    status: 200,
    duracaoMs: 65,
    payloadEnviado: {
      msg: 'method',
      method: 'segmentacaoMercado.insert',
      params: [
        {
          idPlano,
          descricao: 'Consumidores de Café Especial e Trabalho Remoto',
          variavel1: 'Idade 22-38 anos com renda média-alta',
          variavel1Oposto: 'Consumidores de commodities',
          variavel2: 'Busca ambiente com Wi-Fi de alta velocidade e tomada',
          variavel2Oposto: 'Apenas consumo rápido balcão',
          segmento: 'B2C Premium'
        }
      ],
      id: 'req_call_881'
    },
    respostaRecebida: {
      msg: 'result',
      id: 'req_call_881',
      result: 'doc_seg_9192837'
    },
    operacaoDetectada: {
      ferramentaId: 'segmentacaoMercado',
      acao: 'insert',
      collection: 'segmentacaoMercado'
    }
  });

  // 3. Evento de Carregamento de Status de Conclusão
  registrarEventoTrafego({
    tipo: 'websocket_ddp',
    metodo: 'METHOD_CALL',
    url: 'wss://pnbox.sebrae.com.br/websocket [planoNegocio.statusConclusaoPlanoNegocio]',
    status: 200,
    duracaoMs: 38,
    payloadEnviado: {
      msg: 'method',
      method: 'planoNegocio.statusConclusaoPlanoNegocio',
      params: [idPlano],
      id: 'req_status_01'
    },
    respostaRecebida: {
      msg: 'result',
      id: 'req_status_01',
      result: 'COMPLETO'
    },
    operacaoDetectada: {
      ferramentaId: 'planoNegocio',
      acao: 'statusConclusao',
      collection: 'planoNegocio'
    }
  });

  // 4. Evento de Salvamento em Gerador de Personas
  registrarEventoTrafego({
    tipo: 'websocket_ddp',
    metodo: 'METHOD_CALL',
    url: 'wss://pnbox.sebrae.com.br/websocket [geradorPersonas.insert]',
    status: 200,
    duracaoMs: 58,
    payloadEnviado: {
      msg: 'method',
      method: 'geradorPersonas.insert',
      params: [
        {
          idPlano,
          nome: 'Lucas Mendes',
          idade: '31 anos',
          profissao: 'Engenheiro de Software Remoto',
          renda: 'R$ 12.000,00',
          habitos: 'Consome cafés especiais, assina newsletters tech',
          dores: 'Barulho excessivo em cafeterias comuns e conexão instável'
        }
      ],
      id: 'req_call_882'
    },
    respostaRecebida: {
      msg: 'result',
      id: 'req_call_882',
      result: 'doc_persona_00291'
    },
    operacaoDetectada: {
      ferramentaId: 'geradorPersonas',
      acao: 'insert',
      collection: 'geradorPersonas'
    }
  });

  // 5. Evento de Salvamento em Investimento Fixo
  registrarEventoTrafego({
    tipo: 'websocket_ddp',
    metodo: 'METHOD_CALL',
    url: 'wss://pnbox.sebrae.com.br/websocket [investimentoFixo.insert]',
    status: 200,
    duracaoMs: 47,
    payloadEnviado: {
      msg: 'method',
      method: 'investimentoFixo.insert',
      params: [
        {
          idPlano,
          descricao: 'Máquina de Espresso Profissional La Marzocco',
          quantidade: 1,
          valorUnitario: 38000,
          subtotal: 38000
        }
      ],
      id: 'req_call_883'
    },
    respostaRecebida: {
      msg: 'result',
      id: 'req_call_883',
      result: 'doc_inv_fixo_7712'
    },
    operacaoDetectada: {
      ferramentaId: 'investimentoFixo',
      acao: 'insert',
      collection: 'investimentoFixo'
    }
  });
}
