import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Terminal = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const host = searchParams.get('host') || '';
  const port = parseInt(searchParams.get('port') || '22');
  const username = searchParams.get('username') || '';
  const password = searchParams.get('password') || '';
  const name = searchParams.get('name') || host;

  useEffect(() => {
    if (!termRef.current || !host || !username) return;

    const term = new XTerminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, monospace',
      theme: {
        background: '#0a0f0a',
        foreground: '#33ff33',
        cursor: '#33ff33',
        cursorAccent: '#0a0f0a',
        selectionBackground: '#33ff3340',
        black: '#0a0f0a',
        green: '#33ff33',
        brightGreen: '#66ff66',
        cyan: '#00cccc',
        brightCyan: '#00ffff',
        white: '#cccccc',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[1;32m╔══════════════════════════════════════╗\x1b[0m');
    term.writeln(`\x1b[1;32m║\x1b[0m  Connexion à \x1b[1;36m${username}@${host}:${port}\x1b[0m`);
    term.writeln('\x1b[1;32m╚══════════════════════════════════════╝\x1b[0m');
    term.writeln('');

    // Determine WebSocket URL — same host as the page, port 3022
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    const wsUrl = `${wsProtocol}//${wsHost}:3022`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'connect',
          host,
          port,
          username,
          password,
        }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'connected') {
          setConnected(true);
          term.writeln('\x1b[1;32m✓ Connecté !\x1b[0m\r\n');
          // Send initial terminal size
          ws.send(JSON.stringify({
            type: 'resize',
            cols: term.cols,
            rows: term.rows,
          }));
        } else if (msg.type === 'data') {
          term.write(msg.data);
        } else if (msg.type === 'error') {
          setError(msg.message);
          term.writeln(`\r\n\x1b[1;31m✗ Erreur: ${msg.message}\x1b[0m`);
        } else if (msg.type === 'close') {
          setConnected(false);
          term.writeln('\r\n\x1b[1;33m⚡ Connexion fermée\x1b[0m');
        }
      };

      ws.onerror = () => {
        setError('Impossible de se connecter au proxy SSH. Vérifiez que le serveur WebSocket tourne sur le port 3022.');
        term.writeln('\r\n\x1b[1;31m✗ Erreur WebSocket — le proxy SSH (port 3022) est-il démarré ?\x1b[0m');
      };

      ws.onclose = () => {
        setConnected(false);
      };

      // Send terminal input to WebSocket
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'data', data }));
        }
      });

      // Handle resize
      const onResize = () => {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'resize',
            cols: term.cols,
            rows: term.rows,
          }));
        }
      };

      window.addEventListener('resize', onResize);

      return () => {
        window.removeEventListener('resize', onResize);
        ws.close();
        term.dispose();
      };
    } catch {
      setError('Erreur de connexion WebSocket');
    }
  }, [host, port, username, password]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 100);
    }
  }, [fullscreen]);

  return (
    <div className="min-h-screen bg-[#0a0f0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-card/80 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="font-mono text-sm text-foreground">{name}</span>
          <span className="font-mono text-xs text-muted-foreground">({username}@{host}:{port})</span>
          <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-primary animate-pulse' : 'bg-destructive'}`} />
        </div>
        <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="text-muted-foreground hover:text-foreground">
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </header>

      {/* Terminal */}
      <div ref={termRef} className="flex-1 p-1" />
    </div>
  );
};

export default Terminal;
