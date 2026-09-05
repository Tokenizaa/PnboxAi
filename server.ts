// Primeiro import: garante .env carregado antes de módulos que leem process.env em module scope
import './src/server/dotenv-init';
import express from 'express';
import path from 'path';
import { createServer } from "vite";
import { authMiddleware } from "./src/server/middleware/authMiddleware";

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

// Start server
async function startServer() {
  console.log("[DEBUG] Starting server...");
  console.log("[DEBUG] NODE_ENV:", process.env.NODE_ENV);
  console.log("[DEBUG] VERCEL:", process.env.VERCEL);
  // Initialize Vite if in development
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    try {
      console.log("[DEBUG] Creating Vite server...");
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
      console.log("[DEBUG] Vite server created and middleware added");
      console.log("[DEBUG] Vite middleware added");
    } catch (error) {
      console.error('Failed to initialize Vite middleware:', error);
      process.exit(1);
    }
  } else {
    // Production: serve static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    console.log("[DEBUG] Static files middleware added");
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start server
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", (err) => {
    if (err) {
      console.error("[DEBUG] Listen error:", err);
      process.exit(1);
    }
    console.log(`[PNBOX Hub] Server running at http://0.0.0.0:${PORT}`);
    console.log(`[PNBOX Hub] Server running at http://0.0.0.0:${PORT}`);
    console.log("[DEBUG] Server listening on port", PORT);
  });
}

// Start server
async function run() {
  try {
    // Register routes
    registerAuthRoutes(app);
    registerPNBoxCredentialsRoutes(app);
    registerPNBoxConnectionRoutes(app);
    registerPlansRoutes(app);
    registerResearchRoutes(app);
    registerAutomationRoutes(app);
    registerSystemRoutes(app);

    // Start the server
    await startServer();
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

run();
