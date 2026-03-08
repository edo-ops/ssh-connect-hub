#!/bin/bash
set -e

# ============================================
#  SSH Connect Hub — Script d'installation
#  Debian 12 / Ubuntu (testé sur LXC Proxmox)
# ============================================

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════╗"
echo "║       SSH Connect Hub — Installation      ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Vérifier qu'on est root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Ce script doit être exécuté en tant que root${NC}"
  exit 1
fi

# Demander l'IP/domaine
read -rp "🌐 Adresse IP ou domaine du serveur (ex: 10.15.1.145) : " SERVER_ADDR
if [ -z "$SERVER_ADDR" ]; then
  echo -e "${RED}❌ Adresse requise${NC}"
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── 1. Dépendances système ──────────────────
echo -e "\n${GREEN}[1/6]${NC} Installation des paquets système..."
apt update && apt install -y nginx git nodejs npm openssl

# ── 2. Build de l'application ────────────────
echo -e "\n${GREEN}[2/6]${NC} Compilation de l'application React..."
cd "$REPO_DIR"
npm install
npm run build
cp -r dist/* /var/www/html/

# ── 3. Certificat SSL auto-signé ─────────────
echo -e "\n${GREEN}[3/6]${NC} Génération du certificat SSL (10 ans)..."
if [ ! -f /etc/ssl/certs/ssh-manager.crt ]; then
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/ssl/private/ssh-manager.key \
    -out /etc/ssl/certs/ssh-manager.crt \
    -subj "/CN=${SERVER_ADDR}" 2>/dev/null
  echo -e "${GREEN}✓ Certificat créé${NC}"
else
  echo -e "${YELLOW}⚠ Certificat existant conservé${NC}"
fi

# ── 4. Configuration Nginx ───────────────────
echo -e "\n${GREEN}[4/6]${NC} Configuration de Nginx..."
cat > /etc/nginx/sites-available/default << 'NGINX'
server {
    listen 443 ssl;
    server_name _;

    ssl_certificate /etc/ssl/certs/ssh-manager.crt;
    ssl_certificate_key /etc/ssl/private/ssh-manager.key;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3022;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}

server {
    listen 80;
    return 301 https://$host$request_uri;
}
NGINX

systemctl restart nginx
echo -e "${GREEN}✓ Nginx configuré et redémarré${NC}"

# ── 5. Proxy SSH (WebSocket → SSH) ──────────
echo -e "\n${GREEN}[5/6]${NC} Installation du proxy SSH..."
mkdir -p /opt/ssh-proxy
cp "$REPO_DIR/ssh-proxy/server.mjs" /opt/ssh-proxy/

cd /opt/ssh-proxy
if [ ! -f package.json ]; then
  npm init -y > /dev/null 2>&1
fi
npm install ws ssh2 > /dev/null 2>&1

# ── 6. Service systemd ──────────────────────
echo -e "\n${GREEN}[6/6]${NC} Configuration du service systemd..."
cp "$REPO_DIR/ssh-proxy/ssh-proxy.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now ssh-proxy

# ── Résumé ──────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}        ${GREEN}✅ Installation terminée !${NC}         ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}                                          ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  🌐 Accès : ${GREEN}https://${SERVER_ADDR}${NC}"
echo -e "${CYAN}║${NC}                                          ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  📋 Services :                            ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    • nginx        → port 443 (HTTPS)      ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    • ssh-proxy    → port 3022 (WS)        ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                          ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${YELLOW}⚠ Certificat auto-signé : acceptez${NC}      ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${YELLOW}  l'exception dans votre navigateur${NC}     ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                          ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
