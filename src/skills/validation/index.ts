import { CanonicalBusinessPlan } from '../business-plan';

export interface ValidationIssue {
  campo: string;
  severidade: 'erro' | 'aviso';
  mensagem: string;
}

export interface ValidationReport {
  isValido: boolean;
  scoreQualidade: number; // 0 a 100
  totalErros: number;
  totalAvisos: number;
  issues: ValidationIssue[];
}

export class ValidationSkill {
  public validatePlan(plan: CanonicalBusinessPlan): ValidationReport {
    const issues: ValidationIssue[] = [];

    // 1. Verificação de Usuário
    if (!plan.userId || plan.userId.trim().length === 0) {
      issues.push({
        campo: 'userId',
        severidade: 'erro',
        mensagem: 'Plano não possui usuário proprietário vinculado.'
      });
    }

    // 2. Verificação de Fontes Reais
    if (!plan.fontesConsultadas || plan.fontesConsultadas.length === 0) {
      issues.push({
        campo: 'fontesConsultadas',
        severidade: 'erro',
        mensagem: 'O plano não possui fontes reais de pesquisa registradas.'
      });
    } else {
      const fontesInvalidas = plan.fontesConsultadas.filter(f => !f.url || !f.url.startsWith('http'));
      if (fontesInvalidas.length > 0) {
        issues.push({
          campo: 'fontesConsultadas',
          severidade: 'erro',
          mensagem: 'Existem fontes registradas sem URL válida.'
        });
      }
    }

    // 3. Verificação de Coerência Financeira
    const fin = plan.financeiro;
    if (!fin) {
      issues.push({
        campo: 'financeiro',
        severidade: 'erro',
        mensagem: 'Módulo financeiro não calculado.'
      });
    } else {
      if (fin.capexTotal <= 0) {
        issues.push({
          campo: 'financeiro.capexTotal',
          severidade: 'erro',
          mensagem: 'CAPEX total deve ser maior que zero.'
        });
      }
      if (fin.faturamentoEstimadoMensal <= 0) {
        issues.push({
          campo: 'financeiro.faturamentoEstimadoMensal',
          severidade: 'erro',
          mensagem: 'Faturamento mensal estimado deve ser positivo.'
        });
      }
      if (fin.pontoEquilibrioMesesPayback <= 0 || fin.pontoEquilibrioMesesPayback > 60) {
        issues.push({
          campo: 'financeiro.pontoEquilibrioMesesPayback',
          severidade: 'aviso',
          mensagem: `Prazo de retorno (${fin.pontoEquilibrioMesesPayback} meses) fora do intervalo padrão (1 a 60 meses).`
        });
      }
    }

    // 4. Verificação de Persona
    if (!plan.persona || !plan.persona.nome) {
      issues.push({
        campo: 'persona',
        severidade: 'erro',
        mensagem: 'Buyer Persona incompleta ou ausente.'
      });
    } else if (!plan.persona.doresPrincipais || plan.persona.doresPrincipais.length === 0) {
      issues.push({
        campo: 'persona.doresPrincipais',
        severidade: 'aviso',
        mensagem: 'Buyer Persona não lista dores de mercado.'
      });
    }

    // 5. Verificação de Proposta de Valor
    if (!plan.propostaValor || !plan.propostaValor.headline) {
      issues.push({
        campo: 'propostaValor',
        severidade: 'erro',
        mensagem: 'Proposta de valor sem título principal definido.'
      });
    }

    const totalErros = issues.filter(i => i.severidade === 'erro').length;
    const totalAvisos = issues.filter(i => i.severidade === 'aviso').length;
    const scoreQualidade = Math.max(0, 100 - (totalErros * 25 + totalAvisos * 5));

    return {
      isValido: totalErros === 0,
      scoreQualidade,
      totalErros,
      totalAvisos,
      issues
    };
  }
}

export const validationSkill = new ValidationSkill();
