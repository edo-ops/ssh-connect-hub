#!/bin/bash
set -e

# ============================================
#  Installateur de logiciels — Debian / Ubuntu
#  Compatible : Debian 12, 13 — Ubuntu 22.04+
# ============================================

# ── Couleurs ────────────────────────────────
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ── Vérifications ───────────────────────────
check_root() {
  if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Ce script doit être exécuté en tant que root (sudo)${NC}"
    exit 1
  fi
}

detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_NAME="$ID"
    OS_VERSION="$VERSION_ID"
    OS_CODENAME="$VERSION_CODENAME"
    OS_PRETTY="$PRETTY_NAME"
  else
    echo -e "${RED}❌ Impossible de détecter l'OS${NC}"
    exit 1
  fi

  case "$OS_NAME" in
    debian)
      if [[ "$OS_VERSION" != "12" && "$OS_VERSION" != "13" ]]; then
        echo -e "${YELLOW}⚠ Debian $OS_VERSION non testé. Continuer ? (o/n)${NC}"
        read -r yn; [[ "$yn" != "o" ]] && exit 0
      fi
      ;;
    ubuntu)
      local major="${OS_VERSION%%.*}"
      if (( major < 22 )); then
        echo -e "${YELLOW}⚠ Ubuntu $OS_VERSION non testé. Continuer ? (o/n)${NC}"
        read -r yn; [[ "$yn" != "o" ]] && exit 0
      fi
      ;;
    *)
      echo -e "${RED}❌ OS non supporté : $OS_PRETTY${NC}"
      echo -e "${DIM}   Supportés : Debian 12/13, Ubuntu 22.04+${NC}"
      exit 1
      ;;
  esac

  echo -e "${GREEN}✓ OS détecté : ${BOLD}$OS_PRETTY${NC}"
}

# ── Utilitaires ─────────────────────────────
separator() {
  echo -e "${DIM}──────────────────────────────────────────────${NC}"
}

log_step() {
  echo -e "\n${CYAN}▶ $1${NC}"
}

log_ok() {
  echo -e "${GREEN}  ✓ $1${NC}"
}

log_warn() {
  echo -e "${YELLOW}  ⚠ $1${NC}"
}

log_err() {
  echo -e "${RED}  ✗ $1${NC}"
}

install_base_deps() {
  log_step "Mise à jour des paquets et installation des dépendances de base..."
  apt update -qq
  apt install -y -qq curl wget gnupg2 lsb-release apt-transport-https ca-certificates software-properties-common > /dev/null 2>&1
  log_ok "Dépendances de base installées"
}

# ── Installation GLPI ───────────────────────
install_glpi() {
  echo ""
  separator
  echo -e "${BOLD}${CYAN}  📦 Installation de GLPI${NC}"
  separator

  local GLPI_VERSION="10.0.16"
  read -rp "  Version de GLPI [$GLPI_VERSION] : " input_version
  GLPI_VERSION="${input_version:-$GLPI_VERSION}"

  log_step "Installation d'Apache, PHP et MariaDB..."
  apt install -y -qq apache2 mariadb-server \
    php php-curl php-gd php-intl php-xml php-mbstring php-ldap \
    php-imap php-apcu php-xmlrpc php-zip php-bz2 \
    php-mysql php-cli > /dev/null 2>&1
  log_ok "Paquets installés"

  log_step "Configuration de MariaDB..."
  local DB_NAME="glpi_db"
  local DB_USER="glpi_user"
  local DB_PASS
  DB_PASS=$(openssl rand -base64 16)

  mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
  mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
  mysql -e "FLUSH PRIVILEGES;"
  log_ok "Base de données créée"

  log_step "Téléchargement de GLPI ${GLPI_VERSION}..."
  cd /tmp
  wget -q "https://github.com/glpi-project/glpi/releases/download/${GLPI_VERSION}/glpi-${GLPI_VERSION}.tgz" -O glpi.tgz
  tar xzf glpi.tgz
  rm -rf /var/www/html/glpi
  mv glpi /var/www/html/
  chown -R www-data:www-data /var/www/html/glpi
  chmod -R 755 /var/www/html/glpi
  rm -f glpi.tgz
  log_ok "GLPI déployé dans /var/www/html/glpi"

  log_step "Configuration d'Apache..."
  cat > /etc/apache2/sites-available/glpi.conf << 'EOF'
<VirtualHost *:80>
    DocumentRoot /var/www/html/glpi/public
    <Directory /var/www/html/glpi/public>
        AllowOverride All
        Require all granted
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteRule ^(.*)$ index.php [QSA,L]
    </Directory>
</VirtualHost>
EOF

  a2enmod rewrite > /dev/null 2>&1
  a2ensite glpi.conf > /dev/null 2>&1
  a2dissite 000-default.conf > /dev/null 2>&1 || true
  systemctl restart apache2
  log_ok "Apache configuré et redémarré"

  # Résumé
  echo ""
  separator
  echo -e "  ${GREEN}${BOLD}✅ GLPI ${GLPI_VERSION} installé avec succès !${NC}"
  separator
  echo -e "  ${BOLD}Accès :${NC} http://$(hostname -I | awk '{print $1}')"
  echo -e "  ${BOLD}Login :${NC} glpi / glpi (à changer !)"
  echo ""
  echo -e "  ${BOLD}Base de données :${NC}"
  echo -e "    Serveur  : localhost"
  echo -e "    Base     : ${DB_NAME}"
  echo -e "    User     : ${DB_USER}"
  echo -e "    Mot de passe : ${YELLOW}${DB_PASS}${NC}"
  echo -e "  ${RED}⚠ Notez ce mot de passe, il sera demandé lors du setup web${NC}"
  separator
}

# ── Installation Zabbix ─────────────────────
install_zabbix() {
  echo ""
  separator
  echo -e "${BOLD}${CYAN}  📦 Installation de Zabbix${NC}"
  separator

  local ZABBIX_VERSION="7.0"
  read -rp "  Version majeure de Zabbix [$ZABBIX_VERSION] : " input_version
  ZABBIX_VERSION="${input_version:-$ZABBIX_VERSION}"

  local ZABBIX_REPO_VERSION="7.0-2"

  log_step "Ajout du dépôt Zabbix..."
  case "$OS_NAME" in
    debian)
      wget -q "https://repo.zabbix.com/zabbix/${ZABBIX_VERSION}/debian/pool/main/z/zabbix-release/zabbix-release_latest_${ZABBIX_VERSION}+debian${OS_VERSION}_all.deb" -O /tmp/zabbix-release.deb
      ;;
    ubuntu)
      wget -q "https://repo.zabbix.com/zabbix/${ZABBIX_VERSION}/ubuntu/pool/main/z/zabbix-release/zabbix-release_latest_${ZABBIX_VERSION}+ubuntu${OS_VERSION}_all.deb" -O /tmp/zabbix-release.deb
      ;;
  esac
  dpkg -i /tmp/zabbix-release.deb > /dev/null 2>&1
  apt update -qq
  log_ok "Dépôt Zabbix ajouté"

  log_step "Installation des paquets Zabbix..."
  apt install -y -qq zabbix-server-mysql zabbix-frontend-php zabbix-apache-conf zabbix-sql-scripts zabbix-agent > /dev/null 2>&1
  log_ok "Paquets installés"

  log_step "Installation de MariaDB..."
  apt install -y -qq mariadb-server > /dev/null 2>&1

  local DB_NAME="zabbix"
  local DB_USER="zabbix"
  local DB_PASS
  DB_PASS=$(openssl rand -base64 16)

  mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;"
  mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
  mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
  mysql -e "SET GLOBAL log_bin_trust_function_creators = 1;"
  mysql -e "FLUSH PRIVILEGES;"
  log_ok "Base de données créée"

  log_step "Import du schéma Zabbix (peut prendre quelques minutes)..."
  zcat /usr/share/zabbix-sql-scripts/mysql/server.sql.gz | mysql --default-character-set=utf8mb4 ${DB_NAME}
  mysql -e "SET GLOBAL log_bin_trust_function_creators = 0;"
  log_ok "Schéma importé"

  log_step "Configuration de Zabbix Server..."
  sed -i "s/^# DBPassword=.*/DBPassword=${DB_PASS}/" /etc/zabbix/zabbix_server.conf
  sed -i "s/^DBPassword=.*/DBPassword=${DB_PASS}/" /etc/zabbix/zabbix_server.conf 2>/dev/null || true
  # S'assurer que DBPassword est défini
  grep -q "^DBPassword=" /etc/zabbix/zabbix_server.conf || echo "DBPassword=${DB_PASS}" >> /etc/zabbix/zabbix_server.conf
  log_ok "Configuration mise à jour"

  log_step "Démarrage des services..."
  systemctl restart zabbix-server zabbix-agent apache2
  systemctl enable zabbix-server zabbix-agent apache2
  log_ok "Services démarrés et activés"

  echo ""
  separator
  echo -e "  ${GREEN}${BOLD}✅ Zabbix ${ZABBIX_VERSION} installé avec succès !${NC}"
  separator
  echo -e "  ${BOLD}Accès :${NC} http://$(hostname -I | awk '{print $1}')/zabbix"
  echo -e "  ${BOLD}Login :${NC} Admin / zabbix"
  echo ""
  echo -e "  ${BOLD}Base de données :${NC}"
  echo -e "    Base     : ${DB_NAME}"
  echo -e "    User     : ${DB_USER}"
  echo -e "    Mot de passe : ${YELLOW}${DB_PASS}${NC}"
  separator
}

# ── Installation Nagios ─────────────────────
install_nagios() {
  echo ""
  separator
  echo -e "${BOLD}${CYAN}  📦 Installation de Nagios Core${NC}"
  separator

  local NAGIOS_VERSION="4.5.7"
  local PLUGINS_VERSION="2.4.12"
  read -rp "  Version de Nagios Core [$NAGIOS_VERSION] : " input_version
  NAGIOS_VERSION="${input_version:-$NAGIOS_VERSION}"

  log_step "Installation des dépendances..."
  apt install -y -qq apache2 php libapache2-mod-php php-gd \
    build-essential libgd-dev unzip openssl libssl-dev \
    autoconf gcc libc6 make wget > /dev/null 2>&1
  log_ok "Dépendances installées"

  log_step "Création de l'utilisateur nagios..."
  id nagios > /dev/null 2>&1 || useradd -m -s /bin/bash nagios
  groupadd -f nagcmd
  usermod -aG nagcmd nagios
  usermod -aG nagcmd www-data
  log_ok "Utilisateur et groupes créés"

  log_step "Téléchargement et compilation de Nagios ${NAGIOS_VERSION}..."
  cd /tmp
  wget -q "https://github.com/NagiosEnterprises/nagioscore/releases/download/nagios-${NAGIOS_VERSION}/nagios-${NAGIOS_VERSION}.tar.gz" -O nagios.tar.gz
  tar xzf nagios.tar.gz
  cd "nagios-${NAGIOS_VERSION}"
  ./configure --with-httpd-conf=/etc/apache2/sites-enabled --with-command-group=nagcmd > /dev/null 2>&1
  make all -j"$(nproc)" > /dev/null 2>&1
  make install > /dev/null 2>&1
  make install-init > /dev/null 2>&1
  make install-config > /dev/null 2>&1
  make install-commandmode > /dev/null 2>&1
  make install-webconf > /dev/null 2>&1
  log_ok "Nagios compilé et installé"

  log_step "Téléchargement et compilation des plugins..."
  cd /tmp
  wget -q "https://github.com/nagios-plugins/nagios-plugins/releases/download/release-${PLUGINS_VERSION}/nagios-plugins-${PLUGINS_VERSION}.tar.gz" -O nagios-plugins.tar.gz
  tar xzf nagios-plugins.tar.gz
  cd "nagios-plugins-${PLUGINS_VERSION}"
  ./configure --with-nagios-user=nagios --with-nagios-group=nagcmd > /dev/null 2>&1
  make -j"$(nproc)" > /dev/null 2>&1
  make install > /dev/null 2>&1
  log_ok "Plugins installés"

  log_step "Configuration du mot de passe admin..."
  local NAGIOS_PASS
  NAGIOS_PASS=$(openssl rand -base64 12)
  htpasswd -bc /usr/local/nagios/etc/htpasswd.users nagiosadmin "${NAGIOS_PASS}" > /dev/null 2>&1
  log_ok "Utilisateur web créé"

  log_step "Activation d'Apache et démarrage..."
  a2enmod rewrite cgi > /dev/null 2>&1
  systemctl restart apache2
  systemctl enable nagios
  systemctl start nagios
  log_ok "Services démarrés"

  # Nettoyage
  rm -rf /tmp/nagios-${NAGIOS_VERSION} /tmp/nagios-plugins-${PLUGINS_VERSION} /tmp/nagios.tar.gz /tmp/nagios-plugins.tar.gz

  echo ""
  separator
  echo -e "  ${GREEN}${BOLD}✅ Nagios Core ${NAGIOS_VERSION} installé avec succès !${NC}"
  separator
  echo -e "  ${BOLD}Accès :${NC} http://$(hostname -I | awk '{print $1}')/nagios"
  echo -e "  ${BOLD}Login :${NC} nagiosadmin"
  echo -e "  ${BOLD}Mot de passe :${NC} ${YELLOW}${NAGIOS_PASS}${NC}"
  echo -e "  ${RED}⚠ Notez ce mot de passe !${NC}"
  separator
}

# ── Installation XiVO (Docker) ──────────────
install_xivo() {
  echo ""
  separator
  echo -e "${BOLD}${CYAN}  📦 Installation de XiVO (via Docker)${NC}"
  separator

  # Vérifier/installer Docker
  if ! command -v docker &> /dev/null; then
    log_step "Installation de Docker..."
    curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
    systemctl enable --now docker
    log_ok "Docker installé et démarré"
  else
    log_ok "Docker déjà installé ($(docker --version | awk '{print $3}' | tr -d ','))"
  fi

  # Vérifier/installer Docker Compose
  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    log_step "Installation de Docker Compose..."
    apt install -y -qq docker-compose-plugin > /dev/null 2>&1 || {
      local COMPOSE_VERSION
      COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | sed 's/.*"v\(.*\)"/\1/')
      curl -fsSL "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
      chmod +x /usr/local/bin/docker-compose
    }
    log_ok "Docker Compose installé"
  else
    log_ok "Docker Compose déjà installé"
  fi

  log_step "Création de la configuration XiVO..."
  local XIVO_DIR="/opt/xivo-docker"
  mkdir -p "${XIVO_DIR}"

  cat > "${XIVO_DIR}/docker-compose.yml" << 'DOCKEREOF'
version: '3.8'

services:
  xivo:
    image: wazoplatform/wazo-platform:latest
    container_name: xivo
    hostname: xivo
    privileged: true
    ports:
      - "443:443"
      - "80:80"
      - "5060:5060/udp"
      - "5060:5060/tcp"
      - "5038:5038"
      - "1443:1443"
      - "9486:9486"
      - "9489:9489"
    volumes:
      - xivo_data:/var/lib/postgresql
      - xivo_logs:/var/log
      - xivo_etc:/etc
    restart: unless-stopped
    tmpfs:
      - /run
      - /tmp

volumes:
  xivo_data:
  xivo_logs:
  xivo_etc:
DOCKEREOF

  log_ok "docker-compose.yml créé dans ${XIVO_DIR}"

  echo ""
  echo -e "  ${YELLOW}⚠ XiVO/Wazo utilise les ports 80 et 443.${NC}"
  echo -e "  ${YELLOW}  Assurez-vous qu'aucun autre service ne les utilise.${NC}"
  echo ""
  read -rp "  Lancer le conteneur XiVO maintenant ? (o/n) [o] : " launch
  launch="${launch:-o}"

  if [[ "$launch" == "o" ]]; then
    log_step "Démarrage du conteneur XiVO..."
    cd "${XIVO_DIR}"
    docker compose up -d 2>/dev/null || docker-compose up -d
    log_ok "Conteneur XiVO démarré"

    echo ""
    echo -e "  ${DIM}Attente du démarrage des services (peut prendre 2-5 min)...${NC}"
  fi

  echo ""
  separator
  echo -e "  ${GREEN}${BOLD}✅ XiVO/Wazo déployé avec succès !${NC}"
  separator
  echo -e "  ${BOLD}Accès :${NC} https://$(hostname -I | awk '{print $1}')"
  echo -e "  ${BOLD}Dossier :${NC} ${XIVO_DIR}"
  echo ""
  echo -e "  ${BOLD}Commandes utiles :${NC}"
  echo -e "    Démarrer  : cd ${XIVO_DIR} && docker compose up -d"
  echo -e "    Arrêter   : cd ${XIVO_DIR} && docker compose down"
  echo -e "    Logs      : cd ${XIVO_DIR} && docker compose logs -f"
  echo -e "    Status    : docker ps | grep xivo"
  separator
}

# ── Désinstallation ─────────────────────────
uninstall_menu() {
  echo ""
  separator
  echo -e "${BOLD}${RED}  🗑️  Désinstallation${NC}"
  separator
  echo ""
  echo -e "  ${BOLD}1)${NC} Désinstaller GLPI"
  echo -e "  ${BOLD}2)${NC} Désinstaller Zabbix"
  echo -e "  ${BOLD}3)${NC} Désinstaller Nagios"
  echo -e "  ${BOLD}4)${NC} Désinstaller XiVO (Docker)"
  echo -e "  ${BOLD}0)${NC} Retour"
  echo ""
  read -rp "  Choix : " choice

  case $choice in
    1)
      echo -e "\n  ${YELLOW}⚠ Supprimer GLPI, sa base de données et Apache ? (o/n)${NC}"
      read -r yn
      if [[ "$yn" == "o" ]]; then
        rm -rf /var/www/html/glpi
        rm -f /etc/apache2/sites-available/glpi.conf
        mysql -e "DROP DATABASE IF EXISTS glpi_db; DROP USER IF EXISTS 'glpi_user'@'localhost';" 2>/dev/null || true
        systemctl restart apache2 2>/dev/null || true
        log_ok "GLPI supprimé"
      fi
      ;;
    2)
      echo -e "\n  ${YELLOW}⚠ Supprimer Zabbix et sa base de données ? (o/n)${NC}"
      read -r yn
      if [[ "$yn" == "o" ]]; then
        systemctl stop zabbix-server zabbix-agent 2>/dev/null || true
        apt purge -y zabbix-server-mysql zabbix-frontend-php zabbix-apache-conf zabbix-sql-scripts zabbix-agent > /dev/null 2>&1 || true
        mysql -e "DROP DATABASE IF EXISTS zabbix; DROP USER IF EXISTS 'zabbix'@'localhost';" 2>/dev/null || true
        log_ok "Zabbix supprimé"
      fi
      ;;
    3)
      echo -e "\n  ${YELLOW}⚠ Supprimer Nagios ? (o/n)${NC}"
      read -r yn
      if [[ "$yn" == "o" ]]; then
        systemctl stop nagios 2>/dev/null || true
        rm -rf /usr/local/nagios
        userdel nagios 2>/dev/null || true
        groupdel nagcmd 2>/dev/null || true
        rm -f /etc/apache2/sites-enabled/nagios.conf
        systemctl restart apache2 2>/dev/null || true
        log_ok "Nagios supprimé"
      fi
      ;;
    4)
      echo -e "\n  ${YELLOW}⚠ Supprimer le conteneur XiVO et ses données ? (o/n)${NC}"
      read -r yn
      if [[ "$yn" == "o" ]]; then
        cd /opt/xivo-docker 2>/dev/null && docker compose down -v 2>/dev/null || docker-compose down -v 2>/dev/null || true
        rm -rf /opt/xivo-docker
        log_ok "XiVO supprimé"
      fi
      ;;
    0) return ;;
  esac
}

# ── Menu principal ──────────────────────────
main_menu() {
  while true; do
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║                                              ║"
    echo "║   🛠️  Installateur de logiciels serveur       ║"
    echo "║                                              ║"
    echo "║   Compatible : Debian 12/13 — Ubuntu 22.04+  ║"
    echo "║                                              ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "  ${DIM}Système : ${OS_PRETTY}${NC}"
    echo ""
    separator
    echo ""
    echo -e "  ${BOLD}INSTALLER${NC}"
    echo ""
    echo -e "  ${GREEN}1)${NC}  📊  GLPI           ${DIM}— Gestion de parc informatique${NC}"
    echo -e "  ${GREEN}2)${NC}  📈  Zabbix          ${DIM}— Supervision réseau${NC}"
    echo -e "  ${GREEN}3)${NC}  🔍  Nagios Core     ${DIM}— Monitoring système${NC}"
    echo -e "  ${GREEN}4)${NC}  📞  XiVO/Wazo       ${DIM}— Téléphonie IP (Docker)${NC}"
    echo ""
    echo -e "  ${BOLD}OUTILS${NC}"
    echo ""
    echo -e "  ${YELLOW}5)${NC}  🗑️   Désinstaller"
    echo -e "  ${YELLOW}6)${NC}  ℹ️   Vérifier les services installés"
    echo ""
    echo -e "  ${RED}0)${NC}  Quitter"
    echo ""
    separator
    echo ""
    read -rp "  Votre choix : " choice

    case $choice in
      1) install_glpi ;;
      2) install_zabbix ;;
      3) install_nagios ;;
      4) install_xivo ;;
      5) uninstall_menu ;;
      6) check_services ;;
      0)
        echo -e "\n${GREEN}👋 À bientôt !${NC}\n"
        exit 0
        ;;
      *)
        echo -e "\n${RED}  Choix invalide${NC}"
        ;;
    esac

    echo ""
    read -rp "  Appuyez sur Entrée pour continuer..."
  done
}

# ── Vérification des services ───────────────
check_services() {
  echo ""
  separator
  echo -e "${BOLD}${CYAN}  ℹ️  État des services${NC}"
  separator
  echo ""

  local IP
  IP=$(hostname -I | awk '{print $1}')

  # GLPI
  if [ -d /var/www/html/glpi ]; then
    echo -e "  ${GREEN}●${NC}  GLPI            ${GREEN}Installé${NC}  →  http://${IP}"
  else
    echo -e "  ${DIM}○  GLPI            Non installé${NC}"
  fi

  # Zabbix
  if systemctl is-active --quiet zabbix-server 2>/dev/null; then
    echo -e "  ${GREEN}●${NC}  Zabbix Server   ${GREEN}Actif${NC}     →  http://${IP}/zabbix"
  elif dpkg -l | grep -q zabbix-server 2>/dev/null; then
    echo -e "  ${YELLOW}●${NC}  Zabbix Server   ${YELLOW}Installé (arrêté)${NC}"
  else
    echo -e "  ${DIM}○  Zabbix          Non installé${NC}"
  fi

  # Nagios
  if systemctl is-active --quiet nagios 2>/dev/null; then
    echo -e "  ${GREEN}●${NC}  Nagios Core     ${GREEN}Actif${NC}     →  http://${IP}/nagios"
  elif [ -d /usr/local/nagios ]; then
    echo -e "  ${YELLOW}●${NC}  Nagios Core     ${YELLOW}Installé (arrêté)${NC}"
  else
    echo -e "  ${DIM}○  Nagios          Non installé${NC}"
  fi

  # XiVO
  if docker ps 2>/dev/null | grep -q xivo; then
    echo -e "  ${GREEN}●${NC}  XiVO/Wazo       ${GREEN}Actif${NC}     →  https://${IP}"
  elif [ -f /opt/xivo-docker/docker-compose.yml ]; then
    echo -e "  ${YELLOW}●${NC}  XiVO/Wazo       ${YELLOW}Configuré (arrêté)${NC}"
  else
    echo -e "  ${DIM}○  XiVO/Wazo       Non installé${NC}"
  fi

  echo ""
  separator
}

# ── Point d'entrée ──────────────────────────
check_root
detect_os
install_base_deps
main_menu
