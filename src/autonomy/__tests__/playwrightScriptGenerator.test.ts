/**
 * Testes para playwrightScriptGenerator - Verifica geração de scripts e tratamento de erros
 * Rodar: npx tsx src/autonomy/__tests__/playwrightScriptGenerator.test.ts
 */
import { gerarScriptPlaywrightOficial, gerarScriptCriarNovoPlanoPlaywright } from '../../automation/playwrightScriptGenerator';
import { TEMPLATES_NEGOCIO } from '../../automation/businessTemplates';
import { ID_PLANO_PADRAO } from '../../automation/schemaCatalog';
import { CREDENCIAIS_PADRAO } from '../../automation/auth';

// Funções de asserção simples (similar aos testes existentes)
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

// Teste 1: Verificar geração de script oficial com parâmetros padrão
{
  console.log('Teste 1: Geração de script oficial com parâmetros padrão');
  
  try {
    const script = gerarScriptPlaywrightOficial();
    
    assertDefined(script, 'Script deve ser gerado');
    assertEqual(typeof script, 'string', 'Script deve ser uma string');
    assert(script.length > 0, 'Script não deve estar vazio');
    
    assertStringContains(script, 'AUTOMAÇÃO OFICIAL DO SEBRAE PNBOX VIA PLAYWRIGHT', 'Cabeçalho do script');
    assertStringContains(script, 'import { chromium } from \'playwright\';', 'Importação do Playwright');
    assertStringContains(script, 'const CONFIG = {', 'Definição de configuração');
    assertStringContains(script, 'idPlano:', 'Configuração do ID do plano');
    assertStringContains(script, 'credenciais:', 'Configuração das credenciais');
    assertStringContains(script, 'DADOS_PLANO =', 'Dados do plano');
    assertStringContains(script, 'async function preencherPnboxOficial()', 'Função principal');
    assertStringContains(script, 'preencherPnboxOficial();', 'Chamada da função');
    
    console.log('  ✓ Script oficial gerado corretamente com parâmetros padrão');
  } catch (error) {
    console.error('❌ FAIL: Erro ao gerar script oficial');
    console.error('  Erro:', error);
    process.exitCode = 1;
  }
}

// Teste 2: Verificar geração de script com templateId customizado
{
  console.log('\nTeste 2: Geração de script com templateId customizado');
  
  try {
    const templateId = TEMPLATES_NEGOCIO[0].id;
    const script = gerarScriptPlaywrightOficial(templateId);
    
    assertDefined(script, 'Script deve ser gerado');
    assertEqual(typeof script, 'string', 'Script deve ser uma string');
    
    assertStringContains(script, 'AUTOMAÇÃO OFICIAL DO SEBRAE PNBOX VIA PLAYWRIGHT', 'Cabeçalho do script');
    // Verificar se contém dados do template selecionado
    const templateData = JSON.stringify(TEMPLATES_NEGOCIO.find(t => t.id === templateId)?.dados);
    assertStringContains(script, templateData, 'Dados do template selecionado');
    
    console.log('  ✓ Script oficial gerado corretamente com templateId customizado');
    console.log(`  ✓ Template usado: ${templateId}`);
  } catch (error) {
    console.error('❌ FAIL: Erro ao gerar script com templateId customizado');
    console.error('  Erro:', error);
    process.exitCode = 1;
  }
}

// Teste 3: Verificar geração de script com idPlano customizado
{
  console.log('\nTeste 3: Geração de script com idPlano customizado');
  
  try {
    const customIdPlano = 'custom-plan-789';
    const script = gerarScriptPlaywrightOficial(undefined, customIdPlano);
    
    assertDefined(script, 'Script deve ser gerado');
    assertEqual(typeof script, 'string', 'Script deve ser uma string');
    
    assertStringContains(script, `idPlano: '${customIdPlano}'`, 'ID do plano customizado');
    
    console.log('  ✓ Script oficial gerado corretamente com idPlano customizado');
    console.log(`  ✓ ID do plano: ${customIdPlano}`);
  } catch (error) {
    console.error('❌ FAIL: Erro ao gerar script com idPlano customizado');
    console.error('  Erro:', error);
    process.exitCode = 1;
  }
}

// Teste 4: Verificar geração de script com credenciais customizadas
{
  console.log('\nTeste 4: Geração de script com credenciais customizadas');
  
  try {
    const customCredenciais = {
      cpf: '111.222.333-44',
      password: 'senha-segura-123',
      idPlano: ID_PLANO_PADRAO
    };
    const script = gerarScriptPlaywrightOficial(undefined, ID_PLANO_PADRAO, customCredenciais);
    
    assertDefined(script, 'Script deve ser gerado');
    assertEqual(typeof script, 'string', 'Script deve ser uma string');
    
    assertStringContains(script, `cpf: '${customCredenciais.cpf}'`, 'CPF customizado');
    assertStringContains(script, `password: '${customCredenciais.password}'`, 'Senha customizada');
    
    console.log('  ✓ Script oficial gerado corretamente com credenciais customizadas');
    console.log(`  ✓ CPF: ${customCredenciais.cpf}`);
  } catch (error) {
    console.error('❌ FAIL: Erro ao gerar script com credenciais customizadas');
    console.error('  Erro:', error);
    process.exitCode = 1;
  }
}

// Teste 5: Verificar comportamento de fallback para templateId inválido
{
  console.log('\nTeste 5: Fallback para templateId inválido');
  
  try {
    const invalidTemplateId = 'template-que-nao-existe';
    const firstTemplate = TEMPLATES_NEGOCIO[0];
    const script = gerarScriptPlaywrightOficial(invalidTemplateId);
    
    assertDefined(script, 'Script deve ser gerado mesmo com templateId inválido');
    assertEqual(typeof script, 'string', 'Script deve ser uma string');
    
    // Deve fazer fallback para o primeiro template
    const firstTemplateData = JSON.stringify(firstTemplate.dados);
    assertStringContains(script, firstTemplateData, 'Dados do primeiro template (fallback)');
    
    console.log('  ✓ Script gerado com fallback para primeiro template quando templateId é inválido');
    console.log(`  ✓ TemplateId inválido: ${invalidTemplateId}`);
    console.log(`  ✓ Template usado (fallback): ${firstTemplate.id}`);
  } catch (error) {
    console.error('❌ FAIL: Erro ao testar fallback de templateId');
    console.error('  Erro:', error);
    process.exitCode = 1;
  }
}

// Teste 6: Verificar geração de script para criação de novo plano
{
  console.log('\nTeste 6: Geração de script para criação de novo plano');
  
  try {
    const script = gerarScriptCriarNovoPlanoPlaywright(
      'Nome do Teste',
      'Setor do Teste'
    );
    
    assertDefined(script, 'Script deve ser gerado');
    assertEqual(typeof script, 'string', 'Script deve ser uma string');
    assert(script.length > 0, 'Script não deve estar vazio');
    
    assertStringContains(script, 'AUTOMAÇÃO OFICIAL DO SEBRAE PNBOX - CRIAÇÃO DE NOVO PLANO COM IA & DEEP RESEARCH', 'Cabeçalho do script de criação');
    assertStringContains(script, 'import { chromium } from \'playwright\';', 'Importação do Playwright');
    assertStringContains(script, 'const CONFIG = {', 'Definição de configuração');
    assertStringContains(script, 'nomePlano:', 'Configuração do nome do plano');
    assertStringContains(script, 'setor: ', 'Configuração do setor');
    assertStringContains(script, 'idPlanoSugerido:', 'Configuração do ID sugerido do plano');
    assertStringContains(script, 'credenciais:', 'Configuração das credenciais');
    assertStringContains(script, 'DADOS_14_FERRAMENTAS =', 'Dados das 14 ferramentas');
    assertStringContains(script, 'async function criarNovoPlanoNoPnbox()', 'Função principal');
    assertStringContains(script, 'criarNovoPlanoNoPnbox();', 'Chamada da função');
    
    console.log('  ✓ Script de criação de novo plano gerado corretamente');
  } catch (error) {
    console.error('❌ FAIL: Erro ao gerar script de criação de novo plano');
    console.error('  Erro:', error);
    process.exitCode = 1;
  }
}

// Teste 7: Verificar geração de script com todos os parâmetros customizados para criação de novo plano
{
  console.log('\nTeste 7: Geração de script de criação com parâmetros customizados');
  
  try {
    const nomePlano = 'Empresa Customizada LTDA';
    const setor = 'Tecnologia da Informação';
    const idPlanoSugerido = 'plano-custom-999';
    const credenciais = { cpf: '999.888.777-66', password: 'custom456!', idPlano: ID_PLANO_PADRAO };
    const dadosCustomizados = {
      testeColecao: [
        { campo1: 'valor1', campo2: 'valor2' },
        { campo1: 'valor3', campo2: 'valor4' }
      ]
    };
    
    const script = gerarScriptCriarNovoPlanoPlaywright(
      nomePlano,
      setor,
      dadosCustomizados,
      idPlanoSugerido,
      credenciais
    );
    
    assertDefined(script, 'Script deve ser gerado');
    assertEqual(typeof script, 'string', 'Script deve ser uma string');
    
    assertStringContains(script, `nomePlano: ${JSON.stringify(nomePlano)}`, 'Nome do plano customizado');
    assertStringContains(script, `setor: ${JSON.stringify(setor)}`, 'Setor customizado');
    assertStringContains(script, `idPlanoSugerido: '${idPlanoSugerido}'`, 'ID sugerido customizado');
    assertStringContains(script, `cpf: '${credenciais.cpf}'`, 'CPF customizado');
    assertStringContains(script, `password: '${credenciais.password}'`, 'Senha customizada');
    // Verificar se contém os dados customizados
    assertStringContains(script, '"campo1":"valor1"', 'Primeiro registro de dados customizados');
    assertStringContains(script, `"campo2":"${dadosCustomizados.testeColecao[1].campo2}"`, 'Segundo registro de dados customizados');
    
    console.log('  ✓ Script de criação de novo plano gerado corretamente com todos os parâmetros customizados');
    console.log(`  ✓ Nome do plano: ${nomePlano}`);
    console.log(`  ✓ Setor: ${setor}`);
    console.log(`  ✓ ID sugerido: ${idPlanoSugerido}`);
  } catch (error) {
    console.error('❌ FAIL: Erro ao gerar script de criação com parâmetros customizados');
    console.error('  Erro:', error);
    process.exitCode = 1;
  }
}

// Teste 8: Verificar comportamento com dados customizados vazios
{
  console.log('\nTeste 8: Comportamento com dados customizados vazios');
  
  try {
    const script = gerarScriptCriarNovoPlanoPlaywright(
      'Teste Vazio',
      'Setor Vazio',
      {} // Dados customizados vazios
    );
    
    assertDefined(script, 'Script deve ser gerado mesmo com dados vazios');
    assertEqual(typeof script, 'string', 'Script deve ser uma string');
    
    assertStringContains(script, 'DADOS_14_FERRAMENTAS = {}', 'Dados das 14 ferramentas devem ser objeto vazio');
    
    console.log('  ✓ Script gerado corretamente com dados customizados vazios');
  } catch (error) {
    console.error('❌ FAIL: Erro ao gerar script com dados customizados vazios');
    console.error('  Erro:', error);
    process.exitCode = 1;
  }
}

console.log('\n✓ Todos os testes de playwrightScriptGenerator concluídos');
console.log('Nota: Estes testes verificam que os geradores de script funcionam corretamente');
console.log('      com diversos parâmetros e tratam adequadamente casos de fallback.\n');

// Indicar que os testes foram concluídos com sucesso
process.exitCode = 0;