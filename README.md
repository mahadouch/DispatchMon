# 📊 Dispatcharr Platform

Dashboard web temps réel pour **Dispatcharr** — monitorer les chaînes, clients, événements et notifications Telegram.

---

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Technologies](#-technologies)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration Dispatcharr](#-configuration-dispatcharr)
- [Notifications Telegram](#-notifications-telegram)
- [API Reference](#-api-reference)
- [Structure du projet](#-structure-du-projet)
- [Screenshots](#-screenshots)

---

## ✨ Fonctionnalités

| Module | Description |
|--------|-------------|
| **👥 Clients** | Liste des clients connus (IP, username, pays, sessions) avec recherche |
| **🟢 Actifs** | Clients en temps réel connectés aux chaînes |
| **📺 Chaînes** | État des chaînes (live/off), nombre de viewers |
| **📝 Événements** | Historique des événements avec client, pays et type |
| **⚙️ Paramètres** | Configuration des notifications Telegram |
| **📱 Telegram** | Notifications push pour connexions, déconnexions, erreurs |

### Dashboard

- **Stats globales** : chaînes, viewers actifs, événements 24h
- **Auto-refresh** toutes les 10 secondes
- **Dark theme** avec design moderne
- **Timeline** des événements par heure (24h)

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Dispatcharr     │────▶│  Webhook POST     │
│  (IPTV Server)   │     │  /api/webhook/    │
└─────────────────┘     └────────┬─────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Backend (Laravel)      │
                    │   - WebhookController    │
                    │   - StatsController      │
                    │   - ClientController     │
                    │   - SettingsController   │
                    │   - TelegramService      │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   SQLite Database        │
                    │   - dispatcharr_events   │
                    │   - channels             │
                    │   - active_clients       │
                    │   - known_clients        │
                    │   - settings             │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Frontend (React)       │
                    │   Port 3000              │
                    └─────────────────────────┘
```

### Flow des événements

1. Dispatcharr envoie un webhook → `POST /api/webhook/dispatcharr`
2. Le backend sauvegarde l'événement et met à jour les stats
3. Le frontend poll l'API toutes les 10s pour afficher les données
4. Si Telegram est configuré, une notification est envoyée automatiquement

---

## 🛠️ Technologies

| Composant | Technologie | Version |
|-----------|-------------|---------|
| **Backend** | Laravel (PHP) | 11.x |
| **Frontend** | React + Vite | 19.x / 6.x |
| **Base de données** | SQLite | — |
| **Conteneurs** | Docker | — |
| **Notifications** | Telegram Bot API | — |

---

## 📦 Prérequis

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- Un serveur **Dispatcharr** fonctionnel (v0.27+)
- (Optionnel) Un bot Telegram pour les notifications

---

## 🚀 Installation

### 1. Cloner le repo

```bash
git clone https://github.com/mahadouch/dispatcharr-platform.git
cd dispatcharr-platform
```

### 2. Lancer avec Docker

```bash
docker compose up -d --build
```

Les services démarrent sur :

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | `http://localhost:3000` | Dashboard web |
| **Backend** | `http://localhost:8000` | API REST |

### 3. Vérifier que tout fonctionne

```bash
# Vérifier les conteneurs
docker compose ps

# Logs backend
docker compose logs -f backend

# Logs frontend
docker compose logs -f frontend
```

---

## ⚙️ Configuration Dispatcharr

Dans votre serveur Dispatcharr, configurez l'intégration webhook :

1. Allez dans **Settings** → **Integrations** → **Connect**
2. Activez le webhook
3. Entrez l'URL : `http://<VOTRE_IP>:8000/api/webhook/dispatcharr`
4. Sélectionnez les événements à envoyer :
   - `channel_start`
   - `channel_stop`
   - `client_connect`
   - `client_disconnect`
   - `stream_error`

---

## 📱 Notifications Telegram

### Étape 1 : Créer un bot

1. Ouvrez Telegram et cherchez **@BotFather**
2. Envoyez `/newbot`
3. Choisissez un nom et un username
4. Copiez le **Bot Token** (ex: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Étape 2 : Récupérer le Chat ID

1. Envoyez un message à votre bot
2. Ouvrez cette URL dans votre navigateur :
   ```
   https://api.telegram.org/bot<VOTRE_TOKEN>/getUpdates
   ```
3. Cherchez `"chat":{"id":` → c'est votre **Chat ID**

> 💡 Pour un groupe, ajoutez le bot au groupe et utilisez le Chat ID négatif du groupe.

### Étape 3 : Configurer dans le dashboard

1. Ouvrez `http://localhost:3000`
2. Allez dans l'onglet **⚙️ Paramètres**
3. Cochez **Activer les notifications Telegram**
4. Entrez le **Bot Token** et le **Chat ID**
5. Choisissez les événements à notifier
6. Cliquez sur **💾 Sauvegarder**
7. Cliquez sur **🧪 Tester** pour vérifier

### Types de notifications

| Événement | Notification |
|-----------|--------------|
| `client_connect` | 🟢 Nouveau client + IP + pays + chaîne |
| `client_disconnect` | 🔴 Déconnexion client |
| `channel_start` | ▶️ Chaîne démarrée |
| `channel_stop` | ⏹️ Chaîne arrêtée |
| `stream_error` | ⚠️ Erreur + message |

### Exemple de notification

```
🟢 Nouveau client
👤 user123 🇲🇦 Maroc
📺 beIN Sports 1
```

---

## 📡 API Reference

### Webhook

```
POST /api/webhook/dispatcharr
```

Reçoit les événements de Dispatcharr. Pas d'authentification requise.

**Payload attendu :**
```json
{
  "event": "client_connect",
  "channel_name": "beIN Sports 1",
  "client_ip": "192.168.1.100",
  "client_id": "abc123",
  "username": "user123",
  "user_agent": "VLC/3.0"
}
```

### Stats

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/stats/summary` | Résumé global (chaînes, viewers, événements) |
| `GET` | `/api/stats/channels` | Liste des chaînes avec viewers |
| `GET` | `/api/stats/events` | 200 derniers événements |
| `GET` | `/api/stats/events/by-type` | Compteur par type (24h) |
| `GET` | `/api/stats/clients` | Clients actifs |
| `GET` | `/api/stats/timeline` | Événements par heure (24h) |
| `GET` | `/api/stats/m3u` | Stats rafraîchissements M3U |
| `DELETE` | `/api/stats/events` | Purger événements > 30 jours |

### Clients

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/clients` | Tous les clients connus |
| `GET` | `/api/clients/active` | Clients actuellement connectés |
| `GET` | `/api/clients/stats` | Stats (payés / non payés) |
| `PUT` | `/api/clients/{id}/pay` | Marquer comme payé |
| `PUT` | `/api/clients/{id}/unpay` | Marquer comme non payé |
| `POST` | `/api/clients/batch-pay` | Marquer plusieurs clients payés |

### Settings

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/settings` | Récupérer tous les settings |
| `PUT` | `/api/settings` | Mettre à jour les settings |
| `POST` | `/api/settings/telegram/test` | Tester la notification Telegram |

---

## 📁 Structure du projet

```
dispatcharr-platform/
├── docker-compose.yml          # Orchestration Docker
├── Dockerfile.backend          # Image backend Laravel
├── Dockerfile.frontend         # Image frontend React
│
├── backend/
│   ├── Dockerfile              # Dockerfile alternatif backend
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── WebhookController.php    # Réception webhooks Dispatcharr
│   │   │   ├── StatsController.php      # API statistiques
│   │   │   ├── ClientController.php     # Gestion clients
│   │   │   └── SettingsController.php   # Gestion paramètres
│   │   ├── Models/
│   │   │   ├── DispatcharrEvent.php     # Événements
│   │   │   ├── Channel.php              # Chaînes
│   │   │   ├── ActiveClient.php         # Clients actifs
│   │   │   ├── KnownClient.php          # Clients connus
│   │   │   └── Setting.php              # Paramètres
│   │   └── Services/
│   │       └── TelegramService.php      # Envoi notifications Telegram
│   ├── bootstrap/app.php
│   ├── config/cors.php
│   ├── database/migrations/
│   │   ├── ..._create_dispatcharr_events_table.php
│   │   ├── ..._create_channels_table.php
│   │   ├── ..._create_active_clients_table.php
│   │   ├── ..._add_paid_flag_to_active_clients.php
│   │   └── ..._create_settings_table.php
│   └── routes/api.php
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js          # Proxy /api → backend:8000
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx             # Dashboard complet (single-file)
        └── index.css           # Styles dark theme
```

---

## 🔧 Développement

### Backend (sans Docker)

```bash
cd backend
composer install
php artisan migrate
php artisan serve --port=8000
```

### Frontend (sans Docker)

```bash
cd frontend
npm install
npm run dev
```

> ⚠️ En mode dev sans Docker, modifiez `vite.config.js` pour pointer vers `localhost:8000` au lieu de `backend:8000`.

---

## 🐳 Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `APP_ENV` | `local` | Environnement Laravel |
| `APP_DEBUG` | `true` | Mode debug |
| `DB_CONNECTION` | `sqlite` | Type de base |
| `DB_DATABASE` | `/var/www/html/database/database.sqlite` | Chemin SQLite |

---

## 📝 License

MIT

---

## 👤 Auteur

**mahadouch** — [GitHub](https://github.com/mahadouch)
