import { randomUUID } from 'crypto';
import { InterceptedTrafficEvent } from '../types/pnbox';

/** Eventos de tráfego observados durante operações reais. Nunca contém eventos pré-fabricados. */
export const eventosDeTrafego: InterceptedTrafficEvent[] = [];

export function registrarEventoTrafego(evento: Omit<InterceptedTrafficEvent, 'id' | 'timestamp'>): InterceptedTrafficEvent {
  const novoEvento: InterceptedTrafficEvent = {
    id: `evt_${randomUUID()}`,
    timestamp: new Date().toISOString(),
    ...evento
  };
  eventosDeTrafego.unshift(novoEvento);
  if (eventosDeTrafego.length > 250) eventosDeTrafego.pop();
  return novoEvento;
}

export function limparEventosTrafego(): void { eventosDeTrafego.length = 0; }

export function obterEventosTrafego(filtros?: {
  tipo?: string;
  apenasSalvamento?: boolean;
  ferramentaId?: string;
}) {
  let lista = [...eventosDeTrafego];
  if (filtros?.tipo && filtros.tipo !== 'all') lista = lista.filter((e) => e.tipo === filtros.tipo);
  if (filtros?.apenasSalvamento) {
    lista = lista.filter((e) =>
      e.operacaoDetectada?.acao === 'insert' ||
      e.operacaoDetectada?.acao === 'update' ||
      e.operacaoDetectada?.acao === 'save' ||
      ['POST', 'PUT', 'PATCH'].includes(e.metodo)
    );
  }
  if (filtros?.ferramentaId) {
    lista = lista.filter((e) =>
      e.operacaoDetectada?.ferramentaId === filtros.ferramentaId ||
      e.operacaoDetectada?.collection === filtros.ferramentaId
    );
  }
  return lista;
}

/**
 * Compatibilidade legada: eventos de descoberta sintéticos foram removidos.
 * O monitor só pode ser alimentado por registrarEventoTrafego() após uma operação real.
 */
export function popularEventosIniciaisDescoberta(): void { /* intencionalmente vazio */ }
