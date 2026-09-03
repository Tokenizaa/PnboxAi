import { CanonicalBusinessPlan } from '../business-plan';
import { FERRAMENTAS_PNBOX } from '../../automation/schemaCatalog';

export interface PnboxToolsOutput {
  idPlano: string;
  ferramentas: Record<string, Record<string, unknown>[]>;
  totalFerramentas: number;
}

export class PnboxSkill {
  public mapCanonicalToPnbox(plan: CanonicalBusinessPlan, idPlano: string): PnboxToolsOutput {
    const fin = plan.financeiro;
    const persona = plan.persona;
    const prop = plan.propostaValor;
    const conc = plan.concorrencia;
    const jornada = plan.jornadaCliente;

    const ferramentas: Record<string, Record<string, unknown>[]> = {};

    // 1. segmentacaoMercado
    ferramentas['segmentacaoMercado'] = [
      {
        idPlano,
        segmento: plan.setor,
        publicoAlvo: `${persona.faixaEtaria}, ${persona.cargoOcupacao}, renda ${persona.rendaMediaMensal}.`,
        necessidadesAtendidas: prop.doresAliviadas.join('; '),
        comportamentoConsumo: persona.perfilComportamental,
        criteriosEscolha: persona.gatilhosDeCompra.join(', '),
        tamanhoMercado: `Mercado regional em ${plan.cidadeUf} com alta demanda qualificada.`
      }
    ];

    // 2. geradorPersonas
    ferramentas['geradorPersonas'] = [
      {
        idPlano,
        nome: persona.nome,
        idade: persona.faixaEtaria,
        ocupacao: persona.cargoOcupacao,
        renda: persona.rendaMediaMensal,
        perfil: persona.perfilComportamental,
        dores: persona.doresPrincipais,
        desejos: persona.desejosObjetivos,
        ondeBuscaInformacao: persona.ondeBuscaInformacao,
        gatilhosDecisao: persona.gatilhosDeCompra,
        ticketMedio: persona.ticketMedioEsperado
      }
    ];

    // 3. jornadaCliente
    ferramentas['jornadaCliente'] = jornada.estagios.map((est, idx) => ({
      idPlano,
      ordem: idx + 1,
      estagio: est.fase,
      titulo: est.tituloFase,
      pontoContato: est.pontoContato,
      pensamentoCliente: est.pensamentoCliente,
      acaoCliente: est.acaoCliente,
      oportunidadeMelhoria: est.oportunidadeEmpresa,
      kpiSucesso: est.indicadorSucesso
    }));

    // 4. propostaValor
    ferramentas['propostaValor'] = [
      {
        idPlano,
        propostaPrincipal: prop.headline,
        subtituloExplicativo: prop.subheadline,
        doresResolvidas: prop.doresAliviadas,
        ganhosGerados: prop.ganhosCriados,
        diferencialCompetitivo: prop.diferencialUnico,
        provasSociais: prop.razaoParaAcreditar
      }
    ];

    // 5. analiseConcorrencia
    ferramentas['analiseConcorrencia'] = conc.concorrentes.map((c) => ({
      idPlano,
      nomeConcorrente: c.nome,
      tipoConcorrente: c.tipo,
      pontosFortes: c.pontosFortes,
      pontosFracos: c.pontosFracos,
      estrategiaPreco: c.precoEstimado,
      diferencialNossaEmpresa: c.diferencialSuperacao
    }));

    // 6. forcasFraquezas
    ferramentas['forcasFraquezas'] = [
      ...plan.swot.forcas.map((f) => ({ idPlano, tipo: 'forca', descricao: f, impacto: 'alto' })),
      ...plan.swot.fraquezas.map((fr) => ({ idPlano, tipo: 'fraqueza', descricao: fr, impacto: 'medio' }))
    ];

    // 7. oportunidadesAmeacas
    ferramentas['oportunidadesAmeacas'] = [
      ...plan.swot.oportunidades.map((o) => ({ idPlano, tipo: 'oportunidade', descricao: o, probabilidade: 'alta' })),
      ...plan.swot.ameacas.map((a) => ({ idPlano, tipo: 'ameaca', descricao: a, probabilidade: 'media' }))
    ];

    // 8. analiseSwot
    ferramentas['analiseSwot'] = [
      {
        idPlano,
        forcas: plan.swot.forcas,
        fraquezas: plan.swot.fraquezas,
        oportunidades: plan.swot.oportunidades,
        ameacas: plan.swot.ameacas,
        estrategiaOfensiva: 'Alavancar agilidade tecnológica para capturar demanda insatisfeita.',
        estrategiaDefensiva: 'Fortalecer relacionamento com clientes para blindar contra entrantes.'
      }
    ];

    // 9. investimentoFixo
    ferramentas['investimentoFixo'] = [
      { idPlano, item: 'Equipamentos e Infraestrutura Tecnológica', quantidade: 1, valorUnitario: Math.round(fin.capexTotal * 0.45), total: Math.round(fin.capexTotal * 0.45) },
      { idPlano, item: 'Desenvolvimento e Licenças de Software', quantidade: 1, valorUnitario: Math.round(fin.capexTotal * 0.35), total: Math.round(fin.capexTotal * 0.35) },
      { idPlano, item: 'Despesas Pré-Operacionais e Legalização', quantidade: 1, valorUnitario: Math.round(fin.capexTotal * 0.20), total: Math.round(fin.capexTotal * 0.20) }
    ];

    // 10. produtoServico (Ganhos)
    ferramentas['produtoServico'] = [
      {
        idPlano,
        nomeItem: `${plan.nome} - Solução Principal`,
        precoVenda: fin.ticketMedio,
        vendasEstimadasMensais: Math.round(fin.faturamentoEstimadoMensal / (fin.ticketMedio || 180)),
        faturamentoTotalMensal: fin.faturamentoEstimadoMensal
      }
    ];

    // 11. custoFixo
    ferramentas['custoFixo'] = [
      { idPlano, categoria: 'Tecnologia & Softwares SaaS', valorMensal: Math.round(fin.custosFixosMensais * 0.25) },
      { idPlano, categoria: 'Equipe e Pró-labore', valorMensal: Math.round(fin.custosFixosMensais * 0.50) },
      { idPlano, categoria: 'Marketing Digital e Aquisição', valorMensal: Math.round(fin.custosFixosMensais * 0.15) },
      { idPlano, categoria: 'Contabilidade e Administrativo', valorMensal: Math.round(fin.custosFixosMensais * 0.10) }
    ];

    // 12. dre
    ferramentas['dre'] = [
      {
        idPlano,
        receitaBruta: fin.dreSimplificada.receitaBruta,
        deducoesImpostos: fin.dreSimplificada.impostos,
        receitaLiquida: fin.dreSimplificada.receitaLiquida,
        custosVariaveis: fin.dreSimplificada.custosVariaveis,
        margemContribuicao: fin.dreSimplificada.margemContribuicao,
        custosFixos: fin.dreSimplificada.custosFixos,
        resultadoLiquido: fin.dreSimplificada.lucroLiquido,
        margemLucroPct: fin.dreSimplificada.margemLiquidaPct
      }
    ];

    // 13. capitalGiro (Indicadores Financeiros)
    ferramentas['capitalGiro'] = [
      {
        idPlano,
        capitalGiroNecessario: fin.capitalGiroInicial,
        pontoEquilibrioMensal: fin.pontoEquilibrioMensalBrl,
        prazoRetornoMeses: fin.pontoEquilibrioMesesPayback,
        lucratividadePct: fin.dreSimplificada.margemLiquidaPct,
        rentabilidadeInvestimentoPct: Math.round(((fin.dreSimplificada.lucroLiquido * 12) / fin.investimentoTotalInicial) * 100)
      }
    ];

    // 14. canaisAquisicao
    ferramentas['canaisAquisicao'] = plan.canaisAquisicao.map((c, i) => ({
      idPlano,
      canal: c,
      tipo: i === 0 ? 'digital_inbound' : i === 1 ? 'redes_sociais' : 'parcerias_b2b',
      custoEstimadoAquisicao: Math.round(fin.ticketMedio * 0.25),
      focoEstrategico: 'Aquisição de clientes qualificados'
    }));

    // Complementares
    ferramentas['funilVendas'] = [
      { idPlano, estagio: 'Visitantes / Leads', volumeEstimado: 2500, taxaConversao: '100%' },
      { idPlano, estagio: 'Oportunidades Qualificadas', volumeEstimado: 350, taxaConversao: '14%' },
      { idPlano, estagio: 'Clientes Ativos', volumeEstimado: Math.round(fin.faturamentoEstimadoMensal / fin.ticketMedio), taxaConversao: '5%' }
    ];

    return {
      idPlano,
      ferramentas,
      totalFerramentas: FERRAMENTAS_PNBOX.length
    };
  }
}

export const pnboxSkill = new PnboxSkill();
