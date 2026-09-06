import { FERRAMENTAS_PNBOX } from '../automation/schemaCatalog';
import { PlanAuditReport, ToolAuditStatus, FerramentaInfo, InterceptedTrafficEvent } from '../types/pnbox';

/**
 * Auditoria somente observacional do estado conhecido do plano.
 * Não cria dados, IDs, registros ou sincronizações locais que possam ser
 * confundidos com estado persistido no PNBOX.
 */
export class PlanAuditManager {
  static auditarPlano(
    idPlano: string,
    dadosAtivos?: Record<string, Record<string, unknown>[]>,
    eventosTrafego: InterceptedTrafficEvent[] = []
  ): PlanAuditReport {
    if (!idPlano?.trim()) throw new Error('ID do plano PNBOX é obrigatório para auditoria.');

    const eventosSalvos = eventosTrafego.filter(
      (e) =>
        e.status === 200 &&
        e.operacaoDetectada?.collection &&
        (JSON.stringify(e.payloadEnviado).includes(idPlano) || e.url.includes(idPlano))
    );

    const ferramentasStatus: ToolAuditStatus[] = FERRAMENTAS_PNBOX.map((f: FerramentaInfo) => {
      const colecao = f.collectionName;
      const registros = dadosAtivos?.[f.id] || dadosAtivos?.[colecao] || [];
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
          if (val !== undefined && val !== null && val !== '') camposPreenchidos++;
          else if (c.obrigatorio) camposFaltantes.push(c.nome);
        }
        status = camposFaltantes.length === 0 ? 'synced' : 'warning';
      } else if (eventoSincronizado) {
        status = 'synced';
        camposPreenchidos = camposObrigatorios.length;
      }

      const docIds: string[] = [];
      if (temRegistros) {
        for (const r of registros) {
          const id = String(r._id || r.id || '').trim();
          if (id) docIds.push(id);
        }
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
        ultimaSincronizacao: eventoSincronizado?.timestamp,
        docIds,
        origem: eventoSincronizado ? 'ddp_traffic' : temRegistros ? 'template' : 'manual'
      };
    });

    const ferramentasSincronizadas = ferramentasStatus.filter((f) => f.status === 'synced').length;
    const ferramentasPendentes = ferramentasStatus.filter((f) => f.status === 'pending' || f.status === 'warning').length;
    const porcentagemSincronizada = Math.round((ferramentasSincronizadas / FERRAMENTAS_PNBOX.length) * 100);
    const saudeGeral: 'excelente' | 'parcial' | 'critica' =
      ferramentasSincronizadas === FERRAMENTAS_PNBOX.length
        ? 'excelente'
        : ferramentasSincronizadas >= Math.ceil(FERRAMENTAS_PNBOX.length / 2)
          ? 'parcial'
          : 'critica';

    return {
      idPlano,
      totalFerramentas: FERRAMENTAS_PNBOX.length,
      ferramentasSincronizadas,
      ferramentasPendentes,
      porcentagemSincronizada,
      saudeGeral,
      tempoUltimaAuditoria: new Date().toISOString(),
      ferramentas: ferramentasStatus
    };
  }

  /**
   * Geração automática de dados sintéticos para sincronização foi removida.
   * Dados enviados ao PNBOX devem vir de pesquisa/IA ou entrada explícita do usuário.
   */
  static gerarPayloadsParaPendentes(): never {
    throw new Error('PAYLOAD_GENERATION_DISABLED: geração automática de dados sintéticos para PNBOX foi desativada.');
  }
}