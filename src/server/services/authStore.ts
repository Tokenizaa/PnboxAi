import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { Request, Response, NextFunction } from 'express';

const SUPABASE_URL = process.env.SUPABASE_URL?.trim() || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_SERVICE_ROLE_KEY &&
  (SUPABASE_URL.startsWith('http://') || SUPABASE_URL.startsWith('https://'))
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export function getSupabaseUserClient(token?: string): SupabaseClient | null {
  if (!SUPABASE_URL || !token) return null;
  return createClient(SUPABASE_URL, token, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

const ENCRYPTION_KEY = process.env.PNBOX_CRED_ENCRYPTION_KEY?.trim() || '';

function requireEncryptionKey(): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('PNBOX_CRED_ENCRYPTION_KEY não configurada');
  }
  return ENCRYPTION_KEY;
}

function deriveKey(): Buffer {
  const salt = Buffer.from('pnbox-cred-salt-v1', 'utf8');
  return scryptSync(requireEncryptionKey(), salt, 32);
}

export function encryptPnboxPassword(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptPnboxPassword(encrypted: string): string {
  const key = deriveKey();
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Credencial PNBOX armazenada em formato inválido');
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  if (iv.length !== 12 || authTag.length !== 16 || ciphertext.length === 0) {
    throw new Error('Credencial PNBOX armazenada inválida');
  }

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

export async function getUserFromToken(token: string): Promise<{ id: string; email: string; name: string } | null> {
  if (!token || !supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
    };
  } catch {
    return null;
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Token de acesso não fornecido' });
  }
  if (!isSupabaseConfigured || !supabase) {
    return res.status(503).json({ status: 'error', message: 'Serviço de autenticação indisponível' });
  }

  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'Token inválido ou expirado' });
  }
  (req as any).user = user;
  return next();
}

export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ') && supabase) {
    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);
    if (user) {
      (req as any).user = user;
    }
  }
  return next();
}
