import { FerramentaInfo, JsonDiffResult, SchemaField } from '../types/pnbox';
import { FERRAMENTAS_PNBOX } from './schemaCatalog';

/**
 * Utilitário para validar e comparar o JSON capturado ou enviado com o Schema esperado
 * Permite certificar se a automação direta (via DDP / API) está 100% em conformidade.
 */
export function compararJsonComSchema(
  jsonCapturado: unknown,
  ferramentaOuCampos: string | FerramentaInfo | SchemaField[]
): JsonDiffResult {
  let fieldsEsperados: SchemaField[] = [];
  let nomeFerramenta = 'Ferramenta PNBOX';

  if (typeof ferramentaOuCampos === 'string') {
    const found = FERRAMENTAS_PNBOX.find(
      (f) => f.id === ferramentaOuCampos || f.collectionName === ferramentaOuCampos
    );
    if (found) {
      fieldsEsperados = found.camposSchema;
      nomeFerramenta = found.nome;
    }
  } else if ('camposSchema' in ferramentaOuCampos) {
    fieldsEsperados = ferramentaOuCampos.camposSchema;
    nomeFerramenta = ferramentaOuCampos.nome;
  } else {
    fieldsEsperados = ferramentaOuCampos;
  }

  if (!jsonCapturado || typeof jsonCapturado !== 'object' || Array.isArray(jsonCapturado)) {
    return {
      isValido: false,
      conformidadePercentual: 0,
      camposCorretos: [],
      camposFaltantes: fieldsEsperados.filter((f) => f.obrigatorio).map((f) => f.nome),
      camposExtras: [],
      errosDeTipo: [],
      resumo: 'O payload fornecido não é um objeto JSON válido.',
      detalhes: [
        {
          campo: 'root',
          status: 'type_mismatch',
          mensagem: 'Esperado um objeto chave-valor {...}, mas recebido outro tipo.'
        }
      ]
    };
  }

  const payload = jsonCapturado as Record<string, unknown>;
  const keysPresentes = Object.keys(payload);
  const mapaCamposEsperados = new Map<string, SchemaField>();
  fieldsEsperados.forEach((f) => mapaCamposEsperados.set(f.nome, f));

  const camposCorretos: string[] = [];
  const camposFaltantes: string[] = [];
  const camposExtras: string[] = [];
  const errosDeTipo: JsonDiffResult['errosDeTipo'] = [];
  const detalhes: JsonDiffResult['detalhes'] = [];

  // 1. Validar campos esperados
  for (const campo of fieldsEsperados) {
    const valor = payload[campo.nome];
    const presente = campo.nome in payload && valor !== undefined && valor !== null && valor !== '';

    if (!presente) {
      if (campo.obrigatorio) {
        camposFaltantes.push(campo.nome);
        detalhes.push({
          campo: campo.nome,
          status: 'missing',
          mensagem: `Campo obrigatório ausente: "${campo.nome}" (${campo.descricao})`
        });
      }
      continue;
    }

    // Checar tipo
    const tipoReal = Array.isArray(valor) ? 'array' : typeof valor;
    let tipoValido = false;

    if (campo.tipo === 'number') {
      tipoValido = typeof valor === 'number' && !isNaN(valor);
      // Suportar string numérica se parseável
      if (!tipoValido && typeof valor === 'string' && !isNaN(Number(valor))) {
        tipoValido = true;
      }
    } else if (campo.tipo === 'string') {
      tipoValido = typeof valor === 'string';
    } else if (campo.tipo === 'boolean') {
      tipoValido = typeof valor === 'boolean';
    } else if (campo.tipo === 'array') {
      tipoValido = Array.isArray(valor);
    } else if (campo.tipo === 'object') {
      tipoValido = typeof valor === 'object' && valor !== null && !Array.isArray(valor);
    } else {
      tipoValido = true;
    }

    if (!tipoValido) {
      errosDeTipo.push({
        campo: campo.nome,
        esperado: campo.tipo,
        recebido: tipoReal,
        valorRecebido: valor
      });
      detalhes.push({
        campo: campo.nome,
        status: 'type_mismatch',
        mensagem: `Incompatibilidade de tipo no campo "${campo.nome}". Esperado: ${campo.tipo}, Recebido: ${tipoReal}`
      });
    } else {
      camposCorretos.push(campo.nome);
      detalhes.push({
        campo: campo.nome,
        status: 'ok',
        mensagem: `Campo "${campo.nome}" válido e tipado corretamente (${campo.tipo})`
      });
    }
  }

  // 2. Identificar campos extras
  for (const key of keysPresentes) {
    if (key === '_id' || key === 'updatedat' || key === 'lastupdate' || key === 'createdby') {
      // Metadados comuns do MongoDB/Meteor são permitidos
      continue;
    }
    if (!mapaCamposEsperados.has(key)) {
      camposExtras.push(key);
      detalhes.push({
        campo: key,
        status: 'unexpected',
        mensagem: `Campo extra não previsto no schema: "${key}"`
      });
    }
  }

  // 3. Calcular percentual de conformidade
  const totalObrigatorios = fieldsEsperados.filter((f) => f.obrigatorio).length || 1;
  const obrigatoriosPresentes = fieldsEsperados
    .filter((f) => f.obrigatorio && camposCorretos.includes(f.nome))
    .length;

  const scoreObrigatorios = (obrigatoriosPresentes / totalObrigatorios) * 70;
  const penalidadeTipos = errosDeTipo.length * 15;
  const scoreGeral = Math.max(0, Math.min(100, scoreObrigatorios + (camposCorretos.length / Math.max(1, fieldsEsperados.length)) * 30 - penalidadeTipos));

  const conformidadePercentual = Math.round(scoreGeral);
  const isValido = camposFaltantes.length === 0 && errosDeTipo.length === 0;

  let resumo = '';
  if (isValido) {
    resumo = `Payload 100% válido e pronto para automação direta em "${nomeFerramenta}".`;
  } else {
    const problemas = [];
    if (camposFaltantes.length > 0) problemas.push(`${camposFaltantes.length} campo(s) obrigatório(s) ausente(s)`);
    if (errosDeTipo.length > 0) problemas.push(`${errosDeTipo.length} erro(s) de tipo`);
    resumo = `Inconformidade detectada para "${nomeFerramenta}": ${problemas.join(', ')}.`;
  }

  return {
    isValido,
    conformidadePercentual,
    camposCorretos,
    camposFaltantes,
    camposExtras,
    errosDeTipo,
    resumo,
    detalhes
  };
}

/**
 * Utilitário para comparar dois JSONs genéricos (Capturado vs Esperado)
 */
export function compararDoisJson(capturado: unknown, esperado: unknown): JsonDiffResult {
  const capObj = (typeof capturado === 'object' && capturado !== null ? capturado : {}) as Record<string, unknown>;
  const espObj = (typeof esperado === 'object' && esperado !== null ? esperado : {}) as Record<string, unknown>;

  const fields: SchemaField[] = Object.keys(espObj).map((k) => {
    const val = espObj[k];
    const tipo = Array.isArray(val) ? 'array' : typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : 'string';
    return {
      nome: k,
      tipo: tipo as SchemaField['tipo'],
      obrigatorio: true,
      descricao: `Campo inferido do JSON de referência`,
      exemplo: val
    };
  });

  return compararJsonComSchema(capObj, fields);
}
