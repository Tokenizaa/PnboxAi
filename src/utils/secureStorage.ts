/**
 * Armazenamento local opcional de credenciais PNBOX.
 *
 * Isto NÃO é fonte de verdade nem sessão de autenticação. A sessão oficial
 * permanece no backend/PNBOX. Quando usado, o vault local aceita somente
 * Web Crypto AES-GCM; nunca cai para XOR ou outra cifra improvisada.
 */

export interface SecurePnboxCredentials {
  cpf: string;
  idPlano?: string;
  password?: string;
  salvoEm?: string;
}

const STORAGE_KEY = 'pnbox_sec_vault_v1';
const SALT_KEY = 'pnbox_sec_salt_v1';

function requireWebCrypto(): Crypto {
  if (!window.crypto?.subtle || !window.crypto.getRandomValues) {
    throw new Error('WEBCRYPTO_REQUIRED: o armazenamento local seguro não está disponível neste navegador.');
  }
  return window.crypto;
}

function getOrCreateSalt(): Uint8Array {
  const crypto = requireWebCrypto();
  const raw = localStorage.getItem(SALT_KEY);
  if (raw) {
    const matches = raw.match(/.{1,2}/g) || [];
    if (matches.length === 16 && matches.every((byte) => /^[0-9a-f]{2}$/i.test(byte))) {
      return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
    }
    localStorage.removeItem(SALT_KEY);
  }

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  localStorage.setItem(SALT_KEY, Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join(''));
  return salt;
}

async function deriveEncryptionKey(salt: Uint8Array): Promise<CryptoKey> {
  const crypto = requireWebCrypto();
  const deviceSeed = `${window.location.origin}_pnbox_secure_app_${navigator.userAgent.slice(0, 32)}`;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(deviceSeed),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function saveEncryptedPnboxCredentials(creds: SecurePnboxCredentials): Promise<boolean> {
  try {
    if (!creds.cpf.trim()) throw new Error('CPF obrigatório.');
    if (creds.idPlano !== undefined && (!creds.idPlano.trim() || creds.idPlano === ':idPlano' || creds.idPlano.startsWith('plano_'))) {
      throw new Error('ID real do plano PNBOX obrigatório.');
    }

    const crypto = requireWebCrypto();
    const key = await deriveEncryptionKey(getOrCreateSalt());
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    const payload = JSON.stringify({ ...creds, salvoEm: new Date().toISOString() });
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(payload));

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mode: 'aes-gcm-256',
      iv: Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join(''),
      cipher: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    }));
    return true;
  } catch (err) {
    console.warn('[SecureStorage] armazenamento seguro indisponível:', err);
    return false;
  }
}

export async function getEncryptedPnboxCredentials(): Promise<SecurePnboxCredentials | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { mode?: string; iv?: string; cipher?: string };
    if (parsed.mode !== 'aes-gcm-256' || !parsed.iv || !parsed.cipher) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const ivMatches = parsed.iv.match(/.{1,2}/g) || [];
    if (ivMatches.length !== 12 || !ivMatches.every((byte) => /^[0-9a-f]{2}$/i.test(byte))) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const crypto = requireWebCrypto();
    const key = await deriveEncryptionKey(getOrCreateSalt());
    const iv = new Uint8Array(ivMatches.map((byte) => parseInt(byte, 16)));
    const cipherBinary = atob(parsed.cipher);
    const cipherBytes = new Uint8Array(cipherBinary.length);
    for (let i = 0; i < cipherBinary.length; i++) cipherBytes[i] = cipherBinary.charCodeAt(i);

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
    return JSON.parse(new TextDecoder().decode(decrypted)) as SecurePnboxCredentials;
  } catch (err) {
    console.warn('[SecureStorage] não foi possível recuperar credenciais locais:', err);
    return null;
  }
}

export function clearEncryptedPnboxCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SALT_KEY);
}

export function hasEncryptedPnboxCredentials(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
