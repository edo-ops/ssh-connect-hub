import { useState, useMemo } from 'react';
import { getConnections, saveConnection, deleteConnection, SSHConnection } from '@/lib/ssh-store';
import { ConnectionCard } from '@/components/ConnectionCard';
import { ConnectionForm } from '@/components/ConnectionForm';
import { KeyManager } from '@/components/KeyManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Terminal, Key, Server } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const [connections, setConnections] = useState<SSHConnection[]>(getConnections());
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SSHConnection | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'connections' | 'keys'>('connections');

  const refresh = () => setConnections(getConnections());

  const filtered = useMemo(() => {
    if (!search) return connections;
    const q = search.toLowerCase();
    return connections.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.host.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [connections, search]);

  const handleSave = (conn: SSHConnection) => {
    saveConnection(conn);
    refresh();
    setShowForm(false);
    setEditingConnection(null);
    toast.success(editingConnection ? 'Connexion mise à jour' : 'Connexion ajoutée');
  };

  const handleDelete = (id: string) => {
    deleteConnection(id);
    refresh();
    toast.success('Connexion supprimée');
  };

  const handleEdit = (conn: SSHConnection) => {
    setEditingConnection(conn);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="scanline" />

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto px-4 py-4">
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
      <main className="container max-w-5xl mx-auto px-4 py-6">
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
          <>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par nom, IP, utilisateur ou tag..."
                className="pl-10 bg-muted border-border font-mono text-sm"
              />
            </div>

            {/* Grid */}
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
          </>
        )}

        {activeTab === 'keys' && <KeyManager />}
      </main>

      {/* Form Modal */}
      {showForm && (
        <ConnectionForm
          connection={editingConnection}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingConnection(null); }}
        />
      )}
    </div>
  );
};

export default Index;
