# Map & Geocoding API Setup Guide

**Status:** Ready for configuration
**Date:** 2025-10-28
**Estimated Setup Time:** 15 minutes

---

## Overview

This guide walks you through setting up optional API keys to improve:
1. **Geocoding accuracy** - Google Geocoding API (more accurate than free OpenStreetMap)
2. **Map imagery quality** - MapTiler tiles (better satellite imagery than free ESRI)

**Both services have generous free tiers and will cost $0/month for typical usage.**

---

## Part 1: Google Geocoding API (RECOMMENDED)

### Why This Matters

The current free geocoding service (OpenStreetMap Nominatim) gave incorrect coordinates for Project 17:
- **Address:** 14105 Chadron Avenue, Hawthorne, CA 90250
- **Nominatim result:** ~0.5 miles north of actual location
- **Issue:** Complex properties (spans Chadron + Lemoli) confuse OSM

**Google Geocoding API is significantly more accurate.**

### Free Tier Limits

- **40,000 requests per month** - FREE
- Typical usage for this app: ~50-100 requests/month (only when creating/updating projects)
- **You will NOT exceed free tier**

### Setup Steps

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with Google account
3. Click "Select a project" → "New Project"
4. Name: "Landscape GIS App" (or any name)
5. Click "Create"

#### Step 2: Enable Billing

⚠️ **Important:** Billing must be enabled even for free tier usage

1. In Google Cloud Console, go to "Billing"
2. Click "Link a billing account"
3. Enter credit card info (you will NOT be charged unless you exceed 40k requests/month)
4. Complete billing setup

💡 **Set up billing alerts:**
1. Go to Billing → Budgets & alerts
2. Create budget: $10/month
3. Set alerts at 50%, 90%, 100%
4. You'll be notified if you somehow approach paid usage

#### Step 3: Enable Geocoding API

1. In Google Cloud Console, search for "Geocoding API"
2. Click "Geocoding API"
3. Click "Enable"
4. Wait ~30 seconds for activation

#### Step 4: Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API key"
3. Copy the API key (looks like: `AIzaSyD...`)
4. Click "Restrict Key" (important for security)

#### Step 5: Restrict API Key

⚠️ **Security best practice** - Restrict the key to only Geocoding API:

1. Click on the newly created API key
2. Under "API restrictions", select "Restrict key"
3. In the dropdown, select ONLY:
   - ✅ Geocoding API
4. Under "Application restrictions", select:
   - "HTTP referrers (web sites)"
   - Add: `http://localhost:*/*` (for development)
   - Add: `https://yourdomain.com/*` (when deployed)
5. Click "Save"

#### Step 6: Add to Environment Variables

1. Open `/Users/5150east/landscape/.env.local`
2. Find this line:
   ```bash
   # NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY=your_key_here
   ```
3. Uncomment and add your key:
   ```bash
   NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY=AIzaSyD...your_actual_key
   ```
4. Save the file
5. Restart the dev server: `npm run dev`

#### Step 7: Verify It Works

The geocoding service will now automatically use Google first:

```typescript
// Priority: Cache → Google → Nominatim (fallback)
const result = await geocodeLocation("14105 Chadron Avenue, Hawthorne, CA 90250");
// Should now return accurate coordinates via Google
```

Check browser console or server logs for:
```
✅ Google result: 33.903116, -118.328751 (confidence: 0.99)
```

---

## Part 2: MapTiler (OPTIONAL - Better Imagery)

### Why This Matters

Current imagery (ESRI World Imagery):
- ❌ Lower resolution
- ❌ Less frequent updates
- ❌ "Poor" quality compared to commercial options

MapTiler provides:
- ✅ Higher resolution satellite imagery
- ✅ More frequent updates
- ✅ Hybrid maps (satellite + labels)
- ✅ Free tier is generous

### Free Tier Limits

- **100,000 tile loads per month** - FREE
- Typical usage: ~5,000-10,000 tiles/month
- **You will NOT exceed free tier** unless you have hundreds of users

### Setup Steps

#### Step 1: Create MapTiler Account

1. Go to [MapTiler Cloud](https://cloud.maptiler.com/auth/widget)
2. Click "Sign up"
3. Use Google/GitHub or email
4. Verify email

#### Step 2: Get API Key

1. After logging in, go to [Account → Keys](https://cloud.maptiler.com/account/keys/)
2. Your default API key is already created
3. Copy the key (looks like: `AbCdEf1234567890...`)

#### Step 3: Add to Environment Variables

**Option A: Use MapTiler Hybrid Style (RECOMMENDED)**

1. Open `/Users/5150east/landscape/.env.local`
2. Find these lines:
   ```bash
   NEXT_PUBLIC_MAP_STYLE_URL=aerial
   # NEXT_PUBLIC_MAPTILER_KEY=your_key_here
   ```
3. Update to:
   ```bash
   NEXT_PUBLIC_MAPTILER_KEY=AbCdEf1234567890...your_actual_key
   NEXT_PUBLIC_MAP_STYLE_URL=https://api.maptiler.com/maps/hybrid/style.json?key=AbCdEf1234567890...your_actual_key
   ```
4. Save and restart: `npm run dev`

**Option B: Use MapTiler Satellite Only**

For pure satellite view without labels:
```bash
NEXT_PUBLIC_MAP_STYLE_URL=https://api.maptiler.com/maps/satellite/style.json?key=YOUR_KEY
```

**Option C: Revert to Free ESRI**

To go back to free ESRI imagery:
```bash
NEXT_PUBLIC_MAP_STYLE_URL=aerial
```

#### Step 4: Monitor Usage

1. Log into [MapTiler Cloud](https://cloud.maptiler.com/)
2. Dashboard shows tile load statistics
3. Set up alerts if approaching 100k/month

---

## Part 3: Update Project 17 Coordinates

Now that geocoding is accurate, let's fix Project 17:

### Option A: Re-geocode via API

Create a management script to re-geocode all projects:

```typescript
// backend/scripts/re-geocode-projects.ts
import { geocodeLocation } from '../src/lib/geocoding'
import pool from '../lib/db'

async function reGeocodeProject(projectId: number) {
  const result = await pool.query(
    'SELECT project_name, address FROM landscape.tbl_project WHERE project_id = $1',
    [projectId]
  )

  const project = result.rows[0]
  const fullAddress = project.address // e.g., "14105 Chadron Avenue, Hawthorne, CA 90250"

  const geocoded = await geocodeLocation(fullAddress)

  if (geocoded) {
    console.log(`✅ Geocoded ${project.project_name}:`, geocoded)

    await pool.query(
      `UPDATE landscape.tbl_project
       SET location_lat = $1, location_lon = $2
       WHERE project_id = $3`,
      [geocoded.latitude, geocoded.longitude, projectId]
    )

    console.log(`✅ Updated database for project ${projectId}`)
  } else {
    console.error(`❌ Failed to geocode project ${projectId}`)
  }
}

// Re-geocode project 17
reGeocodeProject(17)
```

### Option B: Manual Update from Google Maps

1. Open [Google Maps](https://www.google.com/maps)
2. Search: "14105 Chadron Avenue, Hawthorne, CA 90250"
3. Right-click on the exact building location
4. Select "What's here?"
5. Copy coordinates from bottom panel (e.g., `33.9031, -118.3287`)
6. Update database:

```bash
psql $DATABASE_URL -c "
UPDATE landscape.tbl_project
SET location_lat = 33.9031,
    location_lon = -118.3287
WHERE project_id = 17;
"
```

---

## Testing

### Test Geocoding

```bash
# In browser console or Node.js
import { geocodeLocation } from '@/lib/geocoding'

const result = await geocodeLocation("14105 Chadron Avenue, Hawthorne, CA 90250")
console.log(result)
```

**Expected output with Google API:**
```javascript
{
  latitude: 33.9031160,
  longitude: -118.3287510,
  confidence: 0.99,
  source: 'google',
  bounds: { north: 33.9032, south: 33.9030, east: -118.3286, west: -118.3289 }
}
```

**Expected output without Google API (fallback to Nominatim):**
```javascript
{
  latitude: 33.9031160,
  longitude: -118.3287510,
  confidence: 0.5,
  source: 'nominatim'
}
```

### Test Map Imagery

1. Go to [http://localhost:3000/projects/17?tab=project](http://localhost:3000/projects/17?tab=project)
2. Verify map loads with better imagery (if using MapTiler)
3. Verify blue pushpin is at correct location (if coordinates updated)

---

## Cost Monitoring

### Google Geocoding API

**Monitor usage:**
1. [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Dashboard
3. View "Geocoding API" metrics

**Typical usage estimate:**
- 10 projects created/month × 1 geocode each = **10 requests/month**
- 5 projects updated/month × 1 geocode each = **5 requests/month**
- **Total: ~15 requests/month** (well within 40,000 free tier)

**Cost if you exceed free tier:**
- $5.00 per 1,000 requests
- Would need 40,000+ requests/month to be charged
- Unlikely unless you have automated batch geocoding

### MapTiler

**Monitor usage:**
1. [MapTiler Dashboard](https://cloud.maptiler.com/)
2. View tile load statistics

**Typical usage estimate:**
- 50 tile loads per map view
- 200 map views/month = **10,000 tile loads/month** (well within 100,000 free tier)

**Cost if you exceed free tier:**
- Starter plan: $49/month for 1M tile loads
- Only necessary if you have 100+ active users viewing maps daily

---

## Troubleshooting

### Geocoding Not Working

**Check console logs:**
```bash
# Should see:
🌍 Geocoding location: "14105 Chadron Avenue, Hawthorne, CA 90250"
🌐 Trying Google Geocoding API...
✅ Google result: 33.903116, -118.328751 (confidence: 0.99)
```

**If you see:**
```bash
⚠️ Google Geocoding API key not found, skipping Google geocoder
🌐 Falling back to Nominatim API...
```

**Fix:** API key not loaded. Check:
1. Is key in `.env.local`?
2. Did you restart dev server after adding key?
3. Is key format correct: `NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY=AIzaSy...`

### Map Tiles Not Loading

**Check console errors:**
```
Failed to load resource: https://api.maptiler.com/maps/hybrid/style.json
```

**Fix:**
1. Check MapTiler key is correct
2. Check URL format in `.env.local`
3. Ensure key is embedded in URL: `...style.json?key=YOUR_KEY`

### API Key Restrictions

**Error:** "This API key is not authorized..."

**Fix:**
1. Go to Google Cloud Console → Credentials
2. Edit the API key
3. Under "Application restrictions", add:
   - `http://localhost:*/*`
   - Your production domain
4. Save and wait 5 minutes for propagation

---

## Security Best Practices

### Google Geocoding API Key

✅ **DO:**
- Use `NEXT_PUBLIC_*` prefix (client-side safe)
- Restrict to HTTP referrers (domains)
- Restrict to Geocoding API only
- Set up billing alerts

❌ **DON'T:**
- Share key publicly
- Commit key to git (use `.env.local` which is gitignored)
- Use same key for server-side operations

### MapTiler API Key

✅ **DO:**
- Use `NEXT_PUBLIC_*` prefix (client-side safe)
- Monitor usage in dashboard
- Restrict domains in MapTiler dashboard (optional)

❌ **DON'T:**
- Share key publicly
- Commit key to git

---

## Summary Checklist

### Geocoding Setup
- [ ] Created Google Cloud project
- [ ] Enabled billing
- [ ] Enabled Geocoding API
- [ ] Created and restricted API key
- [ ] Added key to `.env.local`
- [ ] Restarted dev server
- [ ] Tested geocoding with sample address
- [ ] Updated Project 17 coordinates

### Map Imagery Setup (Optional)
- [ ] Created MapTiler account
- [ ] Got API key
- [ ] Added key to `.env.local`
- [ ] Updated `NEXT_PUBLIC_MAP_STYLE_URL`
- [ ] Restarted dev server
- [ ] Verified better imagery quality

---

## Next Steps

1. **Immediate:** Set up Google Geocoding API (15 minutes)
2. **Optional:** Set up MapTiler for better imagery (5 minutes)
3. **Test:** Re-geocode Project 17 and verify map location
4. **Future:** Add manual coordinate adjustment UI to project form

---

## Support

**Issues:**
- Google Geocoding API: [Google Maps Platform Support](https://developers.google.com/maps/support)
- MapTiler: [MapTiler Support](https://support.maptiler.com/)

**Documentation:**
- Google Geocoding API: [API Reference](https://developers.google.com/maps/documentation/geocoding)
- MapTiler: [Documentation](https://docs.maptiler.com/)

**Project-specific:**
- See: [docs/gis-infrastructure-analysis.md](./gis-infrastructure-analysis.md)
- Geocoding service: [src/lib/geocoding.ts](../src/lib/geocoding.ts)
