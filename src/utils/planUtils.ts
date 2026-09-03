import { PlanoCriadoInfo } from '../types/pnbox';

const STORAGE_KEY = 'pnbox_saved_plans';

export const ID_PLANO_PADRAO_SISTEMA = 'HCOQIkjSk97gGcfGDPb0h';

export const PLANOS_EXEMPLO_INICIAIS: PlanoCriadoInfo[] = [
  {
    idPlano: ID_PLANO_PADRAO_SISTEMA,
    nomePlano: 'Defesai/AdeusMultas',
    setor: 'Legaltech & Gestão de Multas de Trânsito',
    descricao: 'Automação inteligente para defesas de multas de trânsito NIC para frotas e pessoas físicas.',
    cidadeUf: 'Brasil / Nacional',
    criadoEm: new Date(Date.now() - 3600000 * 72).toISOString(),
    status: 'preenchido_completo',
    metodoCriacao: 'ddp_direct',
    ferramentasPreenchidas: 14,
    categoriaObjetivo: 'Criar um novo negócio'
  },
  {
    idPlano: 'tokeniza_contratos',
    nomePlano: 'Tokeniza Contratos Inteligentes',
    setor: 'Fintech & Web3 / RWA',
    descricao: 'Auxílio na gestão, tokenização de ativos reais e formalização descentralizada de contratos.',
    cidadeUf: 'São Paulo / SP',
    criadoEm: new Date(Date.now() - 3600000 * 48).toISOString(),
    status: 'preenchido_completo',
    metodoCriacao: 'ddp_direct',
    ferramentasPreenchidas: 14,
    categoriaObjetivo: 'Auxiliar na gestão de negócio'
  },
  {
    idPlano: 'weedness_cbd',
    nomePlano: 'WeedNess',
    setor: 'Saúde, Bem-Estar & Fitoterápicos',
    descricao: 'Produtos fitoterápicos naturais de alta pureza, autocuidado e bem-estar integrativo.',
    cidadeUf: 'Florianópolis / SC',
    criadoEm: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'criado_pnbox_ddp',
    metodoCriacao: 'ddp_direct',
    ferramentasPreenchidas: 14,
    categoriaObjetivo: 'Criar um novo negócio'
  },
  {
    idPlano: 'chico_entrega',
    nomePlano: 'Chico Entrega',
    setor: 'Logística & Delivery de Bebidas',
    descricao: 'Distribuição rápida e entrega expressa de bebidas geladas e itens de conveniência.',
    cidadeUf: 'Belo Horizonte / MG',
    criadoEm: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: 'criado_pnbox_ddp',
    metodoCriacao: 'ddp_direct',
    ferramentasPreenchidas: 14,
    categoriaObjetivo: 'Criar um novo negócio'
  }
];

/**
 * Extrai o ID do Plano caso o usuário cole uma URL completa do Sebrae PNBOX
 * Ex: "https://pnbox.sebrae.com.br/planoNegocio/ferramentas/abc123xyz" -> "abc123xyz"
 * Ex: "https://pnbox.sebrae.com.br/planoNegocio/ferramentas/abc123xyz/segmentacaoMercado" -> "abc123xyz"
 * Ex: "abc123xyz" -> "abc123xyz"
 */
export function extrairIdPlano(entrada: string): string {
  if (!entrada) return ID_PLANO_PADRAO_SISTEMA;
  const trimmed = entrada.trim();

  // Caso seja apenas o domínio base do PNBOX sem ID especificado
  if (/^https?:\/\/pnbox\.sebrae\.com\.br\/?$/i.test(trimmed) || trimmed === 'https://pnbox.sebrae.com.br') {
    return ID_PLANO_PADRAO_SISTEMA;
  }

  // Caso seja URL do PNBOX com ferramentas
  const urlMatch = trimmed.match(/pnbox\.sebrae\.com\.br\/(?:planoNegocio\/)?ferramentas\/([a-zA-Z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // Caso contenha URL com planoNegocio/{id} ou plano/{id}
  const planoMatch = trimmed.match(/pnbox\.sebrae\.com\.br\/(?:planoNegocio|plano)\/([a-zA-Z0-9_-]+)/i);
  if (planoMatch && planoMatch[1] && planoMatch[1] !== 'ferramentas') {
    return planoMatch[1];
  }

  // Se for uma URL genérica, extrai último segmento válido
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsedUrl = new URL(trimmed);
      const segments = parsedUrl.pathname.split('/').filter(Boolean);
      if (segments.length === 0) {
        return ID_PLANO_PADRAO_SISTEMA;
      }
      const fIdx = segments.indexOf('ferramentas');
      if (fIdx !== -1 && segments[fIdx + 1]) {
        return segments[fIdx + 1];
      }
      const lastSeg = segments[segments.length - 1];
      if (/^[a-zA-Z0-9_-]{3,60}$/.test(lastSeg)) {
        return lastSeg;
      }
      return ID_PLANO_PADRAO_SISTEMA;
    } catch {
      return ID_PLANO_PADRAO_SISTEMA;
    }
  }

  return trimmed || ID_PLANO_PADRAO_SISTEMA;
}

/**
 * Valida se a string é um ID de plano aceitável
 */
export function validarIdPlano(id: string): boolean {
  if (!id) return false;
  const clean = extrairIdPlano(id);
  return /^[a-zA-Z0-9_-]{3,60}$/.test(clean);
}

/**
 * Carrega lista de planos salvos no localStorage sincronizada com o backend
 */
export function carregarPlanosSalvos(): PlanoCriadoInfo[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Garante que os planos oficiais da conta do usuário estão presentes
        const idsPresentes = new Set(parsed.map((p: PlanoCriadoInfo) => p.idPlano));
        const faltando = PLANOS_EXEMPLO_INICIAIS.filter((p) => !idsPresentes.has(p.idPlano));
        return [...faltando, ...parsed];
      }
    }
  } catch (e) {
    console.warn('Erro ao ler planos do localStorage:', e);
  }
  return PLANOS_EXEMPLO_INICIAIS;
}

/**
 * Salva ou atualiza um plano no histórico
 */
export function salvarPlanoNoHistorico(plano: PlanoCriadoInfo): PlanoCriadoInfo[] {
  const planosAtuais = carregarPlanosSalvos();
  const index = planosAtuais.findIndex((p) => p.idPlano === plano.idPlano);

  let atualizados: PlanoCriadoInfo[];
  if (index >= 0) {
    atualizados = [...planosAtuais];
    atualizados[index] = { ...atualizados[index], ...plano };
  } else {
    atualizados = [plano, ...planosAtuais];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizados));
  } catch (e) {
    console.warn('Erro ao salvar planos no localStorage:', e);
  }

  return atualizados;
}

/**
 * Remove um plano do histórico local
 */
export function removerPlanoDoHistorico(idPlano: string): PlanoCriadoInfo[] {
  const planosAtuais = carregarPlanosSalvos();
  const filtrados = planosAtuais.filter((p) => p.idPlano !== idPlano);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtrados));
  } catch (e) {
    console.warn('Erro ao remover plano do localStorage:', e);
  }

  return filtrados;
}
