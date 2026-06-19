import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UI_MODE_COOKIE } from '@/lib/uiMode';

// Exact base project routes only (project id = digits, optional trailing slash).
// Deeper routes (/projects/:id/settings, /w/projects/:id/map) are intentionally
// left alone — this mirrors the prior next.config redirect, which only matched
// the exact base and let specialized deep routes through.
const LEGACY_PROJECT_BASE = /^\/projects\/(\d+)\/?$/;
const UNIFIED_PROJECT_BASE = /^\/w\/projects\/(\d+)\/?$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Allow public routes, API routes, static files, and assets
  if (
    isPublicRoute ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  ) {
    return NextResponse.next();
  }

  // Check for auth token cookie
  const authToken = request.cookies.get('auth_token_exists');

  if (!authToken) {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── UI-mode preference write (server-authoritative) ──
  // The classic/chat toggle navigates to its destination with ?setui=<mode>.
  // We set the ui_mode cookie HERE (on the redirect response) so it is
  // guaranteed present on the very next request, then bounce to the clean URL.
  // This replaces the old client-side document.cookie write, which raced with
  // window.location.assign and let middleware read a stale mode on the GET
  // /projects/:id (the "bounces back to chat" bug).
  const setUi = request.nextUrl.searchParams.get('setui');
  if (setUi === 'classic' || setUi === 'unified') {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete('setui');
    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set(UI_MODE_COOKIE, setUi, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return res;
  }

  // ── Dual-modality routing (Session: LSCMD-DUALUI-0616-ec7) ──
  // Cookie-gated replacement for the old static /projects/:projectId redirect
  // (removed from next.config.ts, because next.config redirects run BEFORE
  // middleware and cannot read the cookie). Both directions live here so the
  // single ui_mode value is the sole source of truth: each base route redirects
  // in exactly one mode, so the two directions can never form a loop.
  const uiMode = request.cookies.get(UI_MODE_COOKIE)?.value;

  // Legacy base route → chat-first, UNLESS the user opted into classic.
  // Unset/anything-but-classic preserves the prior default behavior.
  const legacyMatch = pathname.match(LEGACY_PROJECT_BASE);
  if (legacyMatch) {
    if (uiMode !== 'classic') {
      const url = request.nextUrl.clone(); // clone preserves ?folder=&tab= search
      url.pathname = `/w/projects/${legacyMatch[1]}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Reverse guard: classic-mode users on the unified base route are sent to
  // the legacy tabbed view. unified/unset stays on the chat-first shell.
  const unifiedMatch = pathname.match(UNIFIED_PROJECT_BASE);
  if (unifiedMatch) {
    if (uiMode === 'classic') {
      const url = request.nextUrl.clone();
      url.pathname = `/projects/${unifiedMatch[1]}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)',
  ],
};
