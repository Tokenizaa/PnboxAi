// MCP client p/ chamar o MCP server oficial do Supabase via stdio.
// Aplica a migration 009 (pnbox_credentials) usando apply_migration.
// Uso: node scripts/supabase-mcp.mjs <sql-file>
import { readFileSync } from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!ACCESS_TOKEN) { console.error('Missing SUPABASE_ACCESS_TOKEN'); process.exit(1); }
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
if (!PROJECT_REF) { console.error('Missing SUPABASE_PROJECT_REF'); process.exit(1); }
const SERVER_BIN = new URL('../node_modules/@supabase/mcp-server-supabase/dist/transports/stdio.js', import.meta.url).pathname;

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('uso: node scripts/supabase-mcp.mjs <sql-file> [migration-name]');
  process.exit(1);
}
const query = readFileSync(sqlFile, 'utf8');
const name = process.argv[3] || `mcp_apply_${Date.now()}`;

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [SERVER_BIN, '--access-token', ACCESS_TOKEN, '--project-ref', PROJECT_REF],
});

const client = new Client({ name: 'dsh-supabase-mcp', version: '1.0.0' });

async function tryTool(name, args) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  console.log(`-- ${name} => ${res.isError ? 'ERROR' : 'OK'}\n${text}\n`);
}

try {
  await client.connect(transport);
  const tools = await client.listTools();
  console.log('tools:', tools.tools.map((t) => t.name).join(', '));

  const exists = await tryTool('execute_sql', {
    query: "select 1 from pg_tables where schemaname='public' and tablename='pnbox_credentials'",
  });

  await tryTool('apply_migration', { name, query });

  await tryTool('execute_sql', {
    query: "select column_name, data_type from information_schema.columns where table_schema='public' and table_name='pnbox_credentials'",
  });
} finally {
  await client.close();
}
