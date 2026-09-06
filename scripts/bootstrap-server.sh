#!/usr/bin/env bash
#
# Prepares a fresh Ubuntu server to run this site: Docker, nginx, certbot,
# firewall, and the repo itself. Written for Oracle Cloud Always Free (ARM),
# but nothing here is Oracle-specific - it works on any Ubuntu 22.04/24.04 box.
#
# Run as a normal sudo-capable user, NOT as root:
#   curl -fsSL https://raw.githubusercontent.com/grubor-maja/pub-quiz-v3/master/scripts/bootstrap-server.sh -o bootstrap.sh
#   bash bootstrap.sh
#
# It stops short of the two steps that need your input: the .env files and the
# SSL certificate. It prints what to do for both at the end.

set -euo pipefail

REPO_URL="https://github.com/grubor-maja/pub-quiz-v3.git"
REPO_DIR="$HOME/pub-quiz-v3"
DOMAIN="${DOMAIN:-koznazna.me}"

say() { printf '\n\033[1;33m==> %s\033[0m\n' "$1"; }

if [ "$(id -u)" -eq 0 ]; then
    echo "Run this as a regular user with sudo, not as root." >&2
    exit 1
fi

say "Updating packages"
sudo apt-get update -y
sudo apt-get upgrade -y

say "Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
fi

say "Installing nginx, certbot, git"
sudo apt-get install -y nginx certbot python3-certbot-nginx git

say "Opening the firewall"
# Oracle images ship with a restrictive iptables policy that silently drops
# web traffic even when the cloud-level security list allows it. This is the
# single most common reason a new Oracle instance looks unreachable.
sudo iptables -I INPUT 5 -p tcp --dport 80 -j ACCEPT || true
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT || true
if command -v netfilter-persistent >/dev/null 2>&1; then
    sudo netfilter-persistent save || true
else
    sudo apt-get install -y iptables-persistent
fi

say "Adding swap"
# The free ARM instance has plenty of RAM, but the smaller always-free shapes
# have 1 GB, where composer install and the Vite build both run out of memory.
if ! sudo swapon --show | grep -q /swapfile; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

say "Cloning the repository"
if [ ! -d "$REPO_DIR" ]; then
    git clone "$REPO_URL" "$REPO_DIR"
else
    git -C "$REPO_DIR" pull origin master
fi

say "Writing the nginx site"
sudo tee "/etc/nginx/sites-available/$DOMAIN" >/dev/null <<NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /storage/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
    }
}
NGINX

sudo ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

say "Scheduling the daily database backup"
chmod +x "$REPO_DIR/scripts/backup-db.sh"
CRON_LINE="30 3 * * * $REPO_DIR/scripts/backup-db.sh >> $HOME/backup.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'backup-db.sh' ; echo "$CRON_LINE" ) | crontab -

cat <<DONE

------------------------------------------------------------------
Server is ready. Two things still need you:

1. Environment files (copy the values from the old server or .env.example):
     nano $REPO_DIR/.env               # DB_DATABASE, DB_USERNAME, DB_PASSWORD, DB_ROOT_PASSWORD
     nano $REPO_DIR/pub-quiz-api/.env.prod   # APP_KEY, APIFY_TOKEN, GEMINI_API_KEY, mail, ...

2. Point $DOMAIN at this server's IP, wait for DNS, then:
     sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

Then bring it up:
     cd $REPO_DIR
     docker compose -f docker-compose.prod.yml up -d --build
     docker compose -f docker-compose.prod.yml exec -T backend php artisan migrate --force

Log out and back in first, so your user picks up docker group membership.
------------------------------------------------------------------
DONE
