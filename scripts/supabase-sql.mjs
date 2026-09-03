// Executa SQL arbitrário (read) no Supabase via MCP server oficial (HTTP/management API).
// Uso: node scripts/supabase-sql.mjs '<sql>'
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!ACCESS_TOKEN) { console.error('Missing SUPABASE_ACCESS_TOKEN'); process.exit(1); }
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
if (!PROJECT_REF) { console.error('Missing SUPABASE_PROJECT_REF'); process.exit(1); }
const SERVER_BIN = new URL('../node_modules/@supabase/mcp-server-supabase/dist/transports/stdio.js', import.meta.url).pathname;

const sql = process.argv[2];
if (!sql) {
  console.error('uso: node scripts/supabase-sql.mjs "<sql>"');
  process.exit(1);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [SERVER_BIN, '--access-token', ACCESS_TOKEN, '--project-ref', PROJECT_REF],
});
const client = new Client({ name: 'dsh-supabase-mcp', version: '1.0.0' });

try {
  await client.connect(transport);
  const res = await client.callTool({ name: 'execute_sql', arguments: { query: sql } });
  const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  console.log(text);
  process.exit(res.isError ? 1 : 0);
} finally {
  await client.close();
}
