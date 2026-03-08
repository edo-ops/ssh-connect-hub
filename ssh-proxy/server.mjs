/**
 * SSH WebSocket Proxy — à installer sur le même serveur (Debian 12 LXC)
 * 
 * Installation :
 *   cd /opt/ssh-proxy
 *   npm init -y
 *   npm install ws ssh2
 *   node server.mjs
 * 
 * Ou avec un service systemd (voir ssh-proxy.service)
 */

import { WebSocketServer } from 'ws';
import { Client } from 'ssh2';
import { readFileSync } from 'fs';

const PORT = 3022;

const wss = new WebSocketServer({ port: PORT });

console.log(`🔌 SSH Proxy WebSocket démarré sur le port ${PORT}`);

wss.on('connection', (ws) => {
  let sshClient = null;
  let stream = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'connect') {
      sshClient = new Client();

      const config = {
        host: msg.host,
        port: msg.port || 22,
        username: msg.username,
        readyTimeout: 10000,
      };

      if (msg.password) {
        config.password = msg.password;
      }
      if (msg.privateKey) {
        config.privateKey = msg.privateKey;
      }

      sshClient.on('ready', () => {
        ws.send(JSON.stringify({ type: 'connected' }));

        sshClient.shell({ term: 'xterm-256color' }, (err, s) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'error', message: err.message }));
            return;
          }
          stream = s;

          s.on('data', (data) => {
            ws.send(JSON.stringify({ type: 'data', data: data.toString('utf-8') }));
          });

          s.on('close', () => {
            ws.send(JSON.stringify({ type: 'close' }));
            ws.close();
          });

          s.stderr.on('data', (data) => {
            ws.send(JSON.stringify({ type: 'data', data: data.toString('utf-8') }));
          });
        });
      });

      sshClient.on('error', (err) => {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      });

      sshClient.on('close', () => {
        ws.send(JSON.stringify({ type: 'close' }));
      });

      sshClient.connect(config);

    } else if (msg.type === 'data' && stream) {
      stream.write(msg.data);

    } else if (msg.type === 'resize' && stream) {
      stream.setWindow(msg.rows, msg.cols, 0, 0);
    }
  });

  ws.on('close', () => {
    if (stream) stream.close();
    if (sshClient) sshClient.end();
  });
});
