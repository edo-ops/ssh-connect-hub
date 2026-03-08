<p align="center">
  <img src="https://img.shields.io/badge/Linux-Installer-00ff41?style=for-the-badge&logo=linux&logoColor=white" alt="Server Installer" />
</p>

<h1 align="center">🛠️ Server Software Installer</h1>

<p align="center">
  <strong>Script interactif d'installation de logiciels serveur pour Debian & Ubuntu</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Debian-12%20%7C%2013-A81D33?style=flat-square&logo=debian&logoColor=white" />
  <img src="https://img.shields.io/badge/Ubuntu-22.04+-E95420?style=flat-square&logo=ubuntu&logoColor=white" />
  <img src="https://img.shields.io/badge/Bash-Script-4EAA25?style=flat-square&logo=gnubash&logoColor=white" />
  <img src="https://img.shields.io/badge/Licence-MIT-green?style=flat-square" />
</p>

---

## 📖 C'est quoi ?

Un **script Bash interactif** qui automatise l'installation de logiciels de supervision et de gestion sur vos serveurs Linux. Un menu simple, des installations complètes, zéro prise de tête.

---

## ✨ Logiciels supportés

| | Logiciel | Méthode | Description |
|---|---|---|---|
| 📊 | **GLPI** | Apache + PHP + MariaDB | Gestion de parc informatique & helpdesk |
| 📈 | **Zabbix** | Dépôt officiel | Supervision réseau & monitoring |
| 🔍 | **Nagios Core** | Compilation sources | Monitoring système & alertes |
| 📞 | **XiVO / Wazo** | Docker Compose | Téléphonie IP (IPBX) |

---

## 🖥️ Systèmes compatibles

| OS | Versions |
|---|---|
| Debian | 12 (Bookworm), 13 (Trixie) |
| Ubuntu | 22.04 (Jammy), 24.04 (Noble) et + |

---

## 🚀 Installation

```bash
git clone https://github.com/edo-ops/server-installer.git
cd server-installer
chmod +x installer.sh
sudo ./installer.sh
```

C'est tout ! Le menu interactif s'affiche et vous guide.

---

## 📸 Aperçu du menu

```
╔══════════════════════════════════════════════╗
║                                              ║
║   🛠️  Installateur de logiciels serveur       ║
║                                              ║
║   Compatible : Debian 12/13 — Ubuntu 22.04+  ║
║                                              ║
╚══════════════════════════════════════════════╝

  Système : Debian GNU/Linux 12 (bookworm)

──────────────────────────────────────────────

  INSTALLER

  1)  📊  GLPI           — Gestion de parc informatique
  2)  📈  Zabbix          — Supervision réseau
  3)  🔍  Nagios Core     — Monitoring système
  4)  📞  XiVO/Wazo       — Téléphonie IP (Docker)

  OUTILS

  5)  🗑️   Désinstaller
  6)  ℹ️   Vérifier les services installés

  0)  Quitter
```

---

## 📋 Détails par logiciel

### 📊 GLPI

- Installe Apache, PHP (avec toutes les extensions nécessaires) et MariaDB
- Télécharge la dernière version de GLPI depuis GitHub
- Configure automatiquement le vhost Apache
- Génère un mot de passe BDD aléatoire et sécurisé
- Version configurable lors de l'installation

### 📈 Zabbix

- Ajoute le dépôt officiel Zabbix
- Installe le serveur, le frontend PHP et l'agent
- Crée et importe le schéma de base de données
- Configure automatiquement le mot de passe dans `zabbix_server.conf`
- Démarre et active tous les services

### 🔍 Nagios Core

- Compile Nagios Core depuis les sources officielles
- Installe les plugins Nagios
- Crée l'utilisateur et les groupes système
- Génère un mot de passe admin pour l'interface web
- Configure Apache avec les modules nécessaires (CGI, rewrite)

### 📞 XiVO / Wazo (Docker)

- Installe Docker et Docker Compose automatiquement si absents
- Déploie XiVO/Wazo via un `docker-compose.yml` précconfiguré
- Expose les ports nécessaires (80, 443, 5060 SIP, etc.)
- Volumes persistants pour les données, logs et configuration

---

## 🗑️ Désinstallation

Le script inclut un menu de désinstallation propre pour chaque logiciel :
- Suppression des fichiers et configurations
- Suppression des bases de données et utilisateurs
- Arrêt des services et conteneurs Docker

---

## 🔍 Vérification des services

L'option **"Vérifier les services installés"** affiche l'état de chaque logiciel :

```
  ●  GLPI            Installé  →  http://10.0.0.1
  ●  Zabbix Server   Actif     →  http://10.0.0.1/zabbix
  ○  Nagios          Non installé
  ●  XiVO/Wazo       Actif     →  https://10.0.0.1
```

---

## ⚠️ Notes importantes

- Le script doit être exécuté en **root** (`sudo`)
- **XiVO** utilise les ports 80/443 — assurez-vous qu'aucun autre service ne les utilise
- Les mots de passe générés sont affichés une seule fois — **notez-les !**
- Les installations de GLPI et Zabbix utilisent MariaDB
- Nagios est compilé depuis les sources (peut prendre quelques minutes)

---

## 📝 Licence

MIT — Libre d'utilisation, modification et distribution.

---

<p align="center">
  <sub>Fait avec 💚 par <a href="https://github.com/edo-ops">edo-ops</a></sub>
</p>
