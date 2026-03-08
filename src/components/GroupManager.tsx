import { useState } from 'react';
import { SSHGroup } from '@/lib/ssh-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderPlus, Pencil, Trash2, Check, X } from 'lucide-react';

const GROUP_COLORS = [
  'hsl(140 100% 50%)',   // green (primary)
  'hsl(180 100% 40%)',   // cyan (accent)
  'hsl(45 100% 50%)',    // yellow
  'hsl(280 80% 60%)',    // purple
  'hsl(0 80% 55%)',      // red
  'hsl(210 100% 55%)',   // blue
  'hsl(30 100% 50%)',    // orange
];

interface Props {
  groups: SSHGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (id: string | null) => void;
  onSaveGroup: (group: SSHGroup) => void;
  onDeleteGroup: (id: string) => void;
  connectionCounts: Record<string, number>;
  totalConnections: number;
}

export function GroupManager({
  groups,
  selectedGroupId,
  onSelectGroup,
  onSaveGroup,
  onDeleteGroup,
  connectionCounts,
  totalConnections,
}: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(GROUP_COLORS[0]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onSaveGroup({
      id: crypto.randomUUID(),
      name: newName.trim(),
      color: selectedColor,
      createdAt: new Date().toISOString(),
    });
    setNewName('');
    setIsAdding(false);
    setSelectedColor(GROUP_COLORS[0]);
  };

  const handleEdit = (group: SSHGroup) => {
    if (!newName.trim()) return;
    onSaveGroup({ ...group, name: newName.trim(), color: selectedColor });
    setEditingId(null);
    setNewName('');
  };

  const startEdit = (group: SSHGroup) => {
    setEditingId(group.id);
    setNewName(group.name);
    setSelectedColor(group.color || GROUP_COLORS[0]);
    setIsAdding(false);
  };

  const ungroupedCount = totalConnections - Object.values(connectionCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Groupes</span>
        <button
          onClick={() => { setIsAdding(true); setEditingId(null); setNewName(''); setSelectedColor(GROUP_COLORS[0]); }}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
          title="Nouveau groupe"
        >
          <FolderPlus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* All connections */}
      <button
        onClick={() => onSelectGroup(null)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
          selectedGroupId === null
            ? 'bg-muted text-primary terminal-glow border border-border'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-primary/50" />
        Tout ({totalConnections})
      </button>

      {/* Groups */}
      {groups.map(group => (
        <div key={group.id} className="group/item">
          {editingId === group.id ? (
            <div className="space-y-1.5 p-2 bg-muted rounded-md border border-border">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="h-7 text-xs bg-background border-border font-mono"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleEdit(group)}
              />
              <div className="flex gap-1">
                {GROUP_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`w-4 h-4 rounded-full border-2 transition-transform ${selectedColor === c ? 'border-foreground scale-125' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(group)} className="p-1 rounded hover:bg-background text-primary"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-background text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onSelectGroup(group.id)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                selectedGroupId === group.id
                  ? 'bg-muted text-primary terminal-glow border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: group.color || GROUP_COLORS[0] }} />
                <span className="truncate">{group.name}</span>
                <span className="text-[10px] opacity-60">({connectionCounts[group.id] || 0})</span>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                <span onClick={e => { e.stopPropagation(); startEdit(group); }} className="p-0.5 rounded hover:bg-background text-muted-foreground hover:text-accent">
                  <Pencil className="w-3 h-3" />
                </span>
                <span onClick={e => { e.stopPropagation(); onDeleteGroup(group.id); }} className="p-0.5 rounded hover:bg-background text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </span>
              </div>
            </button>
          )}
        </div>
      ))}

      {/* Ungrouped */}
      {groups.length > 0 && (
        <button
          onClick={() => onSelectGroup('ungrouped')}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
            selectedGroupId === 'ungrouped'
              ? 'bg-muted text-primary terminal-glow border border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          Sans groupe ({ungroupedCount})
        </button>
      )}

      {/* Add form */}
      {isAdding && (
        <div className="space-y-1.5 p-2 bg-muted rounded-md border border-border">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nom du groupe..."
            className="h-7 text-xs bg-background border-border font-mono"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-1">
            {GROUP_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-4 h-4 rounded-full border-2 transition-transform ${selectedColor === c ? 'border-foreground scale-125' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={handleAdd} className="p-1 rounded hover:bg-background text-primary"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setIsAdding(false)} className="p-1 rounded hover:bg-background text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
