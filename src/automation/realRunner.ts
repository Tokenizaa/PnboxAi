/**
 * Executa um lote de preenchimento de ferramentas PNBOX com os dados fornecidos.
 * 
 * @param templateId ID do template de negócio
 * @param dadosMesclado Dados mesclados para preencher as ferramentas (formato: { collectionName: registros[] })
 * @param idPlano ID do plano de negócio
 * @param authContext Contexto de autenticação do usuário (cookies, loginToken, userId)
 * @returns Resumo da execução do lote
 */
export async function executarLote(
  templateId: string,
  dadosMesclado: Record<string, Record<string, unknown>[]>,
  idPlano = ID_PLANO_PADRAO,
  authContext?: DdpAuthContext
): Promise<BatchExecutionSummary> {
  // Validar autenticação
  if (!authContext?.cookies && !authContext?.loginToken) {
    throw new Error('Sessão PNBOX não autenticada. Forneça credenciais válidas.');
  }

  // Preparar estrutura de execução
  const batchConfig = prepararEstruturaExecucao(templateId, idPlano);
  
  // Atualizar os steps com os dados fornecidos
  const stepsWithData: ExecutionStepResult[] = batchConfig.steps.map(step => {
    // Obter dados para esta ferramenta específica
    const dadosParaEstaFerramenta = dadosMesclado[step.collection] || [];
    
    return {
      ...step,
      totalRegistros: dadosParaEstaFerramenta.length,
      registrosSalvos: 0,
      status: 'pending',
      mensagem: dadosParaEstaFerramenta.length > 0
        ? `Aguardando execução (${dadosParaEstaFerramenta.length} registros para gravar)...`
        : 'Ferramenta sem registros no plano atual (0 registros para gravar).',
      docIds: []
    };
  });

  // Executar cada ferramenta sequencialmente
  const executados: ExecutionStepResult[] = [];
  let ferramentasSucesso = 0;
  let ferramentasFalha = 0;
  let totalRegistrosSalvos = 0;

  for (const step of stepsWithData) {
    try {
      // Obter dados para esta ferramenta
      const dadosParaEstaFerramenta = dadosMesclado[step.collection] || [];
      
      // Executar a ferramenta
      const resultadoFerramenta = await executarFerramentaNoPnbox(
        step.ferramentaId,
        dadosParaEstaFerramenta,
        idPlano,
        authContext
      );
      
      executados.push(resultadoFerramenta);
      
      // Contar sucessos e falhas
      if (resultadoFerramenta.status === 'success') {
        ferramentasSucesso++;
      } else {
        ferramentasFalha++;
      }
      
      totalRegistrosSalvos += resultadoFerramenta.registrosSalvos;
    } catch (error: any) {
      // Em caso de erro na execução da ferramenta, criar um step de erro
      const erroStep: ExecutionStepResult = {
        ...step,
        status: 'error',
        mensagem: `Falha ao executar ferramenta: ${error.message}`,
        logs: [error.message]
      };
      executados.push(erroStep);
      ferramentasFalha++;
    }
  }

  // Calcular duração total
  const inicioExecucao = new Date(batchConfig.iniciadoEm);
  const fimExecucao = new Date();
  const duracaoTotalMs = fimExecucao.getTime() - inicioExecucao.getTime();

  // Determinar status geral
  let statusGeral: BatchExecutionSummary['statusGeral'] = 'idle';
  if (ferramentasFalha === 0 && ferramentasSucesso > 0) {
    statusGeral = 'completed';
  } else if (ferramentasFalha > 0 && ferramentasSucesso === 0) {
    statusGeral = 'failed';
  } else if (ferramentasSucesso > 0 && ferramentasFalha > 0) {
    statusGeral = 'completed'; // Parcialmente sucesso ainda é considerado completado
  }

  return {
    ...batchConfig,
    steps: executados,
    iniciadoEm: batchConfig.iniciadoEm,
    finalizadoEm: fimExecucao.toISOString(),
    duracaoTotalMs,
    totalFerramentas: executados.length,
    ferramentasSucesso,
    ferramentasFalha,
    totalRegistrosSalvos,
    statusGeral
  };
}