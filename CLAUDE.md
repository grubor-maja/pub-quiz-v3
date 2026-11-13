# pub-quiz-v3

Pub kviz aplikacija za prikaz kvizova po organizacijama.
Backend: PHP 8.2 + Laravel 12 | Frontend: React 19 + TypeScript + Vite

---

## Struktura repoa

```
pub-quiz-v3/
├── pub-quiz-api/          Laravel backend
├── pub-quiz-ui/           React frontend
├── docker/
│   ├── backend/           Dockerfile (dev + prod) + apache.conf
│   └── frontend/          Dockerfile.dev, Dockerfile.prod, nginx.conf
├── nginx/                 Referentni nginx config za server
├── docker-compose.yml     Lokalni dev
├── docker-compose.prod.yml  Produkcija
└── setup.ps1              Jednokratni setup skript
```

---

## Lokalni dev

Potrebno: Docker Desktop

```powershell
# Jednom na pocetku
.\setup.ps1

# Svaki put
docker compose up

# U pozadini
docker compose up -d

# Zaustavi
docker compose down
```

Frontend: http://localhost:5173
API: http://localhost:8080/api

---

## Okruzenja

| | Lokalno | Test | Produkcija |
|---|---|---|---|
| Frontend | http://localhost:5173 | https://test.koznagde.rs | https://koznagde.rs |
| API | http://localhost:8080/api | https://test.koznagde.rs/api | https://koznagde.rs/api |
| DB port | localhost:3306 | samo Docker interna mreza | samo Docker interna mreza |
| Grana | bilo koja | dev (auto deploy) | master (auto deploy) |
| Na serveru | | ~/pub-quiz-v3-staging | ~/pub-quiz-v3 |
| Compose | docker-compose.yml | docker-compose.staging.yml | docker-compose.prod.yml |

Server: 130.162.59.93
SSH: opc@130.162.59.93 (kljuc ~/.ssh/github_actions_deploy)

---

## API Endpoints

```
GET  /api/quizzes                filteri: ?search= &org= &date_from= &date_to= &page=
                                 sort: ?sort=datum|blizu|cena|novo (blizu traži lat i lng)
                                 udaljenost: ?lat= &lng= &radius= (km)
GET  /api/quizzes/{slug}
GET  /api/organizations
GET  /api/organizations/{slug}
POST /api/instagram/sync         header: X-Api-Key: {SYNC_API_KEY}, throttle 5/min
```

### Uloge i admin

- Administrator sajta: `users.is_admin`, dodeljuje se samo sa
  `php artisan user:make-admin {email}`. Vidi sve, plus Korisnici i Audit log.
- Administrator organizacije: red u `organization_user`, dodeljuje administrator sajta
  na /admin/korisnici. Vidi samo svoje organizacije i kvizove (meni "Moja organizacija",
  "Moji kvizovi"). Kvizove može da dodaje, menja i briše; organizaciju samo menja
  (ne slug ni instagram_handle), ne može da je obriše ni da doda novu.
- Scoping je u kontrolerima kroz `User::manageableOrganizationIds()` (null = sve).
- Sve izmene kroz admin + prijave admina idu u `audit_logs` (`App\Services\Audit`).
  Scraper se ne beleži. Obrisan kviz se vraća iz audit loga ("Vrati").

---

## Korisne Docker komande

```powershell
# Logovi
docker compose logs -f backend
docker compose logs -f frontend

# Artisan komande
docker compose exec backend php artisan migrate
docker compose exec backend php artisan db:seed
docker compose exec backend php artisan instagram:sync

# Pristup bazi
docker compose exec mysql mysql -u pubquiz -ppubquiz_secret pubquiz

# Rebuild posle promene Dockerfile-a
docker compose build backend
docker compose up --force-recreate backend
```

---

## Environment varijable (pub-quiz-api/.env)

```
APP_NAME=PubQuiz
APP_ENV=local
APP_KEY=                    generise se automatski u setup.ps1
APP_DEBUG=true
APP_URL=http://localhost:8080

DB_CONNECTION=mysql
DB_HOST=mysql               naziv Docker servisa - ne localhost!
DB_PORT=3306
DB_DATABASE=pubquiz
DB_USERNAME=pubquiz
DB_PASSWORD=pubquiz_secret

CORS_ALLOWED_ORIGINS=http://localhost:5173,https://koznagde.rs

APIFY_TOKEN=                sa apify.com
APIFY_ACTOR_ID=shu8hvrXbJbY3Eb9W
APIFY_DATASET_ID=cIBWgmPbnuXOKVGAw
GROQ_API_KEY=               sa console.groq.com
USE_AI_EXTRACTION=true

SYNC_API_KEY=               tajna sifra za POST /api/instagram/sync
```

---

## Produkcijski deploy

Na serveru (jednom, inicijalno):
```bash
cd ~
git clone https://github.com/grubor-maja/pub-quiz-v3.git
cd pub-quiz-v3
# Kreirati pub-quiz-api/.env.prod sa pravim vrednostima
# Kreirati .env sa DB_ varijablama za docker-compose.prod.yml
docker compose -f docker-compose.prod.yml up -d --build
```

Svaki sledeci deploy:
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Test okruzenje (test.koznagde.rs)

Isti server, odvojena kopija: svoji kontejneri (pubquiz-staging-*), svoja baza,
portovi 8081/5174 samo na 127.0.0.1. Nema schedulera (Instagram sync rucno).
Nginx salje X-Robots-Tag noindex i robots.txt "Disallow: /".
Push na dev -> GitHub Actions testovi -> deploy na test.

Inicijalno na serveru (jednom):
```bash
cd ~
git clone https://github.com/grubor-maja/pub-quiz-v3.git pub-quiz-v3-staging
cd pub-quiz-v3-staging
git checkout dev
cp ../pub-quiz-v3/pub-quiz-api/.env.prod pub-quiz-api/.env.staging   # pa izmeniti, vidi dole
nano .env            # DB_DATABASE, DB_USERNAME, DB_PASSWORD, DB_ROOT_PASSWORD (nove vrednosti)
docker compose -f docker-compose.staging.yml up -d --build
docker compose -f docker-compose.staging.yml exec backend php artisan key:generate --show   # vrednost u APP_KEY
docker compose -f docker-compose.staging.yml exec backend php artisan migrate --force --seed

sudo cp nginx/test.koznagde.conf /etc/nginx/conf.d/test.koznagde.rs.conf
sudo restorecon /etc/nginx/conf.d/test.koznagde.rs.conf    # Oracle Linux, SELinux
sudo nginx -t && sudo systemctl reload nginx
```
Bez certbota: HTTPS radi Cloudflare (DNS zapis `test` mora biti Proxied), isto kao za koznagde.rs.

Napomena: server je Oracle Linux 9, SSH korisnik je `opc` (ne deploy), nginx configi su u
/etc/nginx/conf.d/. U skriptama koje se salju preko `bash -s <<EOF` dodati `</dev/null`
na `docker compose exec -T`, inace exec pojede ostatak skripte sa stdin-a.

Izmene u pub-quiz-api/.env.staging u odnosu na .env.prod:
```
APP_ENV=staging
APP_KEY=                       novi, ne prod
APP_DEBUG=false
APP_URL=https://test.koznagde.rs
FRONTEND_URL=https://test.koznagde.rs
CORS_ALLOWED_ORIGINS=https://test.koznagde.rs
DB_HOST=mysql
DB_DATABASE / DB_USERNAME / DB_PASSWORD   iste kao u ~/pub-quiz-v3-staging/.env
MAIL_MAILER=log                mejlovi se ne salju, samo se loguju
SYNC_API_KEY=                  novi, ne prod
```

Kopija prod baze na test (po zelji):
```bash
gunzip -c ~/backups/pubquiz-YYYY-MM-DD.sql.gz | \
  docker compose -f ~/pub-quiz-v3-staging/docker-compose.staging.yml exec -T mysql \
  mysql -u<staging user> -p<staging lozinka> <staging baza>
```

---

## Baza podataka - Tabele

| Tabela | Opis |
|---|---|
| organizations | Organizacije koje organizuju kvizove |
| quizzes | Kvizovi, status=published za prikaz |
| instagram_imports | Scraped Instagram postovi pre obrade |
| organization_user | Ko je administrator koje organizacije |
| audit_logs | Ko je sta menjao kroz admin (nikad se ne menja ni brise) |

---

## Scraping flow

1. Apify scrapuje Instagram handle organizacije (20 postova)
2. Postovi se cuvaju u instagram_imports sa status=pending
3. Groq LLM (llama-3.3-70b) parsira caption - izvlaci datum, vreme, lokaciju, cenu
4. Fallback: regex ako AI faila
5. Kviz se kreira sa status=published

Triggerovanje:
- Automatski: scheduler dnevno u 07:00
- Rucno: POST /api/instagram/sync sa X-Api-Key headerom
- CLI: docker compose exec backend php artisan instagram:sync

---

## Data model

### organizations
- id (UUID), name, slug, instagram_handle, logo_url, description
- dragon_color, dragon_prop, dragon_shirt - zmaj organizatora (vrednosti su imena,
  boje su u pub-quiz-ui/src/lib/dragon.ts); logo na majici je logo_url
- created_at, updated_at

### quizzes
- id (UUID), organization_id (FK)
- title, slug, description
- quiz_date, quiz_time, location, address
- entry_fee, min_team_members, max_team_members
- contact_phone, cover_image_url, instagram_post_url
- status (published/draft/completed/cancelled) - prikazujemo samo published
- created_at, updated_at

### instagram_imports
- id (UUID), instagram_post_id (unique), instagram_post_url, short_code
- caption, image_url, owner_username, location_name, posted_at
- raw_data (JSON), extracted_data (JSON)
- status (pending/processed/skipped/failed), error_message
- quiz_id (FK, nullable), organization_id (FK, nullable)
- created_at, updated_at
