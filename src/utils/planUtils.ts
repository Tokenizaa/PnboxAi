import { PlanoCriadoInfo } from '../types/pnbox';

// Compatibilidade de tipos: não existe mais um plano padrão/fictício.
// Um ID de plano só é válido quando veio do PNBOX ou foi explicitamente informado pelo usuário.
export const ID_PLANO_PADRAO_SISTEMA = '';
export const PLANOS_EXEMPLO_INICIAIS: PlanoCriadoInfo[] = [];

let planosPnboxEmMemoria: PlanoCriadoInfo[] = [];

/** Extrai um ID de plano de uma URL/ID explícito. Nunca inventa um ID. */
export function extrairIdPlano(entrada: string): string {
  if (!entrada?.trim()) return '';
  const trimmed = entrada.trim();

  const urlMatch = trimmed.match(/pnbox\.sebrae\.com\.br\/(?:planoNegocio\/)?ferramentas\/([a-zA-Z0-9_-]+)/i);
  if (urlMatch?.[1]) return urlMatch[1];

  const planoMatch = trimmed.match(/pnbox\.sebrae\.com\.br\/(?:planoNegocio|plano)\/([a-zA-Z0-9_-]+)/i);
  if (planoMatch?.[1] && planoMatch[1] !== 'ferramentas') return planoMatch[1];

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsedUrl = new URL(trimmed);
      const segments = parsedUrl.pathname.split('/').filter(Boolean);
      const fIdx = segments.indexOf('ferramentas');
      if (fIdx !== -1 && segments[fIdx + 1]) return segments[fIdx + 1];
      const lastSeg = segments[segments.length - 1];
      return /^[a-zA-Z0-9_-]{3,60}$/.test(lastSeg || '') ? lastSeg : '';
    } catch {
      return '';
    }
  }

  return trimmed;
}

export function validarIdPlano(id: string): boolean {
  if (!id) return false;
  const clean = extrairIdPlano(id);
  return /^[a-zA-Z0-9_-]{3,60}$/.test(clean);
}

/**
 * Retorna somente planos obtidos do PNBOX durante a sessão atual.
 * Não lê localStorage e não injeta exemplos/fallbacks.
 */
export function carregarPlanosSalvos(): PlanoCriadoInfo[] {
  return [...planosPnboxEmMemoria];
}

/** Atualiza apenas o cache transitório com dados que já vieram do PNBOX. */
export function salvarPlanosSincronizados(planos: PlanoCriadoInfo[]): void {
  planosPnboxEmMemoria = planos.filter(p => validarIdPlano(p.idPlano));
}

/**
 * Concilia PNBOX com enriquecimento local SOMENTE para IDs que existem no PNBOX.
 * Planos que existem apenas localmente são descartados.
 */
export function conciliarPlanosBidirecional(
  remotos: PlanoCriadoInfo[],
  locais: PlanoCriadoInfo[]
): PlanoCriadoInfo[] {
  const locaisPorId = new Map(locais.map(p => [p.idPlano, p]));
  const agora = new Date().toISOString();

  const resultado = remotos
    .filter(r => validarIdPlano(r.idPlano))
    .map(r => {
      const local = locaisPorId.get(r.idPlano);
      return {
        ...r,
        ...(local ? {
          pesquisaMercado: local.pesquisaMercado,
          dados14Ferramentas: local.dados14Ferramentas
        } : {}),
        sincronizadoPnbox: true,
        ultimaSincronizacao: agora
      };
    });

  salvarPlanosSincronizados(resultado);
  return resultado;
}

/**
 * Mantém compatibilidade com componentes antigos, mas apenas em memória.
 * Persistência local de planos foi removida para impedir divergência com PNBOX.
 */
export function salvarPlanoNoHistorico(plano: PlanoCriadoInfo): PlanoCriadoInfo[] {
  if (!validarIdPlano(plano.idPlano)) throw new Error('Não é permitido salvar plano sem ID real do PNBOX.');
  const atuais = carregarPlanosSalvos();
  const index = atuais.findIndex(p => p.idPlano === plano.idPlano);
  if (index >= 0) atuais[index] = { ...atuais[index], ...plano };
  else atuais.unshift(plano);
  salvarPlanosSincronizados(atuais);
  return atuais;
}

/** Remove apenas do cache transitório; não afirma que o plano foi excluído do PNBOX. */
export function removerPlanoDoHistorico(idPlano: string): PlanoCriadoInfo[] {
  const filtrados = carregarPlanosSalvos().filter(p => p.idPlano !== idPlano);
  salvarPlanosSincronizados(filtrados);
  return filtrados;
}
