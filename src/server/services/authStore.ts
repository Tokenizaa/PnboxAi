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

/**
 * Cria um cliente Supabase associado ao token de acesso do usuário autenticado.
 * Essencial para respeitar políticas RLS (ex: auth.uid() = user_id).
 */
export function getSupabaseUserClient(token?: string): SupabaseClient | null {
  if (!SUPABASE_URL || !token || token.startsWith('local_token_')) {
    return null;
  }
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

export interface LocalUserAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export const LOCAL_USERS: Map<string, LocalUserAccount> = new Map();
export const LOCAL_CREDENTIALS: Map<string, { cpf: string; password: string; idPlano: string; updatedAt: string }> = new Map();

export function createLocalToken(userId: string, email: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, email, exp: Date.now() + 86400000 })).toString('base64');
  return `local_token_${userId}_${payload}`;
}

export function verifyLocalToken(token: string): { id: string; email: string; name: string } | null {
  if (!token.startsWith('local_token_')) return null;
  try {
    const withoutPrefix = token.substring('local_token_'.length);
    const lastUnderscoreIndex = withoutPrefix.lastIndexOf('_');
    if (lastUnderscoreIndex === -1) return null;
    const payloadPart = withoutPrefix.substring(lastUnderscoreIndex + 1);
    const data = JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf8'));
    if (data.exp && data.exp < Date.now()) return null;
    const user = LOCAL_USERS.get(data.userId);
    if (user) {
      return { id: user.id, email: user.email, name: user.name };
    }
    return { id: data.userId, email: data.email, name: (data.email || 'usuário').split('@')[0] };
  } catch {
    return null;
  }
}

const ENCRYPTION_KEY = process.env.PNBOX_CRED_ENCRYPTION_KEY?.trim() || '';

function deriveKey(): Buffer {
  const salt = Buffer.from('pnbox-cred-salt-v1', 'utf8');
  return scryptSync(ENCRYPTION_KEY || 'default-pnbox-key-fallback-32b', salt, 32);
}

export function encryptPnboxPassword(plaintext: string): string {
  if (!ENCRYPTION_KEY) return plaintext;
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptPnboxPassword(encrypted: string): string {
  if (!ENCRYPTION_KEY) return encrypted;
  try {
    const key = deriveKey();
    const [ivB64, authTagB64, ciphertextB64] = encrypted.split(':');
    if (!ivB64 || !authTagB64 || !ciphertextB64) return encrypted;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  } catch {
    return encrypted;
  }
}

export async function getUserFromToken(token: string): Promise<{ id: string; email: string; name: string } | null> {
  if (!token) return null;
  if (!supabase || token.startsWith('local_token_')) {
    return verifyLocalToken(token);
  }

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
  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'Token inválido ou expirado' });
  }
  (req as any).user = user;
  next();
}

export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);
    if (user) {
      (req as any).user = user;
    }
  }
  next();
}
