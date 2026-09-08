import { PlanoCriadoInfo } from '../types/pnbox';
import { FERRAMENTAS_PNBOX } from '../automation/schemaCatalog';

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportPlanToJson(plano: PlanoCriadoInfo) {
  const payload = {
    versao: '1.0',
    exportadoEm: new Date().toISOString(),
    plano: {
      idPlano: plano.idPlano,
      nomePlano: plano.nomePlano,
      setor: plano.setor,
      cidadeUf: plano.cidadeUf,
      descricao: plano.descricao,
      categoriaObjetivo: plano.categoriaObjetivo,
      totalFerramentasPreenchidas: plano.ferramentasPreenchidas || 0,
      ferramentas: plano.dados14Ferramentas || {}
    }
  };

  const filename = `plano_pnbox_${plano.nomePlano.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.json`;
  downloadFile(JSON.stringify(payload, null, 2), filename, 'application/json');
}

export function exportPlanToMarkdown(plano: PlanoCriadoInfo): string {
  const lines: string[] = [];
  lines.push(`# Plano de Negócio PNBOX: ${plano.nomePlano}`);
  lines.push(`**ID do Plano:** \`${plano.idPlano}\``);
  if (plano.setor) lines.push(`**Setor:** ${plano.setor}`);
  if (plano.cidadeUf) lines.push(`**Localização:** ${plano.cidadeUf}`);
  if (plano.categoriaObjetivo) lines.push(`**Categoria:** ${plano.categoriaObjetivo}`);
  lines.push(`**Data de Exportação:** ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`);
  lines.push(`**Status:** ${plano.ferramentasPreenchidas || 0} de 14 ferramentas preenchidas`);
  lines.push('');

  if (plano.descricao) {
    lines.push('## Visão Geral do Empreendimento');
    lines.push(plano.descricao);
    lines.push('');
  }

  lines.push('---');
  lines.push('## As 14 Ferramentas Oficiais Sebrae PNBOX');
  lines.push('');

  const dados = plano.dados14Ferramentas || {};

  for (let i = 0; i < FERRAMENTAS_PNBOX.length; i++) {
    const f = FERRAMENTAS_PNBOX[i];
    const itens = (dados[f.id] || dados[f.collectionName] || []) as Record<string, unknown>[];
    lines.push(`### ${i + 1}. ${f.nome} (${f.blocoLabel})`);
    lines.push(`*Coleção PNBOX:* \`${f.collectionName}\` | *Registros cadastrados:* ${itens.length}`);
    lines.push('');

    if (itens.length === 0) {
      lines.push('_Nenhum item preenchido nesta ferramenta._');
    } else {
      itens.forEach((it, idx) => {
        lines.push(`#### Item ${idx + 1}`);
        for (const [k, v] of Object.entries(it)) {
          if (k === 'idPlano' || k === '_id' || k === 'id') continue;
          const displayVal = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '-');
          lines.push(`- **${k}:** ${displayVal}`);
        }
        lines.push('');
      });
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('_Exportado via Gerador Inteligente PNBOX AI com suporte a Sebrae Nacional e NVIDIA NIM._');

  const content = lines.join('\n');
  const filename = `relatorio_plano_${plano.nomePlano.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.md`;
  downloadFile(content, filename, 'text/markdown');
  return content;
}
