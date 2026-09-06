import { FERRAMENTAS_PNBOX } from './schemaCatalog';

export interface PlaywrightGeneratorCredentials {
  cpf?: string;
  password?: string;
  idPlano?: string;
}

function assertRealPlanId(idPlano: string): string {
  const value = idPlano.trim();
  if (!value || value === ':idPlano' || value.startsWith('plano_')) {
    throw new Error('PNBOX_REAL_PLAN_REQUIRED: informe o ID real retornado pelo PNBOX.');
  }
  return value;
}

function envCredentialConfig(): string {
  return `const CPF = process.env.PNBOX_CPF || '';\nconst PASSWORD = process.env.PNBOX_PASSWORD || '';\nif (!CPF || !PASSWORD) throw new Error('PNBOX_CREDENTIALS_REQUIRED: use variáveis de ambiente; não grave credenciais no código.');`;
}

/**
 * Gera um script Playwright somente para autenticar e abrir um plano real.
 * A gravação de dados permanece no DDP oficial já autenticado pelo backend.
 * Nenhum método Meteor é inventado neste gerador.
 */
export function gerarScriptPlaywrightOficial(
  _templateId = '',
  idPlano = '',
  _credenciais: PlaywrightGeneratorCredentials = {}
): string {
  const realPlanId = assertRealPlanId(idPlano);
  const toolCount = FERRAMENTAS_PNBOX.length;

  return `/**\n * PNBOX — sessão Playwright observacional\n * Ferramentas catalogadas: ${toolCount}\n * ID real do plano: ${realPlanId}\n *\n * Este script não inventa IDs, não usa payloads de exemplo e não chama\n * métodos Meteor não confirmados. A persistência deve ocorrer pelo cliente\n * DDP oficial autenticado do backend.\n */\nimport { chromium } from 'playwright';\n\n${envCredentialConfig()}\nconst PLAN_ID = ${JSON.stringify(realPlanId)};\nconst URL = \`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/\${PLAN_ID}\`;\n\nconst browser = await chromium.launch({ headless: false });\nconst context = await browser.newContext();\nconst page = await context.newPage();\n\nawait page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });\nconsole.log('PNBOX aberto para o plano real:', PLAN_ID);\nconsole.log('Se o PNBOX solicitar autenticação, conclua o fluxo oficial no navegador.');\nawait page.waitForTimeout(1000);\nconsole.log('URL final:', page.url());\nconsole.log('Sessão Playwright encerrada sem escrita automática.');\nawait browser.close();\n`;
}

/**
 * A criação de um novo plano não é gerada automaticamente enquanto o método
 * oficial de criação do PNBOX não estiver confirmado por tráfego real.
 * Isso evita criar planos fictícios ou declarar sucesso sem confirmação.
 */
export function gerarScriptCriarNovoPlanoPlaywright(
  nomePlano: string,
  setor: string,
  _dadosCustomizados?: Record<string, Record<string, unknown>[]>,
  idPlanoSugerido = '',
  _credenciais: PlaywrightGeneratorCredentials = {}
): string {
  if (idPlanoSugerido && (idPlanoSugerido === ':idPlano' || idPlanoSugerido.startsWith('plano_'))) {
    throw new Error('PNBOX_REAL_PLAN_REQUIRED: um ID sugerido não pode ser usado como identidade do PNBOX.');
  }

  return `/**\n * PNBOX — criação de plano bloqueada até confirmação do contrato oficial\n * Nome solicitado: ${JSON.stringify(nomePlano)}\n * Setor solicitado: ${JSON.stringify(setor)}\n *\n * O PNBOX é a fonte de verdade. Este arquivo deliberadamente não chama\n * 'planos.insert', não cria IDs locais e não simula uma resposta de criação.\n * Capture o método DDP real pelo tráfego autenticado antes de automatizar a criação.\n */\nimport { chromium } from 'playwright';\n\n${envCredentialConfig()}\nthrow new Error('PNBOX_CREATE_CONTRACT_UNVERIFIED: criação automática desabilitada até confirmação do método oficial do PNBOX.');\n`;
}
