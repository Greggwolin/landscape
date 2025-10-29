# Quick Setup for Other Machine

## You've pulled the latest code - here's what to do next:

### ✅ The Issue You Had
Your error messages showed Django backend wasn't running:
- `/api/multifamily/unit-types/` - Connection refused
- `/api/multifamily/units/` - Connection refused
- `/api/multifamily/leases/` - Connection refused

This is because **Git syncs code but NOT running services**.

---

## 🚀 Quick Fix (3 Steps)

### 1. Set Up Django Backend

```bash
cd /Users/5150east/landscape/backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install Django (minimal - fast install)
pip install Django==5.0.1 \
  djangorestframework==3.14.0 \
  psycopg2-binary==2.9.9 \
  python-decouple==3.8 \
  dj-database-url \
  djangorestframework-simplejwt==5.3.0 \
  django-cors-headers==4.3.1 \
  django-extensions==3.2.3 \
  drf-spectacular==0.27.0
```

### 2. Configure Environment

```bash
# Still in /Users/5150east/landscape/backend

# Create .env file
cat > .env <<'EOF'
DATABASE_URL=postgresql://neondb_owner:npg_bps3EShU9WFM@ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech/land_v2?sslmode=require
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
EOF

# Edit with real values if needed
nano .env
```

### 3. Start Django Backend

```bash
# Still in /Users/5150east/landscape/backend
# Virtual environment should still be activated

python manage.py runserver 8000

# You should see:
# Starting development server at http://127.0.0.1:8000/
# Quit the server with CONTROL-C.
```

**Keep this terminal open!** Django needs to run continuously.

### 4. Start Frontend (in another terminal)

```bash
cd /Users/5150east/landscape

# Install Node dependencies (if not done)
npm install

# Start Next.js
npm run dev

# You should see:
# ▲ Next.js 14.x.x
# - Local:        http://localhost:3000
```

---

## ✅ Verify It Works

1. Open browser to http://localhost:3000
2. Navigate to your project (e.g., http://localhost:3000/projects/17?tab=property)
3. Property data should now load without errors!

Check browser console (F12) - should NOT see "Connection refused" errors.

---

## 📚 Complete Documentation

For full setup including:
- Node.js dependencies
- Python services setup
- Database migrations
- Geography seed data
- All environment variables
- Troubleshooting

See: **[docs/06-devops/POST_SYNC_SETUP.md](docs/06-devops/POST_SYNC_SETUP.md)**

---

## Common Next Steps

If you also need geography data (for Market Intelligence features):

```bash
export DATABASE_URL="postgresql://neondb_owner:npg_bps3EShU9WFM@ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech/land_v2?sslmode=require"
./db/migrations/run_geo_seeds.sh
```

See: **[QUICK_SETUP_GEO.md](QUICK_SETUP_GEO.md)**

---

## Key Insight: Code vs. Services

**What Git syncs:**
- ✅ Source code
- ✅ Configuration files
- ✅ Migration SQL files

**What Git does NOT sync:**
- ❌ Dependencies (node_modules, venv)
- ❌ Running services (Django backend)
- ❌ Database contents
- ❌ Environment variables (.env files)

**You must set these up separately after pulling!**

---

## Daily Workflow Going Forward

```bash
# Terminal 1: Django backend
cd backend
source venv/bin/activate
python manage.py runserver 8000

# Terminal 2: Next.js frontend
npm run dev

# Now code!
```

Both services need to be running for the app to work.

---

## Need Help?

If you still have issues, check:
1. [POST_SYNC_SETUP.md](docs/06-devops/POST_SYNC_SETUP.md) - Complete troubleshooting guide
2. Common errors section in that doc
3. Verification checklist to ensure everything is set up

**The most common issue:** Django backend not running → All API calls fail
