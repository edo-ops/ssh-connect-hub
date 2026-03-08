import { useState } from 'react';
import { initializeMasterPassword, hasMasterPassword } from '@/lib/crypto';
import { setCryptoKey } from '@/lib/ssh-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';

interface Props {
  onUnlock: () => void;
}

export function MasterPasswordPrompt({ onUnlock }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isFirstTime = !hasMasterPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isFirstTime && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 4) {
      setError('Minimum 4 caractères');
      return;
    }

    setLoading(true);
    try {
      const key = await initializeMasterPassword(password);
      setCryptoKey(key);
      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mot de passe maître incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="scanline" />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-primary/10 terminal-glow-strong mb-4">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground text-glow mb-2">
            SSH Manager
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            {isFirstTime
              ? '> Créez votre mot de passe maître'
              : '> Déverrouillez votre coffre-fort'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 border-glow space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mot de passe maître"
                className="pl-10 pr-10 bg-muted border-border font-mono text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {isFirstTime && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirmer le mot de passe"
                  className="pl-10 bg-muted border-border font-mono text-sm"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive font-mono">{error}</p>
            )}
          </div>

          <Button type="submit" className="w-full font-mono" disabled={loading}>
            {loading ? 'Déchiffrement...' : isFirstTime ? 'Créer le coffre-fort' : 'Déverrouiller'}
          </Button>

          {isFirstTime ? (
            <p className="text-[10px] text-muted-foreground text-center font-mono">
              Ce mot de passe chiffrera vos identifiants avec AES-256-GCM.
              <br />Il ne peut pas être récupéré en cas d'oubli.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('⚠️ Cela supprimera TOUTES vos connexions et clés enregistrées. Continuer ?')) {
                  localStorage.removeItem('ssh-manager-verify');
                  localStorage.removeItem('ssh-manager-salt');
                  localStorage.removeItem('ssh-manager-connections');
                  localStorage.removeItem('ssh-manager-keys');
                  localStorage.removeItem('ssh-manager-groups');
                  window.location.reload();
                }
              }}
              className="text-[10px] text-muted-foreground hover:text-destructive text-center font-mono underline transition-colors w-full"
            >
              Mot de passe oublié ? Réinitialiser le coffre-fort
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
