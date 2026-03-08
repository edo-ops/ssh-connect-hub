import { useState, useEffect } from 'react';
import { SSHConnection, SSHGroup } from '@/lib/ssh-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

interface Props {
  connection?: SSHConnection | null;
  groups: SSHGroup[];
  onSave: (conn: SSHConnection) => void;
  onCancel: () => void;
}

export function ConnectionForm({ connection, groups, onSave, onCancel }: Props) {
  const [form, setForm] = useState({
    name: '',
    host: '',
    port: 22,
    username: 'root',
    password: '',
    privateKey: '',
    tags: '',
    notes: '',
    groupId: '',
  });

  useEffect(() => {
    if (connection) {
      setForm({
        name: connection.name,
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: connection.password || '',
        privateKey: connection.privateKey || '',
        tags: connection.tags.join(', '),
        notes: connection.notes || '',
        groupId: connection.groupId || '',
      });
    }
  }, [connection]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    onSave({
      id: connection?.id || crypto.randomUUID(),
      name: form.name,
      host: form.host,
      port: form.port,
      username: form.username,
      password: form.password || undefined,
      privateKey: form.privateKey || undefined,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      notes: form.notes || undefined,
      createdAt: connection?.createdAt || now,
      updatedAt: now,
    });
  };

  const update = (field: string, value: string | number) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg border-glow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold text-foreground text-glow">
            {connection ? '> Modifier connexion' : '> Nouvelle connexion'}
          </h2>
          <button onClick={onCancel} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Nom</Label>
              <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Mon serveur" required className="bg-muted border-border font-mono text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Port</Label>
              <Input type="number" value={form.port} onChange={e => update('port', parseInt(e.target.value))} className="bg-muted border-border font-mono text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Hôte (IP ou domaine)</Label>
            <Input value={form.host} onChange={e => update('host', e.target.value)} placeholder="192.168.1.100" required className="bg-muted border-border font-mono text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Utilisateur</Label>
              <Input value={form.username} onChange={e => update('username', e.target.value)} placeholder="root" required className="bg-muted border-border font-mono text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Mot de passe</Label>
              <Input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="••••••••" className="bg-muted border-border font-mono text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Clé privée (optionnel)</Label>
            <Textarea value={form.privateKey} onChange={e => update('privateKey', e.target.value)} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" rows={3} className="bg-muted border-border font-mono text-xs" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Tags (séparés par des virgules)</Label>
            <Input value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="production, web, docker" className="bg-muted border-border font-mono text-sm" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Serveur de production..." rows={2} className="bg-muted border-border font-mono text-sm" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1 font-mono">
              {connection ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="font-mono">
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
