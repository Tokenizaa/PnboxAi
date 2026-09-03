// Playwright MCP client — spawna `playwright-mcp` e conecta via SDK.
// Uso: node scripts/playwright-mcp.mjs <command> [args...]
// Comandos:
//   navigate <url>
//   snapshot [mode] --full|none
//   click <selector>
//   type <selector> <text>
//   evaluate <js>
//   wait_for <selector>
//   close
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const SERVER_BIN = new URL('../node_modules/@playwright/mcp/cli.js', import.meta.url).pathname;

const cmd = process.argv[2];
const args = process.argv.slice(3);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [
    SERVER_BIN,
    '--allowed-hosts', '*',
    '--viewport-size', '1280x720',
    '--timeout-action', '10000',
    '--timeout-navigation', '30000',
    '--user-data-dir', '/home/lg/workspace/projects/AdeusMultas-Defesa-/PnboxAi/.playwright-user-data',
    '--shared-browser-context',
  ],
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: '/home/lg/workspace/projects/AdeusMultas-Defesa-/PnboxAi/.playwright-browsers',
    PLAYWRIGHT_CACHE_DIR: '/home/lg/workspace/projects/AdeusMultas-Defesa-/PnboxAi/.playwright-cache',
  },
});

const client = new Client({ name: 'dsh-playwright-mcp', version: '1.0.0' });

async function callTool(name, toolArgs) {
  const res = await client.callTool({ name, arguments: toolArgs });
  const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  if (res.isError) console.error('ERROR:', text);
  else console.log(text);
}

async function main() {
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    console.log('Tools:', tools.tools.map((t) => t.name).join(', '));

    if (!cmd) {
      console.log('Uso: node scripts/playwright-mcp.mjs <navigate|snapshot|click|type|evaluate|wait_for|close> [args...]');
      return;
    }

    switch (cmd) {
      case 'navigate': {
        const url = args[0] || 'http://127.0.0.1:3000/';
        await callTool('browser_navigate', { url });
        break;
      }
      case 'snapshot': {
        const mode = args[0] || 'full';
        await callTool('browser_snapshot', { mode });
        break;
      }
      case 'click': {
        const selector = args[0];
        if (!selector) throw new Error('click precisa de selector');
        await callTool('browser_click', { selector });
        break;
      }
      case 'type': {
        const selector = args[0];
        const text = args.slice(1).join(' ');
        if (!selector || !text) throw new Error('type precisa de selector e texto');
        await callTool('browser_type', { selector, text });
        break;
      }
      case 'evaluate': {
        const js = args.join(' ');
        if (!js) throw new Error('evaluate precisa de código JS');
        await callTool('browser_evaluate', { expression: js });
        break;
      }
      case 'wait_for': {
        const selector = args[0];
        if (!selector) throw new Error('wait_for precisa de selector');
        await callTool('browser_wait_for', { selector });
        break;
      }
      case 'close': {
        await callTool('browser_close', {});
        break;
      }
      default:
        console.error('Comando desconhecido:', cmd);
    }
  } finally {
    await client.close();
  }
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });