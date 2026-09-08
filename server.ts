// Primeiro import: garante .env carregado antes de módulos que leem process.env em module scope
import './src/server/dotenv-init';
import express from 'express';
import path from 'path';
import { createServer } from 'vite';

// Import route registration functions
import { registerAuthRoutes } from './src/server/routes/auth.routes';
import { registerPNBoxCredentialsRoutes } from './src/server/routes/pnbox-credentials.routes';
import { registerPNBoxConnectionRoutes } from './src/server/routes/pnbox-connection.routes';
import { registerPlansRoutes } from './src/server/routes/plans.routes';
import { registerResearchRoutes } from './src/server/routes/research.routes';
import { registerAutomationRoutes } from './src/server/routes/automation.routes';
import { registerSystemRoutes } from './src/server/routes/system.routes';
import { securityHeadersMiddleware, safeErrorHandler } from './src/server/middleware/security.middleware';

const app = express();
app.use(securityHeadersMiddleware);
app.use(express.json({ limit: '10mb' }));

// Register API routes
registerAuthRoutes(app);
registerPNBoxCredentialsRoutes(app);
registerPNBoxConnectionRoutes(app);
registerPlansRoutes(app);
registerResearchRoutes(app);
registerAutomationRoutes(app);
registerSystemRoutes(app);

// Safe API error handling
app.use(safeErrorHandler);

const PORT = 3000;

async function startServer() {
  // Setup Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    try {
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
      console.log('[PNBOX Hub] Vite middleware mounted');
    } catch (error) {
      console.error('[PNBOX Hub] Failed to initialize Vite middleware:', error);
      process.exit(1);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PNBOX Hub] Server running at http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('[PNBOX Hub] Server listen error:', err);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('[PNBOX Hub] Fatal startup error:', err);
  process.exit(1);
});
