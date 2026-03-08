// AES-GCM encryption with PBKDF2-derived key from master password
// Uses Web Crypto API (built into browsers)

const SALT_KEY = 'ssh-manager-salt';
const VERIFY_KEY = 'ssh-manager-verify';
const VERIFY_PLAINTEXT = 'ssh-manager-ok';

function ensureWebCryptoAvailable() {
  if (!window.isSecureContext || !crypto?.subtle) {
    throw new Error('Chiffrement indisponible sur cette URL. Utilisez HTTPS (ou localhost/127.0.0.1).');
  }
}

function getOrCreateSalt(): Uint8Array {
  const stored = localStorage.getItem(SALT_KEY);
  if (stored) return Uint8Array.from(atob(stored), c => c.charCodeAt(0));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...salt)));
  return salt;
}

async function deriveKey(password: string): Promise<CryptoKey> {
  ensureWebCryptoAvailable();
  const salt = getOrCreateSalt();
  const enc = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc as unknown as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as ArrayBuffer, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
    key,
    encoded as unknown as ArrayBuffer
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(data: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
    key,
    ciphertext as unknown as ArrayBuffer
  );
  return new TextDecoder().decode(decrypted);
}

export async function initializeMasterPassword(password: string): Promise<CryptoKey> {
  const key = await deriveKey(password);
  const verifyData = localStorage.getItem(VERIFY_KEY);
  
  if (!verifyData) {
    // First time — store verification token
    const encrypted = await encrypt(VERIFY_PLAINTEXT, key);
    localStorage.setItem(VERIFY_KEY, encrypted);
    return key;
  }

  // Verify password is correct
  try {
    const decrypted = await decrypt(verifyData, key);
    if (decrypted !== VERIFY_PLAINTEXT) throw new Error('Invalid');
    return key;
  } catch {
    throw new Error('Mot de passe maître incorrect');
  }
}

export function hasMasterPassword(): boolean {
  return !!localStorage.getItem(VERIFY_KEY);
}

export async function changeMasterPassword(
  oldPassword: string,
  newPassword: string,
  reEncryptData: (oldKey: CryptoKey, newKey: CryptoKey) => Promise<void>
): Promise<CryptoKey> {
  const oldKey = await initializeMasterPassword(oldPassword);
  const newKey = await deriveKey(newPassword);
  await reEncryptData(oldKey, newKey);
  const encrypted = await encrypt(VERIFY_PLAINTEXT, newKey);
  localStorage.setItem(VERIFY_KEY, encrypted);
  return newKey;
}
