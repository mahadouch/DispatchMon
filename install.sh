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
        error "Docker non installé. Installe-le avec : curl -fsSL https://get.docker.com | sh"
    fi

    if ! command -v docker compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose non disponible. Mets à jour Docker."
    fi

    if ! command -v git &> /dev/null; then
        error "Git non installé. Installe-le avec : apt install git"
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

    # Nettoyer les anciens fichiers de DB incorrects
    if [ -d "$INSTALL_DIR/data/database.sqlite" ]; then
        warn "Suppression de l'ancien dossier database.sqlite..."
        rm -rf "$INSTALL_DIR/data/database.sqlite"
    fi
    mkdir -p "$INSTALL_DIR/data"
    touch "$INSTALL_DIR/data/database.sqlite"

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

# Créer le service systemd (optionnel, nécessite sudo)
create_service() {
    warn "Service systemd non créé (pas de sudo)."
    echo "  Pour démarrer manuellement :"
    echo "    cd $INSTALL_DIR && docker compose up -d"
    echo ""
    echo "  Pour un auto-start au boot, lance avec sudo :"
    echo "    sudo bash -c 'cat > /etc/systemd/system/dispatchmon.service << EOF"
    echo "[Unit]"
    echo "Description=DispatchMon Dashboard"
    echo "After=docker.service"
    echo "Requires=docker.service"
    echo ""
    echo "[Service]"
    echo "Type=oneshot"
    echo "RemainAfterExit=yes"
    echo "WorkingDirectory=$INSTALL_DIR"
    echo "ExecStart=/usr/bin/docker compose up -d"
    echo "ExecStop=/usr/bin/docker compose down"
    echo "TimeoutStartSec=120"
    echo ""
    echo "[Install]"
    echo "WantedBy=multi-user.target"
    echo "EOF'"
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
