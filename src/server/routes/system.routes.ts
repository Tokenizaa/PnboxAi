import { Router, Express } from 'express';
import { isSupabaseConfigured } from '../services/authStore';

const router = Router();

router.get('/status', (req, res) => {
  const nvidiaKey = process.env.NVIDIA_API_KEY?.trim() || '';
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const searchKey = process.env.GOOGLE_SEARCH_API_KEY?.trim() || '';
  const searchCx = process.env.GOOGLE_SEARCH_ENGINE_ID?.trim() || '';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      hasNvidiaKey: !!nvidiaKey,
      hasGeminiKey: !!geminiKey,
      hasSupabaseUrl: isSupabaseConfigured,
      hasSearchKey: !!searchKey,
      hasSearchCx: !!searchCx,
      nodeEnv: process.env.NODE_ENV || 'development',
    },
    services: {
      ai: nvidiaKey ? 'nvidia' : (geminiKey ? 'gemini' : 'mock'),
      database: isSupabaseConfigured ? 'supabase' : 'local_memory',
      search: searchKey && searchCx ? 'google_custom_search' : 'stub'
    }
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export function registerSystemRoutes(app: Express) {
  app.use('/api/system', router);
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}
