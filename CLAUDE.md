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

| | Lokalno | Produkcija |
|---|---|---|
| Frontend | http://localhost:5173 | https://koznazna.me |
| API | http://localhost:8080/api | https://koznazna.me/api |
| DB port | localhost:3306 | samo Docker interna mreza |

Server: 157.245.74.186
SSH: deploy@157.245.74.186

---

## API Endpoints

```
GET  /api/quizzes                filteri: ?search= &org= &date_from= &date_to= &page=
GET  /api/quizzes/{slug}
GET  /api/organizations
GET  /api/organizations/{slug}
POST /api/instagram/sync         header: X-Api-Key: {SYNC_API_KEY}
```

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

CORS_ALLOWED_ORIGINS=http://localhost:5173,https://koznazna.me

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

## Baza podataka - Tabele

| Tabela | Opis |
|---|---|
| organizations | Organizacije koje organizuju kvizove |
| quizzes | Kvizovi, status=published za prikaz |
| instagram_imports | Scraped Instagram postovi pre obrade |

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
