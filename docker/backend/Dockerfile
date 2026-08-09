FROM php:8.3-cli

RUN apt-get update && apt-get install -y \
    git curl zip unzip \
    libpng-dev libonig-dev libxml2-dev libzip-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip opcache \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Opcache for cli-server (massive speedup - bytecode cached across requests)
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.enable_cli=1'; \
    echo 'opcache.memory_consumption=128'; \
    echo 'opcache.interned_strings_buffer=16'; \
    echo 'opcache.max_accelerated_files=10000'; \
    echo 'opcache.validate_timestamps=1'; \
    echo 'opcache.revalidate_freq=60'; \
    echo 'realpath_cache_size=4096K'; \
    echo 'realpath_cache_ttl=600'; \
    } > /usr/local/etc/php/conf.d/opcache.ini

COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 8080

CMD ["bash", "-c", "[ ! -f vendor/autoload.php ] && composer install --no-interaction; php artisan storage:link --quiet 2>/dev/null || true; php artisan serve --host=0.0.0.0 --port=8080"]
