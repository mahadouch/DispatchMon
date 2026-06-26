#!/bin/bash
set -e

# Créer la base SQLite si elle n'existe pas
touch "$DB_DATABASE"
chmod 777 "$DB_DATABASE"

# Lancer les migrations silencieusement
php artisan migrate --force

# Lancer le serveur
exec php artisan serve --host=0.0.0.0 --port=8000
