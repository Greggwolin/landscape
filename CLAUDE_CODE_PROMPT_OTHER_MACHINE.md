# Claude Code Prompt for Other Machine

Copy and paste this entire prompt to Claude Code on the other machine:

---

## PROMPT START

I just pulled the latest code from Git. I'm getting "Connection refused" errors for API endpoints like `/api/multifamily/unit-types/`, `/api/multifamily/units/`, and `/api/multifamily/leases/`.

The issue is that Django backend isn't running on this machine. Please help me set up everything needed to run the app:

**What I need you to do:**

1. **Check current state**
   - Verify we're in the correct directory (`/Users/5150east/landscape`)
   - Check if `backend/venv/` exists
   - Check if `node_modules/` exists
   - Check if `.env` files exist

2. **Set up Django backend**
   - Create Python virtual environment in `backend/venv/` (if doesn't exist)
   - Install core Django dependencies (use minimal installation if `pip install -r requirements.txt` fails)
   - Required packages: Django==5.0.1, djangorestframework, psycopg2-binary, python-decouple, dj-database-url, djangorestframework-simplejwt, django-cors-headers, django-extensions, drf-spectacular

3. **Configure environment variables**
   - Create `backend/.env` with:
     ```
     DATABASE_URL=postgresql://neondb_owner:npg_bps3EShU9WFM@ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech/land_v2?sslmode=require
     DJANGO_SECRET_KEY=dev-secret-key-change-in-production
     DEBUG=True
     ALLOWED_HOSTS=localhost,127.0.0.1
     ```
   - Create `.env.local` in project root if it doesn't exist (copy from `.env.local.template`)

4. **Install Node.js dependencies** (if node_modules doesn't exist)
   - Run `npm install`

5. **Start Django backend**
   - Activate virtual environment
   - Start Django on port 8000: `python manage.py runserver 8000`
   - Keep it running in the background or tell me to start it manually

6. **Verify setup**
   - Check if Django is responding: `curl http://localhost:8000/admin/`
   - Test an API endpoint: `curl http://localhost:3000/api/projects`

7. **Provide instructions** for starting the frontend dev server

**Important notes:**
- Django backend MUST be running on port 8000 for API calls to work
- This is a one-time setup - after this, I just need to start Django and frontend each time
- Use the minimal Django installation approach if full requirements.txt fails
- Keep Django running - it's a service, not a one-time script

**Reference documentation:**
- Full guide: `docs/06-devops/POST_SYNC_SETUP.md`
- Quick guide: `SETUP_OTHER_MACHINE.md`
- Troubleshooting: Check "Connection refused" section in POST_SYNC_SETUP.md

Please execute these steps and let me know when Django is running and ready!

## PROMPT END

---

## What This Will Do

Claude Code will:
1. ✅ Create Python virtual environment (`backend/venv/`)
2. ✅ Install Django and all core dependencies
3. ✅ Create `.env` file with database connection
4. ✅ Install Node.js dependencies (`npm install`)
5. ✅ Start Django backend on port 8000
6. ✅ Verify everything is working
7. ✅ Give you instructions to start the frontend

## After Claude Code Finishes

You'll need to keep two terminals running:

**Terminal 1 - Django Backend:**
```bash
cd backend
source venv/bin/activate
python manage.py runserver 8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Then open browser to http://localhost:3000 and the errors should be gone!

## If You Need Geography Data Too

After the above is working, run this prompt:

```
I need to set up geography data for Market Intelligence features. Please run the geography seed script:

export DATABASE_URL="postgresql://neondb_owner:npg_bps3EShU9WFM@ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech/land_v2?sslmode=require"
./db/migrations/run_geo_seeds.sh

Verify it worked by checking:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM public.geo_xwalk WHERE state_fips = '06';"

Should return California records.
```
