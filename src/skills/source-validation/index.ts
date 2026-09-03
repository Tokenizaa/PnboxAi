export type SourceType =
  | 'official_gov'
  | 'official_org'
  | 'academic'
  | 'industry_report'
  | 'corporate'
  | 'specialized_press'
  | 'secondary';

export interface ValidatedSource {
  id: string;
  url: string;
  title: string;
  publisher: string;
  type: SourceType;
  reliability: number;
  retrievedAt: string;
  publishedAt?: string;
  isValid: boolean;
  validationNotes?: string[];
}

export class SourceValidationSkill {
  /**
   * Avalia a credibilidade de um domínio e URL
   */
  public validate(url: string, title: string, publisher: string): ValidatedSource {
    const id = 'src_' + Math.random().toString(36).substring(2, 9);
    const retrievedAt = new Date().toISOString();
    const notes: string[] = [];

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return {
        id,
        url: url || '',
        title: title || 'Fonte sem título',
        publisher: publisher || 'Desconhecido',
        type: 'secondary',
        reliability: 0.3,
        retrievedAt,
        isValid: false,
        validationNotes: ['URL inválida ou não fornecida']
      };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return {
        id,
        url,
        title,
        publisher,
        type: 'secondary',
        reliability: 0.3,
        retrievedAt,
        isValid: false,
        validationNotes: ['Formato de URL malformado']
      };
    }

    const host = parsedUrl.hostname.toLowerCase();
    let type: SourceType = 'secondary';
    let reliability = 0.6;

    if (host.includes('.gov.br') || host.includes('ibge.gov.br') || host.includes('bcb.gov.br') || host.includes('fazenda.gov.br')) {
      type = 'official_gov';
      reliability = 0.98;
      notes.push('Fonte Governamental Oficial (alta confiabilidade)');
    } else if (host.includes('sebrae.com.br')) {
      type = 'official_org';
      reliability = 0.95;
      notes.push('Portal Oficial do Sebrae (referência canônica)');
    } else if (host.includes('.edu.br') || host.includes('.edu') || host.includes('scielo.org')) {
      type = 'academic';
      reliability = 0.90;
      notes.push('Fonte Acadêmica / Científica');
    } else if (host.includes('valor.globo.com') || host.includes('estadao.com.br') || host.includes('exame.com') || host.includes('g1.globo.com') || host.includes('folha.uol.com.br')) {
      type = 'specialized_press';
      reliability = 0.85;
      notes.push('Imprensa especializada de negócios');
    } else if (host.includes('nvidia.com') || host.includes('google.com') || host.includes('abstartups.com.br')) {
      type = 'corporate';
      reliability = 0.80;
      notes.push('Publicação corporativa / ecossistema');
    } else {
      type = 'industry_report';
      reliability = 0.70;
      notes.push('Fonte de mercado geral');
    }

    return {
      id,
      url,
      title: title || host,
      publisher: publisher || host,
      type,
      reliability,
      retrievedAt,
      isValid: true,
      validationNotes: notes
    };
  }

  /**
   * Valida lista de fontes e remove duplicatas
   */
  public validateBatch(sources: Array<{ url: string; title: string; publisher?: string }>): ValidatedSource[] {
    const seenUrls = new Set<string>();
    const results: ValidatedSource[] = [];

    for (const s of sources) {
      if (!s.url || seenUrls.has(s.url.trim().toLowerCase())) continue;
      seenUrls.add(s.url.trim().toLowerCase());
      const validated = this.validate(s.url, s.title, s.publisher || '');
      if (validated.isValid) {
        results.push(validated);
      }
    }

    return results;
  }
}

export const sourceValidationSkill = new SourceValidationSkill();
