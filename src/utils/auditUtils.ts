import { FERRAMENTAS_PNBOX } from '../automation/schemaCatalog';
import { PlanAuditReport, ToolAuditStatus, FerramentaInfo, InterceptedTrafficEvent } from '../types/pnbox';
import { SchemaGenerator, BusinessArchetypeId } from './schemaGenerator';

const STORAGE_AUDIT_KEY = 'pnbox_plan_audit_cache';

/**
 * Utilitário de Auditoria e Health-Check das 14 Ferramentas do Sebrae PNBOX
 */
export class PlanAuditManager {
  /**
   * Executa a auditoria completa de um ID de Plano
   */
  static auditarPlano(
    idPlano: string,
    dadosAtivos?: Record<string, Record<string, unknown>[]>,
    eventosTrafego: InterceptedTrafficEvent[] = []
  ): PlanAuditReport {
    // Buscar se há registros de tráfego salvos para o plano
    const eventosSalvos = eventosTrafego.filter(
      (e) =>
        e.status === 200 &&
        e.operacaoDetectada?.collection &&
        (JSON.stringify(e.payloadEnviado).includes(idPlano) || e.url.includes(idPlano))
    );

    const ferramentasStatus: ToolAuditStatus[] = FERRAMENTAS_PNBOX.map((f: FerramentaInfo) => {
      const colecao = f.collectionName;
      const registros = dadosAtivos?.[colecao] || [];

      // Verificar se houve tráfego DDP ou inserção registrada
      const eventoSincronizado = eventosSalvos.find(
        (e) => e.operacaoDetectada?.collection === colecao || e.operacaoDetectada?.ferramentaId === f.id
      );

      const temRegistros = Array.isArray(registros) && registros.length > 0;
      let status: 'synced' | 'pending' | 'warning' = 'pending';
      const camposFaltantes: string[] = [];
      let camposPreenchidos = 0;
      const camposObrigatorios = f.camposSchema.filter((c) => c.obrigatorio).map((c) => c.nome);

      if (temRegistros) {
        const primeiroRegistro = registros[0] || {};
        for (const c of f.camposSchema) {
          const val = primeiroRegistro[c.nome];
          if (val !== undefined && val !== null && val !== '') {
            camposPreenchidos++;
          } else if (c.obrigatorio) {
            camposFaltantes.push(c.nome);
          }
        }

        if (camposFaltantes.length === 0) {
          status = 'synced';
        } else {
          status = 'warning';
        }
      } else if (eventoSincronizado) {
        status = 'synced';
        camposPreenchidos = camposObrigatorios.length;
      }

      const docIds: string[] = [];
      if (temRegistros) {
        registros.forEach((r, idx) => {
          docIds.push(String(r._id || r.id || `doc_${f.id}_${idx + 1}`));
        });
      }

      return {
        ferramentaId: f.id,
        nome: f.nome,
        collectionName: f.collectionName,
        bloco: f.bloco,
        blocoLabel: f.blocoLabel,
        status,
        totalRegistros: temRegistros ? registros.length : eventoSincronizado ? 1 : 0,
        camposPreenchidos,
        totalCamposObrigatorios: camposObrigatorios.length,
        camposFaltantes,
        ultimaSincronizacao: eventoSincronizado ? eventoSincronizado.timestamp : temRegistros ? new Date().toISOString() : undefined,
        docIds,
        origem: eventoSincronizado ? 'ddp_traffic' : temRegistros ? 'template' : 'manual'
      };
    });

    const ferramentasSincronizadas = ferramentasStatus.filter((f) => f.status === 'synced').length;
    const ferramentasPendentes = ferramentasStatus.filter((f) => f.status === 'pending' || f.status === 'warning').length;
    const porcentagemSincronizada = Math.round((ferramentasSincronizadas / FERRAMENTAS_PNBOX.length) * 100);

    let saudeGeral: 'excelente' | 'parcial' | 'critica' = 'critica';
    if (ferramentasSincronizadas === 14) {
      saudeGeral = 'excelente';
    } else if (ferramentasSincronizadas >= 7) {
      saudeGeral = 'parcial';
    }

    const report: PlanAuditReport = {
      idPlano,
      totalFerramentas: FERRAMENTAS_PNBOX.length,
      ferramentasSincronizadas,
      ferramentasPendentes,
      porcentagemSincronizada,
      saudeGeral,
      tempoUltimaAuditoria: new Date().toISOString(),
      ferramentas: ferramentasStatus
    };

    // Cache local opcional
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`${STORAGE_AUDIT_KEY}_${idPlano}`, JSON.stringify(report));
      }
    } catch {
      // Ignora erro de localStorage
    }

    return report;
  }

/**
 * Sincroniza todas as ferramentas pendentes com dados realistas gerados pelo SchemaGenerator
 */
  static gerarPayloadsParaPendentes(
    report: PlanAuditReport,
    idPlano: string,
    templateId: string = 'cafeteria_gastronomia'
  ): Record<string, Record<string, unknown>[]> {
    // Validar se o templateId é um arquétipo válido, senão usar padrão
    const validArchetypes: BusinessArchetypeId[] = [
      'tecnologia_saas', 'cafeteria_gastronomia', 'saude_odontologia', 'barbearia_estetica', 
      'educacao_edtech', 'varejo_sustentavel', 'consultoria_agencia', 'energia_solar', 
      'fitness_academia', 'logistica_frotas', 'random'
    ];
    const validArchetypeId: BusinessArchetypeId = validArchetypes.includes(templateId as BusinessArchetypeId) 
      ? (templateId as BusinessArchetypeId) 
      : 'cafeteria_gastronomia';
    
    const template = SchemaGenerator.generateBusinessTemplate({
      idPlano,
      archetype: validArchetypeId
    });
    const todosDados = template.dados;
    const dadosPendentes: Record<string, Record<string, unknown>[]> = {};

    for (const f of report.ferramentas) {
      if (f.status !== 'synced') {
        dadosPendentes[f.collectionName] = todosDados[f.collectionName] || [];
      }
    }

    return dadosPendentes;
  }
}
