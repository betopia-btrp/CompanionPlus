# CompanionPlus

AI-Powered Mental Wellness Platform — anonymous booking, mood journaling, AI exercises, video sessions.

## Quick Start

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine (Linux) — make sure it's running before proceeding.

```bash
git clone <repo-url>
cd CompanionPlus
cp companionx-api/.env.example companionx-api/.env
cp companionx-web/.env.example companionx-web/.env
# Set STRIPE_KEY, STRIPE_SECRET, and GEMINI_API_KEY in companionx-api/.env (required)
docker compose up --build
```

On first run, the entrypoint automatically: waits for PostgreSQL, generates `APP_KEY`, runs migrations, seeds the database, and syncs Stripe prices. A background queue worker (`companionx-queue`) processes AI jobs (sentiment analysis, exercise generation).

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/swagger |

### Seeded Accounts

| Role | Email | Password |
|------|-------|----------|
| Patient | user@gmail.com | password123 |
| Admin | admin@gmail.com | password123 |
| Consultant | consultant0@gmail.com | password123 |

## Manual Setup (Without Docker)

If you prefer running natively, you need PHP 8.3+, Composer, Node.js 22+, and PostgreSQL 15.

Make sure PostgreSQL is running and create the database matching your `.env`:
```bash
createdb companionx
# or: psql -c "CREATE DATABASE companionx;"
```

```bash
# Backend
cd companionx-api
cp .env.example .env
# Edit .env: set DB_HOST=127.0.0.1, DB credentials, STRIPE_KEY, STRIPE_SECRET, and GEMINI_API_KEY
composer install
php artisan key:generate
php artisan migrate --seed
php artisan stripe:sync-prices
php -S localhost:8000 -t public   # port 8000

# Queue (separate terminal)
cd companionx-api
php artisan queue:work --tries=3

# Frontend (separate terminal)
cd companionx-web
cp .env.example .env
npm install
npm run dev                       # port 3000
```

## Common Commands

```bash
docker compose up --build         # Build and start everything
docker compose down               # Stop everything
docker compose down -v            # Stop and nuke database/volumes
docker compose logs -f            # Follow all logs
docker compose logs -f api        # Follow API logs only
docker compose exec api bash      # Shell into API container
docker compose exec api php artisan tinker   # Laravel tinker

make fresh    # Nuke DB, re-seed, sync Stripe prices
make shell    # Bash into API container
make seed     # Re-seed database
make sync     # Sync Stripe prices
make logs     # Follow all logs
make restart  # Restart API + queue
```

## Environment Variables

Edit `companionx-api/.env` for:
- **Stripe** — `STRIPE_KEY`, `STRIPE_SECRET` (set your own — get test keys at https://stripe.com)
- **Gemini AI** — `GEMINI_API_KEY` (set your own)
- **OpenRouter** — `OPENROUTER_API_KEY` (optional)

## Docs & References

- [ERD (Database Diagram)](https://dbdiagram.io/d/CompanionPlus-69f02330c6a36f9c1b9d07b4)
- [BRD (Business Requirements Document)](https://docs.google.com/document/d/1-2nFSLsAxHURMpWGE6wnSV0bF3f03cRH-gzurhbCmKA/edit?usp=sharing)
- [SRS (Software Requirements Specification)](https://docs.google.com/document/d/1qJ3f0FIglJXv3Q4IFW7yBblh_QQAHf0XGQzjOLQANLs/edit?usp=sharing)
