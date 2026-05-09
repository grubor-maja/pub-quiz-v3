# setup.ps1
# Jednokratno podesavanje pub-quiz-v3 projekta.
# Pokrenite jednom pre prvog "docker compose up".

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== pub-quiz-v3 - pocetno podesavanje ===" -ForegroundColor Cyan
Write-Host ""

# Provera da li je Docker pokrenut
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker nije dostupan" }
    Write-Host "[OK] Docker je pokrenut" -ForegroundColor Green
} catch {
    Write-Host "[GRESKA] Docker nije pokrenut. Pokrenite Docker Desktop i pokusajte ponovo." -ForegroundColor Red
    exit 1
}

# --- BACKEND (Laravel) ---

if (Test-Path "pub-quiz-api/artisan") {
    Write-Host "[OK] Laravel vec postoji u pub-quiz-api/" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Kreiram Laravel projekat (moze potrajati 2-3 minuta)..." -ForegroundColor Yellow

    docker run --rm `
        -v "${PWD}/pub-quiz-api:/app" `
        -w /app `
        composer:2.7 `
        create-project laravel/laravel . --prefer-dist --no-interaction

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[GRESKA] Laravel bootstrap nije uspeo." -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Laravel kreiran" -ForegroundColor Green
}

# Kopiranje .env fajla
if (-not (Test-Path "pub-quiz-api/.env")) {
    Copy-Item "pub-quiz-api/.env.example" "pub-quiz-api/.env"
    Write-Host "[OK] Kreiran pub-quiz-api/.env iz .env.example" -ForegroundColor Green
} else {
    Write-Host "[OK] pub-quiz-api/.env vec postoji" -ForegroundColor Green
}

# --- FRONTEND (React + TypeScript) ---

if (Test-Path "pub-quiz-ui/package.json") {
    Write-Host "[OK] React projekat vec postoji u pub-quiz-ui/" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Kreiram React + TypeScript projekat..." -ForegroundColor Yellow

    docker run --rm `
        -v "${PWD}/pub-quiz-ui:/app" `
        -w /app `
        node:20-alpine `
        sh -c "npm create vite@latest . -- --template react-ts && npm install"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[GRESKA] React bootstrap nije uspeo." -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] React + TypeScript kreiran" -ForegroundColor Green
}

# --- DOCKER BUILD ---

Write-Host ""
Write-Host "Gradim Docker slike (prvi put je sporije)..." -ForegroundColor Yellow

docker compose build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[GRESKA] Docker build nije uspeo." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Docker slike izgradjene" -ForegroundColor Green

# --- APP KEY ---

Write-Host "Generisem Laravel APP_KEY..." -ForegroundColor Yellow
docker compose run --no-deps --rm backend php artisan key:generate

Write-Host ""
Write-Host "=== Podesavanje zavrseno! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pre pokretanja dodajte API kljuceve u pub-quiz-api/.env:" -ForegroundColor Yellow
Write-Host "  APIFY_TOKEN=      (sa apify.com)" -ForegroundColor Gray
Write-Host "  APIFY_ACTOR_ID=shu8hvrXbJbY3Eb9W" -ForegroundColor Gray
Write-Host "  GROQ_API_KEY=     (sa console.groq.com)" -ForegroundColor Gray
Write-Host "  SYNC_API_KEY=     (izmislite neku tajnu sifru)" -ForegroundColor Gray
Write-Host ""
Write-Host "Pokretanje:" -ForegroundColor White
Write-Host "  docker compose up" -ForegroundColor Cyan
Write-Host ""
Write-Host "Adrese:" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  API:      http://localhost:8080/api" -ForegroundColor Cyan
Write-Host ""
