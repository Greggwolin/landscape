# Post-Sync Setup Guide for New Machines

## Overview

After pulling code from Git, you need to set up MORE than just the code. This guide walks through all the dependencies, services, and data you need to get your machine in sync.

**Important:** Git syncs code files, but NOT:
- Dependencies (node_modules, venv, .venv)
- Database contents
- Environment variables (.env files)
- Running services (Django backend)
- Build artifacts

---

## Quick Checklist

After `git pull`, verify these are set up:

- [ ] Node.js dependencies installed
- [ ] Python virtual environments created
- [ ] Backend dependencies installed
- [ ] Services dependencies installed
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Geography seed data loaded (if using Market Intelligence)
- [ ] Django backend running
- [ ] Frontend dev server running

---

## Step-by-Step Setup

### 1. Node.js Dependencies

**When:** Any time after pulling (especially if `package.json` changed)

```bash
# At project root
cd /Users/5150east/landscape

# Install all Node.js dependencies
npm install
# or if using pnpm
pnpm install

# Verify installation
npm list --depth=0
```

**What this does:** Installs all packages listed in `package.json` into `node_modules/`

---

### 2. Python Backend Setup

**When:** First time setup OR if `backend/requirements.txt` changed

```bash
cd /Users/5150east/landscape/backend

# Create virtual environment (first time only)
python3.12 -m venv venv

# Activate virtual environment
source venv/bin/activate
# On Windows: venv\Scripts\activate

# Verify Python version
python --version  # Should be Python 3.12.x

# Upgrade pip
pip install --upgrade pip

# Install all backend dependencies
pip install -r requirements.txt

# Verify key packages installed
pip list | grep -E "django|psycopg2|pytest"
```

**What this does:**
- Creates isolated Python environment in `backend/venv/`
- Installs Django, database drivers, testing tools, and all other backend dependencies

**Common Issues:**

❌ **"No module named django"** → Virtual environment not activated
```bash
source venv/bin/activate
```

❌ **"pip: command not found"** → Wrong Python version or venv not activated
```bash
python3.12 -m pip install --upgrade pip
```

---

### 3. Python Services Setup

**When:** First time setup OR if `services/*/pyproject.toml` or `services/*/requirements.txt` changed

#### Financial Engine Service

```bash
cd /Users/5150east/landscape/services/financial_engine_py

# Option A: Using Poetry (recommended)
poetry install

# Option B: Using pip with venv
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e .

# Verify installation
poetry run python -c "from financial_engine import Calculator; print('✓ Financial Engine installed')"
```

#### Market Ingest Service

```bash
cd /Users/5150east/landscape/services/market_ingest_py

# Option A: Using Poetry (recommended)
poetry install

# Option B: Using pip with venv
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e .

# Verify installation
poetry run python -c "from market_ingest import Database; print('✓ Market Ingest installed')"
```

**What this does:**
- Installs each service as an editable package
- Sets up service-specific dependencies
- Allows importing from the service in other code

---

### 4. Environment Variables

**When:** First time setup OR if `.env.*.template` files changed

#### Root `.env.local`

```bash
cd /Users/5150east/landscape

# Copy template
cp .env.local.template .env.local

# Edit with your values
nano .env.local
# or
code .env.local
```

Required values:
```bash
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-XXX.aws.neon.tech/land_v2?sslmode=require
UPLOADTHING_TOKEN=your_token_here
```

#### Backend `.env`

```bash
cd /Users/5150east/landscape/backend

# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

Required values:
```bash
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-XXX.aws.neon.tech/land_v2?sslmode=require
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

#### Financial Engine `.env`

```bash
cd /Users/5150east/landscape/services/financial_engine_py

# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

Required values:
```bash
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-XXX.aws.neon.tech/land_v2?sslmode=require
DISCOUNT_RATE_DEFAULT=0.08
IRR_FLOOR=0.06
MONTE_CARLO_ITERATIONS=10000
```

#### Market Ingest `.env`

```bash
cd /Users/5150east/landscape/services/market_ingest_py

# Copy example (may need to create)
touch .env

# Edit with your values
nano .env
```

Required values:
```bash
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-XXX.aws.neon.tech/land_v2?sslmode=require
FRED_API_KEY=your_fred_api_key
CENSUS_API_KEY=your_census_key
BLS_API_KEY=your_bls_key
```

**Where to get credentials:**
- `DATABASE_URL`: From Neon dashboard or team lead
- `DJANGO_SECRET_KEY`: Generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- API keys: Request from team lead or register at respective services

---

### 5. Database Migrations

**When:** First time setup OR if new `migrations/*.sql` files were added

```bash
cd /Users/5150east/landscape

# Set database URL (or use from .env)
export DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-XXX.aws.neon.tech/land_v2?sslmode=require"

# Run all migrations
./scripts/run-migrations.sh

# Verify migrations ran
psql $DATABASE_URL -c "SELECT * FROM landscape._migrations ORDER BY applied_at DESC LIMIT 5;"
```

**What this does:**
- Runs all SQL migration files in order
- Creates/updates database tables and schema
- Tracks applied migrations in `landscape._migrations` table

---

### 6. Geography Seed Data (Market Intelligence)

**When:** First time setup OR if you get 404 errors for geography lookups

```bash
cd /Users/5150east/landscape

# Set database URL
export DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-XXX.aws.neon.tech/land_v2?sslmode=require"

# Run geography seed script
./db/migrations/run_geo_seeds.sh

# Verify geography data loaded
psql $DATABASE_URL -c "SELECT geo_level, COUNT(*) FROM public.geo_xwalk GROUP BY geo_level;"
```

**Expected output:**
```
 geo_level | count
-----------+-------
 US        |     1
 STATE     |     2
 MSA       |     5
 COUNTY    |     5
 CITY      |     6
```

**What this does:**
- Loads Arizona and California geography data
- Includes FIPS codes for Census API calls
- Enables Market Intelligence features

---

### 7. Start Django Backend

**When:** Every time you want to use the app

```bash
cd /Users/5150east/landscape/backend

# Activate virtual environment
source venv/bin/activate

# Start Django development server
python manage.py runserver 8000

# Server should start on http://localhost:8000
```

**Verify it's working:**
```bash
# In another terminal
curl http://localhost:8000/admin/
# Should return HTML (not "Connection refused")
```

**Keep this terminal open** - Django needs to run continuously while you use the app.

**Common Issues:**

❌ **"Port 8000 already in use"** → Kill existing process
```bash
lsof -ti:8000 | xargs kill -9
```

❌ **"ModuleNotFoundError: No module named 'django'"** → Virtual environment not activated
```bash
source venv/bin/activate
pip install -r requirements.txt
```

❌ **"Connection to database failed"** → Check DATABASE_URL in `backend/.env`

---

### 8. Start Frontend Dev Server

**When:** Every time you want to use the app

```bash
cd /Users/5150east/landscape

# Start Next.js development server
npm run dev
# or
pnpm dev

# Server should start on http://localhost:3000
```

**Verify it's working:**
- Open browser to http://localhost:3000
- Should see the Landscape app homepage

**Keep this terminal open** - Frontend needs to run continuously.

---

## Verification Checklist

After completing all steps, verify everything works:

### ✅ Frontend Running
```bash
curl http://localhost:3000
# Should return HTML
```

### ✅ Backend Running
```bash
curl http://localhost:8000/admin/
# Should return HTML
```

### ✅ Database Accessible
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM landscape.tbl_project;"
# Should return a number (not error)
```

### ✅ Geography Data Present
```bash
psql $DATABASE_URL -c "SELECT * FROM public.geo_xwalk WHERE usps_city = 'Phoenix' AND usps_state = 'AZ';"
# Should return Phoenix record
```

### ✅ API Endpoints Working
```bash
# Test projects API (requires Django backend running)
curl http://localhost:3000/api/projects
# Should return JSON array

# Test geography lookup
curl 'http://localhost:3000/api/market/geos?city=Phoenix&state=AZ'
# Should return JSON with geo data
```

---

## Common Error Messages & Solutions

### "Module not found" (JavaScript/TypeScript)

**Cause:** Node modules not installed or out of date

**Solution:**
```bash
rm -rf node_modules
npm install
```

### "ModuleNotFoundError" (Python)

**Cause:** Python virtual environment not activated or dependencies not installed

**Solution:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### "Connection refused" / "ECONNREFUSED"

**Cause:** Django backend not running

**Solution:**
```bash
cd backend
source venv/bin/activate
python manage.py runserver 8000
```

### "404 Not Found" for geography lookups

**Cause:** Geography seed data not loaded

**Solution:**
```bash
export DATABASE_URL="postgresql://..."
./db/migrations/run_geo_seeds.sh
```

### "relation does not exist" / "table does not exist"

**Cause:** Database migrations not run

**Solution:**
```bash
export DATABASE_URL="postgresql://..."
./scripts/run-migrations.sh
```

### "psql: command not found"

**Cause:** PostgreSQL client not installed

**Solution:**
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Verify
psql --version
```

### "poetry: command not found"

**Cause:** Poetry not installed

**Solution:**
```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Verify
poetry --version
```

---

## Daily Workflow

After initial setup, your daily workflow is:

```bash
# 1. Pull latest changes
git pull origin work

# 2. Check if dependencies changed
git log -1 --name-only | grep -E "package.json|requirements.txt|pyproject.toml"

# 3. If YES, update dependencies:
npm install  # if package.json changed
cd backend && source venv/bin/activate && pip install -r requirements.txt  # if requirements.txt changed

# 4. Start services (in separate terminals)

# Terminal 1: Django backend
cd backend
source venv/bin/activate
python manage.py runserver 8000

# Terminal 2: Next.js frontend
npm run dev

# 5. Start coding!
```

---

## Related Documentation

- [Developer Guide](../00-getting-started/DEVELOPER_GUIDE.md) - Complete development setup
- [Git Sync Guide](./SYNC_ALL_TO_GIT_PROMPT.md) - How to sync your changes
- [Geography Setup](../../db/migrations/README_GEO_SETUP.md) - Geography data details
- [Database Schema](../05-database/DATABASE_SCHEMA.md) - Database structure
- [Backend README](../../backend/README.md) - Django backend documentation

---

## Quick Reference Commands

```bash
# Activate backend virtual environment
cd backend && source venv/bin/activate

# Activate service virtual environments
cd services/financial_engine_py && source .venv/bin/activate
cd services/market_ingest_py && source .venv/bin/activate

# Install dependencies
npm install                                    # Node.js
pip install -r requirements.txt                # Python (in venv)
poetry install                                 # Poetry projects

# Run migrations
export DATABASE_URL="postgresql://..."
./scripts/run-migrations.sh

# Load geography data
./db/migrations/run_geo_seeds.sh

# Start servers
python manage.py runserver 8000                # Django backend
npm run dev                                    # Next.js frontend

# Database access
psql $DATABASE_URL

# Kill processes on ports
lsof -ti:8000 | xargs kill -9                  # Django
lsof -ti:3000 | xargs kill -9                  # Next.js
```

---

## Need Help?

If you're stuck after following this guide:

1. Check the error message carefully
2. Search this document for the error keywords
3. Check the [Developer Guide](../00-getting-started/DEVELOPER_GUIDE.md)
4. Ask the team in Slack/Discord
5. Create an issue in the repo with:
   - What you were trying to do
   - Complete error message
   - What you've already tried

---

**Last Updated:** 2025-10-29
**Maintainer:** Development Team
**Version:** 1.0
