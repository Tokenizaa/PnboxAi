import { Request, Response, NextFunction } from 'express';

// 1. Headers de Segurança HTTP
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

// 2. Rate Limiter em Memória (Janela Deslizante)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Limpa registros expirados a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export function rateLimiter(options: { windowMs: number; maxRequests: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Ignorar em ambiente de testes automatizados
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + options.windowMs };
      rateLimitStore.set(key, record);
      return next();
    }

    record.count++;
    if (record.count > options.maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      return res.status(429).json({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Muitas requisições. Aguarde antes de tentar novamente.',
        retryAfterSeconds: retryAfter
      });
    }

    next();
  };
}

// 3. Middleware Global de Tratamento Seguro de Erros
export function safeErrorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  // Mascarar stack trace e segredos em produção
  const isProd = process.env.NODE_ENV === 'production';
  const statusCode = err.status || err.statusCode || 500;

  console.error(`[API Error] ${req.method} ${req.url} - Status: ${statusCode}`, {
    message: err.message,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    stack: isProd ? undefined : err.stack
  });

  // Mensagem segura para o cliente
  const clientMessage = isProd && statusCode === 500
    ? 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.'
    : (err.message || 'Erro interno.');

  res.status(statusCode).json({
    status: 'error',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: clientMessage
  });
}
