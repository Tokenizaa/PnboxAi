import express from 'express';
import { createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from "./src/server/middleware/authMiddleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
app.use(express.json({ limit: '10mb' }));

// Register authentication middleware for protected routes
// Note: Auth routes themselves are excluded from this middleware in authMiddleware.ts

// Import and register route modules
import { registerAuthRoutes } from './src/server/routes/auth.routes';
import { registerPNBoxCredentialsRoutes } from './src/server/routes/pnbox-credentials.routes';
import { registerPNBoxConnectionRoutes } from './src/server/routes/pnbox-connection.routes';
import { registerPlansRoutes } from './src/server/routes/plans.routes';
import { registerResearchRoutes } from './src/server/routes/research.routes';
import { registerAutomationRoutes } from './src/server/routes/automation.routes';
import { registerSystemRoutes } from './src/server/routes/system.routes';

// Register all API routes
registerAuthRoutes(app);
registerPNBoxCredentialsRoutes(app);
registerPNBoxConnectionRoutes(app);
registerPlansRoutes(app);
registerResearchRoutes(app);
registerAutomationRoutes(app);
registerSystemRoutes(app);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Vite middleware setup (only in development)
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
