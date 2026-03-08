<p align="center">
  <img src="https://img.shields.io/badge/SSH-Connect_Hub-00ff41?style=for-the-badge&logo=gnometerminal&logoColor=white" alt="SSH Connect Hub" />
</p>

<h1 align="center">🔐 SSH Connect Hub</h1>

<p align="center">
  <strong>Gestionnaire de connexions SSH sécurisé avec terminal web intégré</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/xterm.js-Terminal-000?style=flat-square&logo=windowsterminal&logoColor=white" />
  <img src="https://img.shields.io/badge/Chiffrement-AES--256--GCM-ff6b6b?style=flat-square&logo=letsencrypt&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Licence-MIT-green?style=flat-square" />
  <img src="https://img.shields.io/badge/Plateforme-Debian_12-A81D33?style=flat-square&logo=debian&logoColor=white" />
  <img src="https://img.shields.io/badge/Self--hosted-100%25_local-orange?style=flat-square" />
</p>

---

## 📖 C'est quoi ?

**SSH Connect Hub** est une application web auto-hébergée qui vous permet de :

- 🗄️ **Stocker** vos connexions SSH (IP, port, identifiants, clés)
- 🖥️ **Se connecter** directement en SSH depuis le navigateur
- 🔐 **Chiffrer** toutes les données sensibles avec un mot de passe maître

> 💡 Tout reste en local dans votre navigateur. Aucune donnée ne transite par un serveur externe.

---

## ✨ Fonctionnalités

| | Fonctionnalité | Description |
|---|---|---|
| 🔑 | **Coffre-fort chiffré** | AES-256-GCM + PBKDF2 (100k itérations) via Web Crypto API |
| 🖥️ | **Terminal intégré** | Connexion SSH directe depuis le navigateur (xterm.js) |
| 📂 | **Groupes** | Organisez vos connexions par projet, client, environnement… |
| 🏷️ | **Tags & recherche** | Retrouvez n'importe quel serveur instantanément |
| 🗝️ | **Clés SSH** | Stockez et utilisez vos clés privées |
| 🔄 | **Session persistante** | Pas besoin de retaper le mot de passe à chaque refresh |
| 📱 | **Interface moderne** | Design terminal/hacker avec thème sombre |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   NAVIGATEUR                    │
│                                                 │
│   ┌──────────────┐      ┌────────────────────┐  │
│   │   React SPA  │      │  xterm.js Terminal │  │
│   │   (Vite)     │      │                    │  │
│   └──────┬───────┘      └────────┬───────────┘  │
│          │                        │             │
└──────────┼────────────────────────┼─────────────┘
           │ HTTPS (443)            │ WSS → /ws
           │                        │
┌──────────┼────────────────────────┼───────────────┐
│          ▼                        ▼               │
│   ┌──────────────┐       ┌────────────────────┐   │
│   │    Nginx     │─────▶│  SSH Proxy (3022)   │  │
│   │   Reverse    │       │  Node.js + ssh2    │   │
│   │   Proxy      │       └────────┬───────────┘   │
│   └──────────────┘                │               │
│                                   │ SSH (port 22) │
│          SERVEUR DEBIAN           │               │
└───────────────────────────────────┼───────────────┘
                                    ▼
                         ┌──────────────────┐
                         │  Serveurs cibles │
                         │   🖥️  🖥️  🖥️    │
                         └──────────────────┘
```

---

## 🚀 Installation

### Prérequis

- **Debian 12** ou Ubuntu (testé sur LXC Proxmox)
- Accès **root**
- Une adresse IP ou un nom de domaine

### ⚡ Installation automatique (recommandée)

```bash
git clone https://github.com/edo-ops/ssh-connect-hub.git
cd ssh-connect-hub
chmod +x install.sh
./install.sh
```

Le script installe tout automatiquement :
1. 📦 Paquets système (nginx, nodejs, npm, openssl)
2. 🔨 Compilation de l'application React
3. 🔒 Certificat SSL auto-signé (10 ans)
4. ⚙️ Configuration Nginx (HTTPS + WebSocket proxy)
5. 🔌 Proxy SSH (service systemd)

---

### 🔧 Installation manuelle

<details>
<summary><strong>Cliquez pour voir les étapes détaillées</strong></summary>

<br>

#### 1️⃣ Dépendances système

```bash
apt update && apt install -y nginx git nodejs npm openssl
```

#### 2️⃣ Cloner et compiler

```bash
git clone https://github.com/edo-ops/ssh-connect-hub.git
cd ssh-connect-hub
npm install
npm run build
cp -r dist/* /var/www/html/
```

#### 3️⃣ Certificat SSL

```bash
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/ssl/private/ssh-manager.key \
  -out /etc/ssl/certs/ssh-manager.crt \
  -subj "/CN=VOTRE_IP"
```

#### 4️⃣ Configuration Nginx

Éditez `/etc/nginx/sites-available/default` :

```nginx
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
```

```bash
systemctl restart nginx
```

#### 5️⃣ Proxy SSH

```bash
mkdir -p /opt/ssh-proxy
cp ssh-proxy/server.mjs /opt/ssh-proxy/
cd /opt/ssh-proxy
npm init -y
npm install ws ssh2
```

#### 6️⃣ Service systemd

```bash
cp ssh-proxy/ssh-proxy.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now ssh-proxy
```

#### 7️⃣ Vérification

```bash
systemctl status ssh-proxy   # ✅ active (running)
systemctl status nginx       # ✅ active (running)
```

</details>

---

## 🔄 Mise à jour

```bash
cd ssh-connect-hub
git pull
npm install
npm run build
cp -r dist/* /var/www/html/
```

---

## 🛡️ Sécurité

```
┌─────────────────────────────────────────────────────┐
│                   COUCHES DE SÉCURITÉ               │
├─────────────┬───────────────────────────────────────┤
│ Chiffrement │ AES-256-GCM (Web Crypto API)          │
│ Dérivation  │ PBKDF2 — 100 000 itérations + SHA-256 │
│ Stockage    │ localStorage (navigateur uniquement)  │
│ Session     │ sessionStorage (effacé à la fermeture)│
│ Transport   │ HTTPS obligatoire (requis par l'API)  │
│ Proxy SSH   │ WebSocket local (127.0.0.1:3022)      │
└─────────────┴───────────────────────────────────────┘
```

> ⚠️ **Mot de passe maître irrécupérable** — En cas d'oubli, le coffre-fort devra être réinitialisé et toutes les données seront perdues.

---

## 🧰 Stack technique

| Technologie | Usage |
|---|---|
| [React 18](https://react.dev) | Interface utilisateur |
| [Vite](https://vitejs.dev) | Build & dev server |
| [TypeScript](https://typescriptlang.org) | Typage statique |
| [Tailwind CSS](https://tailwindcss.com) | Styles |
| [shadcn/ui](https://ui.shadcn.com) | Composants UI |
| [xterm.js](https://xtermjs.org) | Terminal web |
| [ssh2](https://github.com/mscdex/ssh2) | Client SSH (Node.js) |
| [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) | Chiffrement AES-256 |

---

## 📝 Licence

MIT — Libre d'utilisation, modification et distribution.

---

<p align="center">
  <sub>Fait avec 💚 par <a href="https://github.com/edo-ops">edo-ops</a></sub>
</p>
