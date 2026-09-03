/**
 * SecureStorage - Criptografia local para dados de autenticação sensíveis (CPF, ID Plano, Senha)
 * Utiliza a Web Crypto API (AES-GCM 256 bits) com salt derivado localmente.
 * Garante que os dados de acesso nunca fiquem em texto claro no localStorage/IndexedDB.
 */

export interface SecurePnboxCredentials {
  cpf: string;
  idPlano: string;
  password?: string;
  salvoEm?: string;
}

const STORAGE_KEY = 'pnbox_sec_vault_v1';
const SALT_KEY = 'pnbox_sec_salt_v1';

/**
 * Obtém ou gera um Salt persistente para a derivação de chave local
 */
function getOrCreateSalt(): Uint8Array {
  let raw = localStorage.getItem(SALT_KEY);
  if (!raw) {
    const saltBytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(saltBytes);
    } else {
      for (let i = 0; i < 16; i++) {
        saltBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    raw = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(SALT_KEY, raw);
  }

  const matches = raw.match(/.{1,2}/g) || [];
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

/**
 * Deriva uma CryptoKey AES-GCM usando PBKDF2 a partir de semente do dispositivo
 */
async function deriveEncryptionKey(salt: Uint8Array): Promise<CryptoKey | null> {
  if (!window.crypto || !window.crypto.subtle) {
    return null;
  }

  try {
    // Semente baseada no domínio e identificador local do navegador
    const deviceSeed = `${window.location.origin}_pnbox_secure_app_${navigator.userAgent.slice(0, 32)}`;
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(deviceSeed),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (e) {
    console.warn('[SecureStorage] WebCrypto deriveKey falhou:', e);
    return null;
  }
}

/**
 * Salva credenciais criptografadas com AES-GCM
 */
export async function saveEncryptedPnboxCredentials(creds: SecurePnboxCredentials): Promise<boolean> {
  try {
    const payload = JSON.stringify({
      ...creds,
      salvoEm: new Date().toISOString()
    });

    const salt = getOrCreateSalt();
    const key = await deriveEncryptionKey(salt);

    if (key && window.crypto.subtle) {
      // Vetor de Inicialização (IV) de 12 bytes para AES-GCM
      const iv = new Uint8Array(12);
      window.crypto.getRandomValues(iv);

      const enc = new TextEncoder();
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(payload)
      );

      const record = {
        mode: 'aes-gcm-256',
        iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
        cipher: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)))
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      return true;
    } else {
      // Fallback com XOR cifrado e codificação Base64 para ambientes sem WebCrypto Subtle
      const cipher = btoa(encodeURIComponent(payload).split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ (salt[i % salt.length] || 42))
      ).join(''));

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'safe-xor', cipher }));
      return true;
    }
  } catch (err) {
    console.warn('[SecureStorage] Falha ao criptografar credenciais:', err);
    return false;
  }
}

/**
 * Recupera e decodifica as credenciais salvas
 */
export async function getEncryptedPnboxCredentials(): Promise<SecurePnboxCredentials | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const salt = getOrCreateSalt();

    if (parsed.mode === 'aes-gcm-256' && parsed.iv && parsed.cipher) {
      const key = await deriveEncryptionKey(salt);
      if (!key || !window.crypto.subtle) return null;

      const ivMatches = parsed.iv.match(/.{1,2}/g) || [];
      const iv = new Uint8Array(ivMatches.map((byte: string) => parseInt(byte, 16)));

      const cipherBinary = atob(parsed.cipher);
      const cipherBytes = new Uint8Array(cipherBinary.length);
      for (let i = 0; i < cipherBinary.length; i++) {
        cipherBytes[i] = cipherBinary.charCodeAt(i);
      }

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipherBytes
      );

      const dec = new TextDecoder();
      return JSON.parse(dec.decode(decrypted)) as SecurePnboxCredentials;
    } else if (parsed.mode === 'safe-xor' && parsed.cipher) {
      const decodedStr = atob(parsed.cipher);
      const plainEncoded = decodedStr.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ (salt[i % salt.length] || 42))
      ).join('');
      return JSON.parse(decodeURIComponent(plainEncoded)) as SecurePnboxCredentials;
    }

    return null;
  } catch (err) {
    console.warn('[SecureStorage] Falha ao descriptografar credenciais salvas:', err);
    return null;
  }
}

/**
 * Remove credenciais criptografadas locais
 */
export function clearEncryptedPnboxCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Verifica se já existem credenciais criptografadas salvas
 */
export function hasEncryptedPnboxCredentials(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}
