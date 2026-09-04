#!/usr/bin/env node
/**
 * Test runner para os testes de automação
 * Roda todos os testes de automação em sequência
 */
import { execSync } from 'child_process';

console.log('🧪 Iniciando execução dos testes de automação...\n');

try {
  // Executar testes de geminiDeepResearch
  console.log('📋 Executando testes de geminiDeepResearch...');
  execSync('npx tsx src/autonomy/__tests__/geminiDeepResearch.test.ts', { stdio: 'inherit' });
  console.log('✅ Testes de geminiDeepResearch concluídos\n');

  // Executar testes de playwrightScriptGenerator
  console.log('📋 Executando testes de playwrightScriptGenerator...');
  execSync('npx tsx src/autonomy/__tests__/playwrightScriptGenerator.test.ts', { stdio: 'inherit' });
  console.log('✅ Testes de playwrightScriptGenerator concluídos\n');

  console.log('🎉 Todos os testes foram executados com sucesso!');
  process.exit(0);
} catch (error) {
  console.error('❌ Falha na execução dos testes:');
  console.error(error.message);
  process.exit(1);
}