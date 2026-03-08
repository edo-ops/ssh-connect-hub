import { useState, useEffect, useMemo } from 'react';
import { getConnections, saveConnection, deleteConnection, SSHConnection, getGroups, saveGroup, deleteGroup, SSHGroup } from '@/lib/ssh-store';
import { ConnectionCard } from '@/components/ConnectionCard';
import { ConnectionForm } from '@/components/ConnectionForm';
import { GroupManager } from '@/components/GroupManager';
import { KeyManager } from '@/components/KeyManager';
import { MasterPasswordPrompt } from '@/components/MasterPasswordPrompt';
import { hasMasterPassword, getSession, initializeMasterPassword } from '@/lib/crypto';
import { setCryptoKey } from '@/lib/ssh-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Terminal, Key, Server } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const [unlocked, setUnlocked] = useState(false);
  const [autoUnlocking, setAutoUnlocking] = useState(true);

  // Auto-unlock from session
  useEffect(() => {
    const savedPassword = getSession();
    if (savedPassword && hasMasterPassword()) {
      initializeMasterPassword(savedPassword)
        .then(key => {
          setCryptoKey(key);
          setUnlocked(true);
        })
        .catch(() => {})
        .finally(() => setAutoUnlocking(false));
    } else {
      setAutoUnlocking(false);
    }
  }, []);
  const [connections, setConnections] = useState<SSHConnection[]>([]);
  const [groups, setGroups] = useState<SSHGroup[]>(getGroups());
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SSHConnection | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'connections' | 'keys'>('connections');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const refreshConnections = async () => setConnections(await getConnections());
  const refreshGroups = () => setGroups(getGroups());

  useEffect(() => {
    if (unlocked) { refreshConnections(); }
  }, [unlocked]);

  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    connections.forEach(c => {
      if (c.groupId) counts[c.groupId] = (counts[c.groupId] || 0) + 1;
    });
    return counts;
  }, [connections]);

  const filtered = useMemo(() => {
    let result = connections;
    if (selectedGroupId === 'ungrouped') {
      result = result.filter(c => !c.groupId);
    } else if (selectedGroupId) {
      result = result.filter(c => c.groupId === selectedGroupId);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.host.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [connections, search, selectedGroupId]);

  const handleSave = async (conn: SSHConnection) => {
    await saveConnection(conn);
    await refreshConnections();
    setShowForm(false);
    setEditingConnection(null);
    toast.success(editingConnection ? 'Connexion mise à jour' : 'Connexion ajoutée');
  };

  const handleDelete = async (id: string) => {
    deleteConnection(id);
    await refreshConnections();
    toast.success('Connexion supprimée');
  };

  const handleEdit = (conn: SSHConnection) => {
    setEditingConnection(conn);
    setShowForm(true);
  };

  const handleSaveGroup = (group: SSHGroup) => {
    saveGroup(group);
    refreshGroups();
    toast.success('Groupe enregistré');
  };

  const handleDeleteGroup = async (id: string) => {
    deleteGroup(id);
    refreshGroups();
    await refreshConnections();
    if (selectedGroupId === id) setSelectedGroupId(null);
    toast.success('Groupe supprimé');
  };

  const handleMoveConnection = async (connectionId: string, groupId: string | undefined) => {
    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return;
    await saveConnection({ ...conn, groupId, updatedAt: new Date().toISOString() });
    await refreshConnections();
    toast.success(`Connexion déplacée`);
  };

  if (!unlocked) {
    return <MasterPasswordPrompt onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="scanline" />

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 terminal-glow">
                <Terminal className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground text-glow">
                  SSH Manager
                </h1>
                <p className="text-xs text-muted-foreground font-mono">
                  <span className="text-primary">$</span> gestion de connexions sécurisées
                </p>
              </div>
            </div>
            <Button onClick={() => { setEditingConnection(null); setShowForm(true); }} className="font-mono text-sm">
              <Plus className="w-4 h-4 mr-1" /> Connexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('connections')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono transition-all ${
              activeTab === 'connections'
                ? 'bg-card text-primary terminal-glow border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Server className="w-3.5 h-3.5" /> Connexions ({connections.length})
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono transition-all ${
              activeTab === 'keys'
                ? 'bg-card text-primary terminal-glow border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Key className="w-3.5 h-3.5" /> Clés SSH
          </button>
        </div>

        {activeTab === 'connections' && (
          <div className="flex gap-6">
            <aside className="w-52 flex-shrink-0">
              <GroupManager
                groups={groups}
                selectedGroupId={selectedGroupId}
                onSelectGroup={setSelectedGroupId}
                onSaveGroup={handleSaveGroup}
                onDeleteGroup={handleDeleteGroup}
                onMoveConnection={handleMoveConnection}
                connectionCounts={connectionCounts}
                totalConnections={connections.length}
              />
            </aside>

            <div className="flex-1 min-w-0">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, IP, utilisateur ou tag..."
                  className="pl-10 bg-muted border-border font-mono text-sm"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map(conn => (
                  <ConnectionCard key={conn.id} connection={conn} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <Terminal className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-mono text-sm">
                    {search ? 'Aucun résultat trouvé' : 'Aucune connexion enregistrée'}
                  </p>
                  {!search && (
                    <Button variant="outline" onClick={() => setShowForm(true)} className="mt-4 font-mono text-sm">
                      <Plus className="w-4 h-4 mr-1" /> Ajouter une connexion
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'keys' && <KeyManager />}
      </main>

      {showForm && (
        <ConnectionForm
          connection={editingConnection}
          groups={groups}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingConnection(null); }}
        />
      )}
    </div>
  );
};

export default Index;
