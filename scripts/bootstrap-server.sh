#!/usr/bin/env bash
#
# Prepares a fresh server to run this site: Docker, nginx, certbot, firewall,
# swap, the repo, and the nightly database backup.
#
# Handles both families, because Oracle Cloud's free ARM capacity is usually
# only available on their own Oracle Linux images while everything else here
# assumes Debian:
#   - Debian / Ubuntu   (apt, ufw/iptables)
#   - Oracle Linux / RHEL / Rocky / Alma  (dnf, firewalld, SELinux)
#
# Run as a normal sudo-capable user, NOT as root:
#   curl -fsSL https://raw.githubusercontent.com/grubor-maja/pub-quiz-v3/master/scripts/bootstrap-server.sh -o bootstrap.sh
#   bash bootstrap.sh
#
# It stops short of the two steps that need your input: the .env files and the
# SSL certificate. It prints what to do for both at the end.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/grubor-maja/pub-quiz-v3.git}"
REPO_DIR="${REPO_DIR:-$HOME/pub-quiz-v3}"
DOMAIN="${DOMAIN:-koznazna.me}"

say() { printf '\n\033[1;33m==> %s\033[0m\n' "$1"; }

if [ "$(id -u)" -eq 0 ]; then
    echo "Run this as a regular user with sudo, not as root." >&2
    exit 1
fi

. /etc/os-release
case "${ID_LIKE:-$ID}" in
    *debian*|*ubuntu*) FAMILY=debian ;;
    *rhel*|*fedora*)   FAMILY=rhel ;;
    *) echo "Unsupported distribution: $PRETTY_NAME" >&2; exit 1 ;;
esac
say "Detected $PRETTY_NAME ($FAMILY family, $(uname -m))"

# ---------------------------------------------------------------- packages

say "Installing git, nginx, certbot"
if [ "$FAMILY" = debian ]; then
    sudo apt-get update -y
    sudo apt-get install -y git nginx certbot python3-certbot-nginx curl
else
    # certbot lives in EPEL on the RHEL side. Oracle ships the EPEL repo
    # definition but leaves it disabled, so installing the release package is
    # not enough - without enabling it, certbot is simply "no match for argument".
    sudo dnf install -y dnf-plugins-core
    sudo dnf install -y "oracle-epel-release-el${VERSION_ID%%.*}" 2>/dev/null \
        || sudo dnf install -y epel-release 2>/dev/null || true
    for repo in $(sudo dnf repolist --all 2>/dev/null | awk '/EPEL/ {print $1}'); do
        sudo dnf config-manager --set-enabled "$repo" 2>/dev/null || true
    done
    sudo dnf install -y git nginx certbot python3-certbot-nginx curl
fi

say "Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
    if [ "$FAMILY" = debian ]; then
        curl -fsSL https://get.docker.com | sudo sh
    else
        # get.docker.com refuses Oracle Linux, so add the CentOS repo directly -
        # the packages are the same and the release stream matches.
        sudo dnf install -y dnf-plugins-core
        sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo dnf install -y docker-ce docker-ce-cli containerd.io \
            docker-buildx-plugin docker-compose-plugin
    fi
    sudo systemctl enable --now docker
    sudo usermod -aG docker "$USER"
fi

# ---------------------------------------------------------------- firewall

say "Opening ports 80 and 443"
if systemctl is-active --quiet firewalld; then
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
else
    # Oracle's Ubuntu images ship a restrictive iptables policy that silently
    # drops web traffic even when the cloud security list allows it. This is the
    # most common reason a new instance looks unreachable.
    sudo iptables -I INPUT 5 -p tcp --dport 80 -j ACCEPT || true
    sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT || true
    if command -v netfilter-persistent >/dev/null 2>&1; then
        sudo netfilter-persistent save || true
    fi
fi

if [ "$(getenforce 2>/dev/null || echo Disabled)" = "Enforcing" ]; then
    say "Allowing nginx to reach the app containers (SELinux)"
    # Without this nginx returns 502 for every request: SELinux blocks the
    # reverse proxy from opening a connection, and the error only shows in
    # the audit log, not nginx's.
    sudo setsebool -P httpd_can_network_connect 1
fi

# ---------------------------------------------------------------- resources

say "Checking swap"
RAM_MB="$(free -m | awk '/^Mem:/ {print $2}')"
SWAP_MB="$(free -m | awk '/^Swap:/ {print $2}')"
if [ "$RAM_MB" -lt 2048 ]; then
    WANT="${SWAP_SIZE:-4G}"
else
    WANT="${SWAP_SIZE:-2G}"
fi

if [ "$SWAP_MB" -lt 512 ]; then
    echo "detected ${RAM_MB}MB RAM and ${SWAP_MB}MB swap, creating $WANT"
    sudo fallocate -l "$WANT" /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
    # Default 60 makes a small box swap long before it needs to and crawl.
    echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf >/dev/null
    sudo sysctl -q -w vm.swappiness=10
else
    echo "${SWAP_MB}MB swap already present, leaving it"
fi

# Oracle Linux images create a small root partition regardless of the boot
# volume size, so the extra disk you paid attention to picking is not actually
# mounted until this runs.
if command -v oci-growfs >/dev/null 2>&1; then
    say "Expanding the root filesystem to the full boot volume"
    sudo oci-growfs -y || true
fi

# ---------------------------------------------------------------- app

say "Cloning the repository"
if [ ! -d "$REPO_DIR/.git" ]; then
    git clone "$REPO_URL" "$REPO_DIR"
else
    git -C "$REPO_DIR" pull origin master
fi

say "Writing the nginx site"
# Plain HTTP only; certbot rewrites this file to add TLS once DNS points here.
NGINX_SITE="server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /storage/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Crawlers expect these at the root. Without an explicit rule the SPA
    # catch-all answers with index.html and a text/html content type, which is
    # worse than a 404: the crawler is told the file exists and is HTML.
    location = /sitemap.xml {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location = /robots.txt {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
    }
}"

if [ -d /etc/nginx/sites-available ]; then
    echo "$NGINX_SITE" | sudo tee "/etc/nginx/sites-available/$DOMAIN" >/dev/null
    sudo ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
    sudo rm -f /etc/nginx/sites-enabled/default
else
    # RHEL-family nginx has no sites-enabled; it includes conf.d/*.conf, and it
    # does so before its own default server block, so ours is matched first.
    # Do not try to comment that default block out: a line-range sed stops at
    # the first nested closing brace and leaves the rest of the block orphaned,
    # which makes nginx refuse to start at all. It is harmless where it is -
    # our block has an explicit server_name and wins for this domain.
    echo "$NGINX_SITE" | sudo tee "/etc/nginx/conf.d/$DOMAIN.conf" >/dev/null
fi

sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

say "Preparing the environment files"
# Created here so their permissions are right from the start. They must stay
# world-readable: Apache inside the container runs as www-data (uid 33) while
# the file is owned by this user, and a 600 file is simply invisible to it.
# Laravel then silently falls back to its defaults - which means SQLite - and
# every request 500s with a missing-database error that points nowhere near
# the real cause. The home directory is 0700, so nothing else on the box can
# reach these anyway.
for pair in ".env.example:.env" "pub-quiz-api/.env.prod.example:pub-quiz-api/.env.prod"; do
    src="$REPO_DIR/${pair%%:*}"
    dst="$REPO_DIR/${pair##*:}"
    [ -f "$src" ] && [ ! -f "$dst" ] && cp "$src" "$dst"
    [ -f "$dst" ] && chmod 644 "$dst"
done
chmod 700 "$HOME"

say "Scheduling the nightly database backup"
chmod +x "$REPO_DIR/scripts/backup-db.sh"
CRON_LINE="30 3 * * * $REPO_DIR/scripts/backup-db.sh >> $HOME/backup.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'backup-db.sh' ; echo "$CRON_LINE" ) | crontab -

cat <<DONE

------------------------------------------------------------------
Server is ready. Two things still need you:

1. Environment files:
     cp $REPO_DIR/.env.example $REPO_DIR/.env
     cp $REPO_DIR/pub-quiz-api/.env.prod.example $REPO_DIR/pub-quiz-api/.env.prod
     nano $REPO_DIR/.env                      # database credentials
     nano $REPO_DIR/pub-quiz-api/.env.prod    # same credentials + API keys
   The DB_* values must match between the two files.

2. Point $DOMAIN at this server, wait for DNS, then:
     sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

Then bring it up:
     cd $REPO_DIR
     docker compose -f docker-compose.prod.yml up -d --build
     docker compose -f docker-compose.prod.yml exec -T backend php artisan migrate --force

Log out and back in first, so your user picks up docker group membership.
------------------------------------------------------------------
DONE
