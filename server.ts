import express from 'express';
import { createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { popularEventosIniciaisDescoberta, ID_PLANO_PADRAO } from './src/automation/realRunner.ts';
import { authenticateToken } from './src/automation/auth.ts';
import { executeResearch } from './src/research/ResearchEngine.ts';
import { getPlanos, createPlano, updatePlano, deletePlano, duplicatePlano, archivePlano } from './src/skills/database/index.ts';
import { preencheFerramenta } from './src/automation/officialRunner.ts';
import { executarPesquisaUnificada } from './src/automation/aiProviders.ts';
import { gerarSchema } from './src/utils/schemaGenerator.ts';
import { validateSchema } from './src/automation/schemaValidator.ts';
import { getPNBOXCredentials, savePNBOXCredentials, testPNBOXConnection } from './src/automation/oidcPnboxPlaywright.ts';
import { getBusinessTemplate, listBusinessTemplates } from './src/automation/businessTemplates.ts';
import { getDashboardStats } from './src/skills/dashboard/index.ts';
import { executePlan } from './src/automation/ddpClient.ts';
import { getGeminiDeepResearch } from './src/automation/geminiDeepResearch.ts';
import { getPlaywrightScript } from './src/automation/playwrightScriptGenerator.ts';
import { getRealRunnerStatus } from './src/automation/realRunner.ts';

// Initialize Express app
const app = express();
app.use(express.json({ limit: '10mb' }));

// Popular tráfego de laboratório inicial
popularEventosIniciaisDescoberta(ID_PLANO_PADRAO);

// ===== ALL ROUTES GO HERE =====
// [All the app.post, app.get, etc. routes from the original server.ts]

// Vite middleware setup - only in development, not in Vercel
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  (async () => {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } catch (error) {
      console.error('Failed to initialize Vite middleware:', error);
    }
  })();
} else {
  const distPath = path.join(process.cwd(), 'dist');
  console.log('[DEBUG] Serving static from:', distPath);
  app.use(express.static(distPath, { index: false }));
  app.get('*', (req, res) => {
    console.log('[DEBUG] Fallback for:', req.path);
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server only if not running in Vercel (serverless environment)
if (process.env.VERCEL !== '1') {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PNBOX Hub] Server running at http://0.0.0.0:${PORT}`);
  });
}

// Export the Express app for use in Vercel serverless functions
export default app;
