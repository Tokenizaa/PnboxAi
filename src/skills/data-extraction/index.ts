export interface ExtractedMetric {
  name: string;
  value: number;
  unit: string;
  period?: string;
  context?: string;
}

export class DataExtractionSkill {
  /**
   * Extrai valores monetários em Real (BRL) de textos ou payloads
   */
  public extractCurrency(text: string): number | null {
    if (!text) return null;
    const match = text.match(/R\$\s*([\d.,]+)/i) || text.match(/([\d.,]+)\s*reais/i);
    if (match && match[1]) {
      const clean = match[1].replace(/\./g, '').replace(',', '.');
      const val = parseFloat(clean);
      return isNaN(val) ? null : val;
    }
    return null;
  }

  /**
   * Extrai métricas estruturadas de relatórios textuais
   */
  public extractMetrics(text: string): ExtractedMetric[] {
    const metrics: ExtractedMetric[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // Procura padrões de moeda
      const curr = this.extractCurrency(line);
      if (curr !== null) {
        let name = line.split(':')[0] || 'Métrica Financeira';
        name = name.replace(/[-*#]/g, '').trim();
        metrics.push({
          name,
          value: curr,
          unit: 'BRL',
          context: line.trim()
        });
      }

      // Procura percentuais
      const pctMatch = line.match(/([\d.,]+)\s*%/);
      if (pctMatch && pctMatch[1]) {
        const val = parseFloat(pctMatch[1].replace(',', '.'));
        if (!isNaN(val)) {
          let name = line.split(':')[0] || 'Taxa Percentual';
          name = name.replace(/[-*#]/g, '').trim();
          metrics.push({
            name,
            value: val,
            unit: '%',
            context: line.trim()
          });
        }
      }
    }

    return metrics;
  }
}

export const dataExtractionSkill = new DataExtractionSkill();
