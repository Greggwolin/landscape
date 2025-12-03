# Redfin Housing Comparables Integration + User Management

**Date**: November 30, 2025
**Duration**: ~4 hours
**Focus**: Replace defunct Zillow API with Redfin's public Stingray API for housing price comparables; Add User Management to System Administration

---

## Summary

**Part 1:** Integrated Redfin's public CSV endpoint as the data source for single-family housing comparables on the Market Analysis page. Added map visualization with price-tier color coding, interactive controls, and matching card-based UI styling.

**Part 2:** Added full User Management CRUD functionality to the System Administration modal. Includes user list, add/edit/delete users, admin password reset, and active/inactive status toggling.

## Major Accomplishments

### 1. Redfin API Client ✅
- Created `src/lib/redfinClient.ts` - Full client for Redfin's Stingray CSV endpoint
- Implements polygon-based geographic search using bounding box
- Haversine formula for distance calculations
- CSV parsing with proper quoted field handling
- Configurable via environment variables (REDFIN_BASE_URL, REDFIN_TIMEOUT_MS, etc.)

### 2. SF Comps API Route ✅
- Created `/api/projects/[projectId]/sf-comps/route.ts`
- Fetches project location, queries Redfin, normalizes data
- Default filters: 3mi radius, 180 days, homes built within last 2 years
- Calculates statistics: median price, median $/SF, 25th/75th percentile, price range

### 3. React Query Hook ✅
- Created `src/hooks/analysis/useSfComps.ts`
- Type-safe hook with proper caching (2min stale, 5min GC)
- Cache-busting with `cache: 'no-store'` for fresh data

### 4. Map Visualization ✅
- Updated `src/app/components/Market/MarketMapView.tsx`
- Added Redfin comps as colored circle markers
- Price-tier color coding: green (below 25th), yellow (25-75th), red (above 75th)
- Layer toggle controls for Competitive Projects and Recent Sales
- Dynamic legend that updates based on visible layers
- Rich popup with property details on marker click

### 5. SfCompsTile Component ✅
- Created/updated `src/components/analysis/SfCompsTile.tsx`
- Card-based UI matching other tiles (shaded header)
- Fixed-layout table with truncating address column
- Radius and Days input controls with blur/Enter commit
- External link to Redfin property page

### 6. Layout Updates ✅
- Market page now shows 50/50 split: Map (left) and Housing Comps (right)
- Competitive Projects and Macro Data in bottom row

---

## Part 2: User Management System

### 7. User Management Panel ✅
- Created `src/components/admin/UserManagementPanel.tsx` - Full CRUD UI
- User list table with status, organization, last login, admin badge
- Add User modal with all profile fields (username, email, name, company, phone, password)
- Edit User modal with pre-populated form data
- Reset Password modal (admin can set without knowing current password)
- Delete User confirmation modal with user preview
- Toggle active/inactive status inline with loading states
- Self-action prevention (can't delete/deactivate yourself)
- Toast notifications for all operations

### 8. Backend API Updates ✅
- Enhanced `UserManagementViewSet` in `views_auth.py` with full CRUD
- Added `AdminUserCreateSerializer` for user creation with password validation
- Added `AdminUserUpdateSerializer` for profile updates
- Added `AdminSetPasswordSerializer` for admin password reset
- Added `/api/auth/users/:id/set_password/` endpoint
- Added `/api/auth/users/:id/activate/` and `/deactivate/` endpoints
- Admin permission checks on all management operations

### 9. Frontend API Client ✅
- Created `src/lib/api/admin-users.ts` with type-safe API functions
- Interfaces: `AdminUser`, `CreateUserData`, `UpdateUserData`, `SetPasswordData`
- Functions: `fetchUsers`, `createUser`, `updateUser`, `deleteUser`, `setUserPassword`, `activateUser`, `deactivateUser`

### 10. AdminModal Integration ✅
- Added "Users" tab to System Administration modal
- Imported `UserManagementPanel` component
- Updated admin exports in `src/components/admin/index.ts`
- Set `portal={false}` on CModal to preserve React context for auth

### 11. Login System Updates ✅
- Changed login from email-based to username-based authentication
- Updated `UserLoginSerializer` to accept `username` field
- Updated `LoginData` interface in AuthContext
- Updated login page form UI

### 12. Database Schema Fixes ✅
- Added missing columns to `auth_user` table: phone, company, role, is_verified, created_at, updated_at, last_login_ip
- Created `user_profile` table for extended user data
- Created admin user for testing

## Files Modified

### New Files Created:
**Part 1 - Redfin:**
- `src/lib/redfinClient.ts` - Redfin API client (403 lines)
- `src/app/api/projects/[projectId]/sf-comps/route.ts` - API route (297 lines)
- `src/hooks/analysis/useSfComps.ts` - React Query hook (93 lines)
- `src/components/analysis/SfCompsTile.tsx` - Tile component (293 lines)

**Part 2 - User Management:**
- `src/components/admin/UserManagementPanel.tsx` - Full user management UI (~850 lines)
- `src/lib/api/admin-users.ts` - Type-safe API client for user management

### Files Modified:
**Part 1 - Redfin:**
- `src/app/components/Market/MarketMapView.tsx` - Added comps visualization
- `src/app/projects/[projectId]/planning/market/page.tsx` - Layout changes
- `archive/docs/.env.local.template` - Added Redfin config documentation

**Part 2 - User Management:**
- `src/components/admin/AdminModal.tsx` - Added Users tab, portal={false}
- `src/components/admin/index.ts` - Added UserManagementPanel export
- `src/contexts/AuthContext.tsx` - Changed LoginData to use username
- `src/app/login/page.tsx` - Changed form to use username instead of email
- `backend/apps/projects/serializers_auth.py` - Added admin serializers, username login
- `backend/apps/projects/views_auth.py` - Enhanced UserManagementViewSet with CRUD

## Technical Details

### Redfin CSV Columns Used:
| Index | Field | Notes |
|-------|-------|-------|
| 0 | SALE TYPE | Filter for "PAST SALE" only |
| 1 | SOLD DATE | Format: "Month-DD-YYYY" |
| 3 | ADDRESS | |
| 4-6 | CITY, STATE, ZIP | |
| 7 | PRICE | |
| 8-9 | BEDS, BATHS | |
| 11 | SQUARE FEET | |
| 12 | LOT SIZE | In SF |
| 13 | YEAR BUILT | |
| 20 | URL | Link to Redfin listing |
| 22 | MLS# | Used as unique ID |
| 25-26 | LATITUDE, LONGITUDE | |

### Default Configuration:
- Base URL: `https://www.redfin.com/stingray`
- Timeout: 15000ms
- Max Results: 350
- Sold Within: 180 days
- Min Year Built: Current year - 2 (new construction focus)

### Caching Strategy:
- React Query staleTime: 2 minutes
- React Query gcTime: 5 minutes
- Fetch cache: 'no-store' (bypass browser cache)
- API response: 'Cache-Control: no-store, max-age=0'

## Known Limitations

1. **No Builder Field** - Redfin's public CSV doesn't include builder/developer information
2. **Rate Limiting** - Redfin may return HTML instead of CSV if rate limited (graceful degradation to empty array)
3. **Geographic Coverage** - Depends on Redfin market coverage

## Next Steps

**Redfin Comps:**
- Consider adding builder data from alternative source (ATTOM, CoreLogic)
- Add comp selection/favoriting functionality
- Export comps to Excel

**User Management:**
- Add role-based access control (RBAC)
- Add user activity logging/audit trail
- Add bulk user import from CSV
- Add email verification workflow

## Git Activity

### Commit Information:
- Branch: work
- Files staged: Multiple component and API files
- Documentation: This session note

---

## Testing Completed

**Redfin Comps:**
- [x] Comps load for project with valid lat/lng
- [x] Map markers appear with correct price-tier colors
- [x] Popup shows full property details
- [x] Radius/days filters trigger new API calls
- [x] Layer toggles hide/show markers correctly
- [x] Table displays correctly without horizontal scroll
- [x] External links open Redfin in new tab

**User Management:**
- [x] Login with username works
- [x] Users tab loads user list
- [x] Add User modal creates new user
- [x] Edit User modal updates user details
- [x] Reset Password modal sets new password
- [x] Delete User modal with confirmation
- [x] Active/Inactive toggle works
- [x] Toast notifications display
- [x] Self-action prevention (can't delete yourself)
