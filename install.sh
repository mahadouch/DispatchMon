#!/bin/bash
set -e

# ============================================
#  DispatchMon - Script d'installation/mise à jour
#  curl -fsSL https://raw.githubusercontent.com/mahadouch/DispatchMon/master/install.sh | bash
# ============================================

REPO="mahadouch/DispatchMon"
INSTALL_DIR="$HOME/DispatchMon"
BRANCH="master"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_logo() {
    echo -e "${BLUE}"
    echo "  ╔═══════════════════════════════════════╗"
    echo "  ║       📊 DispatchMon Installer        ║"
    echo "  ╚═══════════════════════════════════════╝"
    echo -e "${NC}"
}

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Vérifier les prérequis
check_prereqs() {
    log "Vérification des prérequis..."

    if ! command -v docker &> /dev/null; then
        warn "Docker non installé. Installation..."
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
        log "Docker installé. Redémarre ta session pour les permissions."
        echo -e "${YELLOW}Relance ce script après avoir ouvert un nouveau terminal.${NC}"
        exit 0
    fi

    if ! command -v docker compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose non disponible. Mets à jour Docker."
    fi

    if ! command -v git &> /dev/null; then
        warn "Git non installé. Installation..."
        sudo apt-get update -qq && sudo apt-get install -y -qq git
    fi

    log "Prérequis OK ✓"
}

# Installer ou mettre à jour
install_or_update() {
    if [ -d "$INSTALL_DIR/.git" ]; then
        log "Mise à jour de DispatchMon..."
        cd "$INSTALL_DIR"
        git pull origin "$BRANCH"
    else
        log "Installation de DispatchMon..."
        git clone --depth 1 "https://github.com/$REPO.git" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
}

# Docker
docker_build() {
    log "Construction des images Docker..."
    docker compose build --no-cache

    log "Démarrage des conteneurs..."
    docker compose up -d

    # Attendre que le backend soit prêt
    log "Attente du démarrage du backend..."
    for i in $(seq 1 30); do
        if curl -s http://localhost:8000/api/stats/summary > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done

    # Lancer les migrations
    log "Exécution des migrations..."
    docker compose exec -T backend php artisan migrate --force 2>/dev/null || true
}

# Créer le service systemd
create_service() {
    log "Création du service systemd..."

    sudo tee /etc/systemd/system/dispatchmon.service > /dev/null <<EOF
[Unit]
Description=DispatchMon Dashboard
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose up -d --build
TimeoutStartSec=120

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable dispatchmon.service
    log "Service dispatchmon créé et activé ✓"
    log "Démarrage du service..."
    sudo systemctl start dispatchmon.service
}

# Vérifier la config Telegram
check_telegram() {
    if [ -f ".env" ] && grep -q "TELEGRAM_BOT_TOKEN" .env; then
        log "Configuration Telegram trouvée dans .env"
    else
        warn "Telegram non configuré."
        echo ""
        echo -e "  Configure Telegram dans .env :"
        echo -e "  ${BLUE}nano .env${NC}"
        echo ""
        echo -e "  ${YELLOW}TELEGRAM_BOT_TOKEN=ton_token${NC}"
        echo -e "  ${YELLOW}TELEGRAM_CHAT_ID=ton_chat_id${NC}"
        echo -e "  ${YELLOW}TELEGRAM_ENABLED=1${NC}"
        echo ""
    fi
}

# Afficher le résumé
print_summary() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          ✅ Installation terminée !           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  📊 Dashboard :  ${BLUE}http://$(hostname -I | awk '{print $1}'):3000${NC}"
    echo -e "  🔧 API :        ${BLUE}http://$(hostname -I | awk '{print $1}'):8000${NC}"
    echo ""
    echo -e "  📁 Fichiers :   ${BLUE}$INSTALL_DIR${NC}"
    echo -e "  🔧 Service :    ${YELLOW}sudo systemctl {start|stop|restart|status} dispatchmon${NC}"
    echo ""
    echo -e "  Commandes utiles :"
    echo -e "    ${YELLOW}sudo systemctl status dispatchmon${NC}              Statut"
    echo -e "    ${YELLOW}sudo systemctl restart dispatchmon${NC}             Redémarrer"
    echo -e "    ${YELLOW}sudo journalctl -u dispatchmon -f${NC}             Voir les logs"
    echo -e "    ${YELLOW}cd $INSTALL_DIR && git pull && sudo systemctl restart dispatchmon${NC}  Mettre à jour"
    echo ""
}

# Main
print_logo
check_prereqs
install_or_update
docker_build
create_service
check_telegram
print_summary
