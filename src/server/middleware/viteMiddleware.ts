import express from 'express';
import path from 'path';

export function configureViteMiddleware(app) {
  // Only apply in development
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    // Initialize Vite middleware asynchronously
    (async () => {
      try {
        const vite = await (await import('vite')).createViteServer({
          server: { middlewareMode: true },
          appType: 'spa'
        });
        app.use(vite.middlewares);
      } catch (error) {
        console.error('Failed to initialize Vite middleware:', error);
      }
    })();
  } else {
    // Production: serve static files
    const distPath = path.join(process.cwd(), 'dist');
    console.log('[DEBUG] Serving static from:', distPath);
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      console.log('[DEBUG] Fallback for:', req.path);
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}