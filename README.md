# 📊 DispatchMon

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

## 📋 Templates Webhook Dispatcharr

Voici les payloads envoyés par Dispatcharr via la Connect Integration. Copiez-collez ces exemples pour tester votre endpoint.

### 🔌 client_connect

```json
{
  "event": "client_connect",
  "channel_name": "beIN Sports 1",
  "stream_name": "beinsports1-hd",
  "stream_url": "http://source.example.com/live/stream1",
  "client_ip": "192.168.1.100",
  "client_id": "abc123-def456",
  "user_agent": "VLC/3.0.21 LibVLC/3.0.21",
  "username": "user123",
  "timestamp": "2025-06-26T10:30:00Z"
}
```

**Champs traités :**
| Champ | Type | Description |
|-------|------|-------------|
| `event` | string | Type d'événement (`client_connect`) |
| `channel_name` | string | Nom de la chaîne regardée |
| `stream_name` | string | Nom du stream |
| `client_ip` | string | IP du client |
| `client_id` | string | ID unique de la session client |
| `user_agent` | string | User-Agent du lecteur |
| `username` | string | Nom d'utilisateur (si authentifié) |

---

### 🔴 client_disconnect

```json
{
  "event": "client_disconnect",
  "channel_name": "beIN Sports 1",
  "client_ip": "192.168.1.100",
  "client_id": "abc123-def456",
  "username": "user123",
  "duration": 3600.5,
  "bytes_sent": 2147483648,
  "reason": "client_closed",
  "timestamp": "2025-06-26T11:30:00Z"
}
```

**Champs traités :**
| Champ | Type | Description |
|-------|------|-------------|
| `duration` | float | Durée de la session en secondes |
| `bytes_sent` | int | Volume total envoyé en octets |
| `reason` | string | Raison de la déconnexion |

---

### ▶️ channel_start

```json
{
  "event": "channel_start",
  "channel_name": "beIN Sports 1",
  "stream_name": "beinsports1-hd",
  "stream_url": "http://source.example.com/live/stream1",
  "provider_name": "M3U Account 1",
  "profile_used": "default",
  "source_name": "source-1",
  "timestamp": "2025-06-26T10:00:00Z"
}
```

**Champs traités :**
| Champ | Type | Description |
|-------|------|-------------|
| `provider_name` | string | Nom du compte M3U/fournisseur |
| `profile_used` | string | Profil de transcodage utilisé |
| `source_name` | string | Nom de la source |

---

### ⏹️ channel_stop

```json
{
  "event": "channel_stop",
  "channel_name": "beIN Sports 1",
  "runtime": 7200.3,
  "total_bytes": 4294967296,
  "reason": "stream_ended",
  "timestamp": "2025-06-26T12:00:00Z"
}
```

**Champs traités :**
| Champ | Type | Description |
|-------|------|-------------|
| `runtime` | float | Durée du stream en secondes |
| `total_bytes` | int | Volume total transféré en octets |
| `reason` | string | Raison de l'arrêt |

---

### ⚠️ stream_error

```json
{
  "event": "stream_error",
  "channel_name": "beIN Sports 1",
  "stream_name": "beinsports1-hd",
  "error_type": "connection_timeout",
  "error_message": "Could not connect to upstream source after 30s",
  "source_name": "source-1",
  "provider_name": "M3U Account 1",
  "timestamp": "2025-06-26T10:05:00Z"
}
```

**Champs traités :**
| Champ | Type | Description |
|-------|------|-------------|
| `error_type` | string | Type d'erreur |
| `error_message` | string | Message d'erreur détaillé |

---

### 📡 m3u_refresh

```json
{
  "event": "m3u_refresh",
  "account_name": "M3U Account 1",
  "channels_count": 1058,
  "streams_created": 12,
  "streams_updated": 5,
  "streams_deleted": 2,
  "programs": 850,
  "timestamp": "2025-06-26T06:00:00Z"
}
```

**Champs traités :**
| Champ | Type | Description |
|-------|------|-------------|
| `account_name` | string | Nom du compte M3U |
| `channels_count` | int | Nombre total de chaînes |
| `streams_created` | int | Nouveaux streams créés |
| `streams_updated` | int | Streams mis à jour |
| `streams_deleted` | int | Streams supprimés |
| `programs` | int | Nombre de programmes EPG |

---

### 🔑 login_success / login_failed

```json
{
  "event": "login_success",
  "username": "user123",
  "client_ip": "192.168.1.100",
  "user_agent": "VLC/3.0.21",
  "timestamp": "2025-06-26T10:30:00Z"
}
```

```json
{
  "event": "login_failed",
  "username": "hacker99",
  "client_ip": "45.33.100.5",
  "user_agent": "curl/7.88.1",
  "error_message": "Invalid credentials",
  "timestamp": "2025-06-26T10:31:00Z"
}
```

---

### 🔀 stream_switch / channel_failover

```json
{
  "event": "stream_switch",
  "channel_name": "beIN Sports 1",
  "stream_name": "beinsports1-hd",
  "source_name": "source-2",
  "reason": "source_unavailable",
  "timestamp": "2025-06-26T10:15:00Z"
}
```

---

### 🎬 recording_start / recording_end

```json
{
  "event": "recording_start",
  "channel_name": "beIN Sports 1",
  "content_name": "Match_Ligue1_2025",
  "content_uuid": "rec-uuid-12345",
  "timestamp": "2025-06-26T20:00:00Z"
}
```

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
