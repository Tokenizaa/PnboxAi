import { PlanoCriadoInfo } from '../types/pnbox';

const STORAGE_KEY = 'pnbox_saved_plans';

export const ID_PLANO_PADRAO_SISTEMA = 'HCOQIkjSk97gGcfGDPb0h';

export const PLANOS_EXEMPLO_INICIAIS: PlanoCriadoInfo[] = [
  {
    idPlano: ID_PLANO_PADRAO_SISTEMA,
    nomePlano: 'Cafeteria Especial & Coworking Criativo',
    setor: 'Alimentação & Coworking',
    descricao: 'Plano padrão com microlotes de café especial e estações compartilhadas de alta velocidade.',
    cidadeUf: 'Curitiba / PR',
    criadoEm: new Date(Date.now() - 3600000 * 48).toISOString(),
    status: 'preenchido_completo',
    metodoCriacao: 'ddp_direct',
    ferramentasPreenchidas: 14
  },
  {
    idPlano: 'plano_clinica_vet_24h',
    nomePlano: 'Clínica Veterinária 24h & UTI Móvel',
    setor: 'Saúde Animal & Serviços',
    descricao: 'Atendimento emergencial 24h, internação com monitoramento contínuo e UTI móvel.',
    cidadeUf: 'São Paulo / SP',
    criadoEm: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'criado_pnbox_ddp',
    metodoCriacao: 'ddp_direct',
    ferramentasPreenchidas: 14
  }
];

/**
 * Extrai o ID do Plano caso o usuário cole uma URL completa do Sebrae PNBOX
 * Ex: "https://pnbox.sebrae.com.br/planoNegocio/ferramentas/abc123xyz" -> "abc123xyz"
 * Ex: "https://pnbox.sebrae.com.br/planoNegocio/ferramentas/abc123xyz/segmentacaoMercado" -> "abc123xyz"
 * Ex: "abc123xyz" -> "abc123xyz"
 */
export function extrairIdPlano(entrada: string): string {
  if (!entrada) return '';
  const trimmed = entrada.trim();

  // Caso seja URL do PNBOX
  const urlMatch = trimmed.match(/pnbox\.sebrae\.com\.br\/planoNegocio\/ferramentas\/([a-zA-Z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // Caso contenha barras ou query params
  const cleanId = trimmed.replace(/^https?:\/\/[^/]+\//, '').replace(/\?.*$/, '').replace(/#.*$/, '');
  const parts = cleanId.split('/').filter(Boolean);
  
  if (parts.length > 0) {
    const ferramentasIndex = parts.indexOf('ferramentas');
    if (ferramentasIndex !== -1 && parts[ferramentasIndex + 1]) {
      return parts[ferramentasIndex + 1];
    }
    return parts[parts.length - 1];
  }

  return trimmed;
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
        return parsed;
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
