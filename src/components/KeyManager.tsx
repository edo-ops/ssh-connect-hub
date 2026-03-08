import { useState, useEffect } from 'react';
import { SSHKey, getSSHKeys, saveSSHKey, deleteSSHKey } from '@/lib/ssh-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Key, Trash2, Copy, Plus, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

export function KeyManager() {
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', publicKey: '', privateKey: '', passphrase: '', type: 'ed25519' as SSHKey['type'] });

  const refresh = async () => setKeys(await getSSHKeys());

  useEffect(() => { refresh(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSSHKey({
      id: crypto.randomUUID(),
      name: form.name,
      publicKey: form.publicKey,
      privateKey: form.privateKey,
      passphrase: form.passphrase || undefined,
      type: form.type,
      createdAt: new Date().toISOString(),
    });
    await refresh();
    setShowForm(false);
    setForm({ name: '', publicKey: '', privateKey: '', passphrase: '', type: 'ed25519' });
    toast.success('Clé SSH enregistrée');
  };

  const handleDelete = async (id: string) => {
    deleteSSHKey(id);
    await refresh();
    toast.success('Clé supprimée');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiée`);
  };

  const getCopyIdCommand = (key: SSHKey, host?: string) => {
    return `ssh-copy-id -i ~/.ssh/${key.name}.pub ${host || 'user@host'}`;
  };

  const getKeygenCommand = (type: SSHKey['type']) => {
    return `ssh-keygen -t ${type} -C "your@email.com"`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground text-glow flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          Clés SSH
        </h2>
        <Button size="sm" onClick={() => setShowForm(true)} className="font-mono text-xs">
          <Plus className="w-3 h-3 mr-1" /> Ajouter
        </Button>
      </div>

      <div className="bg-muted rounded-lg p-3 border border-border">
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <FileText className="w-3 h-3" /> Commandes utiles :
        </p>
        <div className="space-y-1">
          {(['ed25519', 'rsa', 'ecdsa'] as const).map(t => (
            <div key={t} className="flex items-center gap-2">
              <code className="text-[11px] text-primary font-mono flex-1">{getKeygenCommand(t)}</code>
              <button onClick={() => copyToClipboard(getKeygenCommand(t), 'Commande')} className="text-muted-foreground hover:text-primary transition-colors">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {keys.map(key => (
          <div key={key.id} className="border border-border rounded-lg p-3 bg-card group hover:border-glow transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-primary" />
                <span className="font-display font-semibold text-sm text-foreground">{key.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-accent border border-border uppercase">{key.type}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => copyToClipboard(key.publicKey, 'Clé publique')} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Copier clé publique">
                  <Copy className="w-3 h-3" />
                </button>
                <button onClick={() => copyToClipboard(getCopyIdCommand(key), 'Commande ssh-copy-id')} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-accent transition-colors text-[10px] font-mono" title="Copier ssh-copy-id">
                  ssh-copy-id
                </button>
                <button onClick={() => handleDelete(key.id)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors" title="Supprimer">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <code className="text-[10px] text-muted-foreground font-mono block truncate">{key.publicKey}</code>
          </div>
        ))}
        {keys.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8 font-mono">Aucune clé enregistrée</p>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg border-glow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-foreground text-glow">&gt; Nouvelle clé SSH</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nom</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="id_ed25519" required className="bg-muted border-border font-mono text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as SSHKey['type'] }))} className="w-full h-9 rounded-md bg-muted border border-border px-3 text-sm font-mono text-foreground">
                    <option value="ed25519">ED25519</option>
                    <option value="rsa">RSA</option>
                    <option value="ecdsa">ECDSA</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Clé publique</Label>
                <Textarea value={form.publicKey} onChange={e => setForm(f => ({ ...f, publicKey: e.target.value }))} placeholder="ssh-ed25519 AAAA..." rows={3} required className="bg-muted border-border font-mono text-xs" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Clé privée</Label>
                <Textarea value={form.privateKey} onChange={e => setForm(f => ({ ...f, privateKey: e.target.value }))} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" rows={3} required className="bg-muted border-border font-mono text-xs" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Passphrase (optionnel)</Label>
                <Input type="password" value={form.passphrase} onChange={e => setForm(f => ({ ...f, passphrase: e.target.value }))} className="bg-muted border-border font-mono text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 font-mono">Enregistrer</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="font-mono">Annuler</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
