# Vercel Environment Variable Fix

## Issue
Loan saving was failing on Vercel production because loan API calls were trying to hit Next.js routes (`/api/projects/.../loans/`) that don't exist. These calls need to be routed to the Django backend on Railway.

## Code Fix
Updated `src/hooks/useCapitalization.ts` to prepend `DJANGO_API_URL` to all loan-related API calls.

## Required Vercel Configuration
Set the following environment variable in your Vercel project settings:

**Variable name:** `NEXT_PUBLIC_DJANGO_API_URL`  
**Value:** `https://landscape-production.up.railway.app`

### Steps:
1. Go to https://vercel.com/greggwolin/landscape/settings/environment-variables
2. Add new environment variable:
   - Key: `NEXT_PUBLIC_DJANGO_API_URL`
   - Value: `https://landscape-production.up.railway.app`
   - Environments: Production, Preview, Development (check all)
3. Click "Save"
4. Redeploy your site (or the next deployment will pick it up automatically)

## Verification
After deployment, test:
1. Navigate to any project's Capitalization > Debt page
2. Click "+ Add Loan"
3. Fill in loan details and click Save
4. Should see success toast and loan should appear in the list

## Note
Without this environment variable, the app defaults to `http://localhost:8000` which only works in local development.
