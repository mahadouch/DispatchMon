FROM php:8.3-cli

# Install system deps
RUN apt-get update && apt-get install -y \
    git curl zip unzip libpng-dev libjpeg-dev libfreetype6-dev \
    libonig-dev libxml2-dev libsqlite3-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_sqlite mbstring exif pcntl bcmath gd \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy composer files first for caching
COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist 2>/dev/null || true

# Copy everything else
COPY . .

# Generate autoloader
RUN composer dump-autoload --optimize

# Configure SQLite
RUN touch database/database.sqlite

# Run migrations and seed
RUN php artisan migrate --force 2>/dev/null || true

# CORS + config
ENV APP_ENV=local
ENV APP_DEBUG=true
ENV APP_URL=http://localhost:8000

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
