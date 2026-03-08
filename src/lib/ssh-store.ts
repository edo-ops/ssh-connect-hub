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

const CONNECTIONS_KEY = 'ssh-manager-connections';
const KEYS_KEY = 'ssh-manager-keys';
const GROUPS_KEY = 'ssh-manager-groups';

export function getConnections(): SSHConnection[] {
  const data = localStorage.getItem(CONNECTIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveConnection(conn: SSHConnection): void {
  const connections = getConnections();
  const idx = connections.findIndex(c => c.id === conn.id);
  if (idx >= 0) {
    connections[idx] = { ...conn, updatedAt: new Date().toISOString() };
  } else {
    connections.push(conn);
  }
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
}

export function deleteConnection(id: string): void {
  const connections = getConnections().filter(c => c.id !== id);
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
}

export function getSSHKeys(): SSHKey[] {
  const data = localStorage.getItem(KEYS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveSSHKey(key: SSHKey): void {
  const keys = getSSHKeys();
  const idx = keys.findIndex(k => k.id === key.id);
  if (idx >= 0) {
    keys[idx] = key;
  } else {
    keys.push(key);
  }
  localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
}

export function deleteSSHKey(id: string): void {
  const keys = getSSHKeys().filter(k => k.id !== id);
  localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
}
