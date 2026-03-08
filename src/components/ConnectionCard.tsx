import { useState } from 'react';
import { SSHConnection } from '@/lib/ssh-store';
import { Server, Copy, Pencil, Trash2, Terminal, AlertTriangle, Play } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Props {
  connection: SSHConnection;
  onEdit: (conn: SSHConnection) => void;
  onDelete: (id: string) => void;
}

export function ConnectionCard({ connection, onEdit, onDelete }: Props) {
  const copySSHCommand = () => {
    const cmd = `ssh ${connection.username}@${connection.host}${connection.port !== 22 ? ` -p ${connection.port}` : ''}`;
    navigator.clipboard.writeText(cmd);
    toast.success('Commande SSH copiée !');
  };

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('connectionId', connection.id);
        e.dataTransfer.effectAllowed = 'move';
        (e.target as HTMLElement).style.opacity = '0.5';
      }}
      onDragEnd={e => { (e.target as HTMLElement).style.opacity = '1'; }}
      className="group border border-border rounded-lg p-4 bg-card hover:border-glow transition-all duration-300 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted">
            <Server className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">{connection.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">
              {connection.username}@{connection.host}:{connection.port}
            </p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={copySSHCommand} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Copier la commande SSH">
            <Terminal className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEdit(connection)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-accent transition-colors" title="Modifier">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors" title="Supprimer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border border-glow">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Supprimer la connexion
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground font-mono text-sm">
                  Voulez-vous vraiment supprimer <span className="text-foreground font-semibold">{connection.name}</span> ({connection.host}) ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-mono text-sm">Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(connection.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono text-sm">
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {connection.password && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground">Mot de passe:</span>
          <button
            onClick={() => { navigator.clipboard.writeText(connection.password!); toast.success('Mot de passe copié'); }}
            className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-secondary-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            ••••••••
            <Copy className="w-3 h-3" />
          </button>
        </div>
      )}

      {connection.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {connection.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-primary border border-border">
              {tag}
            </span>
          ))}
        </div>
      )}

      {connection.notes && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{connection.notes}</p>
      )}
    </div>
  );
}
