/**
 * Testes para playwrightScriptGenerator - Verifica geração de scripts, proteção de credenciais e integridade
 * Rodar: npx tsx src/autonomy/__tests__/playwrightScriptGenerator.test.ts
 */
import { gerarScriptPlaywrightOficial, gerarScriptCriarNovoPlanoPlaywright } from '../../automation/playwrightScriptGenerator';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('❌ FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('✓', msg);
  }
}

function assertEqual(actual: any, expected: any, msg?: string): void {
  if (actual !== expected) {
    console.error('❌ FAIL:', msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exitCode = 1;
  } else {
    console.log('✓', msg || 'Values match');
  }
}

function assertDefined(value: any, msg?: string): asserts value is NonNullable<typeof value> {
  if (value === undefined || value === null) {
    console.error('❌ FAIL:', msg || 'Value should be defined');
    process.exitCode = 1;
  }
}

function assertStringContains(str: string, substring: string, msg?: string): void {
  if (!str.includes(substring)) {
    console.error('❌ FAIL:', msg || `String does not contain substring. Expected to find: "${substring}"`);
    console.error('  Actual string:', str);
    process.exitCode = 1;
  } else {
    console.log('✓', msg || `String contains expected substring`);
  }
}

console.log('\n=== Testando playwrightScriptGenerator ===\n');

// Teste 1: Rejeitar plano vazio ou sintético na geração de script oficial
{
  console.log('Teste 1: Rejeição de plano sintético ou vazio');
  try {
    gerarScriptPlaywrightOficial('', 'plano_sintetico_123');
    console.error('❌ FAIL: Deveria ter lançado erro para ID sintético');
    process.exitCode = 1;
  } catch (err: any) {
    assertStringContains(err.message, 'PNBOX_REAL_PLAN_REQUIRED', 'Lança erro PNBOX_REAL_PLAN_REQUIRED para ID sintético');
  }

  try {
    gerarScriptPlaywrightOficial('', ':idPlano');
    console.error('❌ FAIL: Deveria ter lançado erro para :idPlano');
    process.exitCode = 1;
  } catch (err: any) {
    assertStringContains(err.message, 'PNBOX_REAL_PLAN_REQUIRED', 'Lança erro PNBOX_REAL_PLAN_REQUIRED para :idPlano');
  }
}

// Teste 2: Geração de script oficial para plano real válido
{
  console.log('\nTeste 2: Geração de script oficial com ID real válido');
  try {
    const realPlanId = '9kX8yZb12Wq';
    const script = gerarScriptPlaywrightOficial('', realPlanId);
    assertDefined(script, 'Script deve ser gerado');
    assertEqual(typeof script, 'string', 'Script deve ser uma string');
    assertStringContains(script, 'PNBOX — sessão Playwright observacional', 'Cabeçalho de sessão observacional');
    assertStringContains(script, 'process.env.PNBOX_CPF', 'Usa variável de ambiente para CPF');
    assertStringContains(script, 'process.env.PNBOX_PASSWORD', 'Usa variável de ambiente para senha');
    assertStringContains(script, 'const PLAN_ID = "9kX8yZb12Wq";', 'ID real atribuído à constante PLAN_ID');
    assertStringContains(script, 'https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${PLAN_ID}', 'URL oficial do plano parametrizada com PLAN_ID');
    // Garantir que nenhuma senha ou credencial sensível está embutida no script
    assert(!script.includes('senha123'), 'Não contém senhas embutidas');
    assert(!script.includes('custom456!'), 'Não contém senhas embutidas');
  } catch (error) {
    console.error('❌ FAIL: Erro ao gerar script oficial com ID real');
    console.error('  Erro:', error);
    process.exitCode = 1;
  }
}

// Teste 3: Script de criação bloqueado com BLOCKED_EXTERNAL_CONTRACT / PNBOX_CREATE_CONTRACT_UNVERIFIED
{
  console.log('\nTeste 3: Criação de novo plano bloqueada por ausência de contrato DDP comprovado');
  try {
    const script = gerarScriptCriarNovoPlanoPlaywright('Empresa Teste', 'Tecnologia');
    assertDefined(script, 'Script de criação bloqueado gerado');
    assertStringContains(script, 'PNBOX_CREATE_CONTRACT_UNVERIFIED', 'Contém aviso explícito de contrato de criação não verificado');
    assertStringContains(script, 'throw new Error', 'Lança erro em tempo de execução para evitar criação acidental');
  } catch (error) {
    console.error('❌ FAIL: Erro ao gerar script de criação bloqueado');
    console.error('  Erro:', error);
    process.exitCode = 1;
  }
}

// Teste 4: Rejeitar ID sugerido sintético na criação de plano
{
  console.log('\nTeste 4: Rejeição de ID sugerido sintético');
  try {
    gerarScriptCriarNovoPlanoPlaywright('Empresa Teste', 'Tecnologia', undefined, 'plano_custom_999');
    console.error('❌ FAIL: Deveria rejeitar ID sugerido sintético');
    process.exitCode = 1;
  } catch (err: any) {
    assertStringContains(err.message, 'PNBOX_REAL_PLAN_REQUIRED', 'Lança erro ao tentar usar ID sugerido sintético');
  }
}

console.log('\n✓ Todos os testes de playwrightScriptGenerator concluídos com sucesso.\n');
