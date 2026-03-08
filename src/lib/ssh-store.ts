import { encrypt, decrypt } from './crypto';

export interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  tags: string[];
  notes?: string;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SSHGroup {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  createdAt: string;
}

export interface SSHKey {
  id: string;
  name: string;
  publicKey: string;
  privateKey: string;
  passphrase?: string;
  type: 'rsa' | 'ed25519' | 'ecdsa';
  bits?: number;
  createdAt: string;
}

// Stored version has encrypted sensitive fields
interface StoredSSHConnection extends Omit<SSHConnection, 'password' | 'privateKey'> {
  encryptedPassword?: string;
  encryptedPrivateKey?: string;
}

interface StoredSSHKey extends Omit<SSHKey, 'privateKey' | 'passphrase'> {
  encryptedPrivateKey: string;
  encryptedPassphrase?: string;
}

const CONNECTIONS_KEY = 'ssh-manager-connections';
const KEYS_KEY = 'ssh-manager-keys';
const GROUPS_KEY = 'ssh-manager-groups';

// In-memory crypto key (set after unlock)
let cryptoKey: CryptoKey | null = null;

export function setCryptoKey(key: CryptoKey) {
  cryptoKey = key;
}

export function getCryptoKey(): CryptoKey | null {
  return cryptoKey;
}

// Connections
export async function getConnections(): Promise<SSHConnection[]> {
  const data = localStorage.getItem(CONNECTIONS_KEY);
  if (!data) return [];
  const stored: StoredSSHConnection[] = JSON.parse(data);

  if (!cryptoKey) {
    // Return without sensitive data
    return stored.map(s => ({
      ...s,
      password: s.encryptedPassword ? '••••••••' : undefined,
      privateKey: s.encryptedPrivateKey ? '[chiffré]' : undefined,
    })) as SSHConnection[];
  }

  return Promise.all(stored.map(async (s) => {
    const conn: SSHConnection = {
      id: s.id,
      name: s.name,
      host: s.host,
      port: s.port,
      username: s.username,
      tags: s.tags,
      notes: s.notes,
      groupId: s.groupId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
    if (s.encryptedPassword) {
      try { conn.password = await decrypt(s.encryptedPassword, cryptoKey!); } catch { conn.password = undefined; }
    }
    if (s.encryptedPrivateKey) {
      try { conn.privateKey = await decrypt(s.encryptedPrivateKey, cryptoKey!); } catch { conn.privateKey = undefined; }
    }
    return conn;
  }));
}

export async function saveConnection(conn: SSHConnection): Promise<void> {
  if (!cryptoKey) throw new Error('Vault locked');
  const connections = await getStoredConnections();
  const stored: StoredSSHConnection = {
    id: conn.id,
    name: conn.name,
    host: conn.host,
    port: conn.port,
    username: conn.username,
    tags: conn.tags,
    notes: conn.notes,
    groupId: conn.groupId,
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
  };
  if (conn.password) stored.encryptedPassword = await encrypt(conn.password, cryptoKey);
  if (conn.privateKey) stored.encryptedPrivateKey = await encrypt(conn.privateKey, cryptoKey);

  const idx = connections.findIndex(c => c.id === conn.id);
  if (idx >= 0) {
    connections[idx] = { ...stored, updatedAt: new Date().toISOString() };
  } else {
    connections.push(stored);
  }
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
}

function getStoredConnections(): StoredSSHConnection[] {
  const data = localStorage.getItem(CONNECTIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function deleteConnection(id: string): void {
  const connections = getStoredConnections().filter(c => c.id !== id);
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
}

// SSH Keys
export async function getSSHKeys(): Promise<SSHKey[]> {
  const data = localStorage.getItem(KEYS_KEY);
  if (!data) return [];
  const stored: StoredSSHKey[] = JSON.parse(data);

  if (!cryptoKey) {
    return stored.map(s => ({
      ...s,
      privateKey: '[chiffré]',
      passphrase: s.encryptedPassphrase ? '••••••••' : undefined,
    })) as SSHKey[];
  }

  return Promise.all(stored.map(async (s) => {
    const key: SSHKey = {
      id: s.id,
      name: s.name,
      publicKey: s.publicKey,
      privateKey: '',
      type: s.type,
      bits: s.bits,
      createdAt: s.createdAt,
    };
    try { key.privateKey = await decrypt(s.encryptedPrivateKey, cryptoKey!); } catch { key.privateKey = ''; }
    if (s.encryptedPassphrase) {
      try { key.passphrase = await decrypt(s.encryptedPassphrase, cryptoKey!); } catch { key.passphrase = undefined; }
    }
    return key;
  }));
}

export async function saveSSHKey(key: SSHKey): Promise<void> {
  if (!cryptoKey) throw new Error('Vault locked');
  const keys = getStoredKeys();
  const stored: StoredSSHKey = {
    id: key.id,
    name: key.name,
    publicKey: key.publicKey,
    encryptedPrivateKey: await encrypt(key.privateKey, cryptoKey),
    type: key.type,
    bits: key.bits,
    createdAt: key.createdAt,
  };
  if (key.passphrase) stored.encryptedPassphrase = await encrypt(key.passphrase, cryptoKey);

  const idx = keys.findIndex(k => k.id === key.id);
  if (idx >= 0) {
    keys[idx] = stored;
  } else {
    keys.push(stored);
  }
  localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
}

function getStoredKeys(): StoredSSHKey[] {
  const data = localStorage.getItem(KEYS_KEY);
  return data ? JSON.parse(data) : [];
}

export function deleteSSHKey(id: string): void {
  const keys = getStoredKeys().filter(k => k.id !== id);
  localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
}

// Groups (no sensitive data, no encryption needed)
export function getGroups(): SSHGroup[] {
  const data = localStorage.getItem(GROUPS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveGroup(group: SSHGroup): void {
  const groups = getGroups();
  const idx = groups.findIndex(g => g.id === group.id);
  if (idx >= 0) {
    groups[idx] = group;
  } else {
    groups.push(group);
  }
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function deleteGroup(id: string): void {
  const groups = getGroups().filter(g => g.id !== id);
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  const connections = getStoredConnections().map(c =>
    c.groupId === id ? { ...c, groupId: undefined } : c
  );
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
}
