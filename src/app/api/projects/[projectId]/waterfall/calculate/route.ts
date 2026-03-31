/**
 * GET /api/projects/[projectId]/waterfall/calculate
 *
 * Proxies to the Django/Python waterfall engine. The TypeScript waterfall
 * implementation is deprecated and must not be used for production results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { transformDjangoResponse } from '../transformDjangoResponse';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8001';

type Params = { params: Promise<{ projectId: string }> };

function extractJwtFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(';').map((p) => p.trim());
  const candidateNames = ['access', 'access_token', 'auth_token'];

  for (const name of candidateNames) {
    const prefix = `${name}=`;
    const match = parts.find((p) => p.startsWith(prefix));
    if (match) {
      const value = match.slice(prefix.length).trim();
      if (value) return value;
    }
  }

  return null;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { projectId } = await params;
    const id = Number(projectId);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const trace = searchParams.get('trace');
    const hurdleMethod = searchParams.get('hurdle_method');

    const base = DJANGO_API_URL.replace(/\/$/, '');
    const url = new URL(`${base}/api/calculations/project/${id}/waterfall/`);
    if (trace) {
      url.searchParams.set('trace', trace);
    }
    if (hurdleMethod) {
      url.searchParams.set('hurdle_method', hurdleMethod);
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    console.log('[waterfall-calc] env check', {
      DJANGO_API_URL,
      hasServiceToken: !!process.env.DJANGO_SERVICE_BEARER_TOKEN,
    });

    // Prefer incoming Authorization header, otherwise derive from cookies or env token
    const incomingAuth = request.headers.get('authorization');
    const cookie = request.headers.get('cookie');
    const serviceToken = process.env.DJANGO_SERVICE_BEARER_TOKEN;

    let jwtFromCookie: string | null = null;
    if (!incomingAuth) {
      jwtFromCookie = extractJwtFromCookie(cookie);
    }

    const authHeaderToUse =
      incomingAuth && incomingAuth.trim().length > 0
        ? incomingAuth
        : jwtFromCookie
        ? `Bearer ${jwtFromCookie}`
        : serviceToken
        ? `Bearer ${serviceToken}`
        : undefined;

    if (authHeaderToUse) {
      headers['Authorization'] = authHeaderToUse;
    }
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const djangoUrl = url.toString();
    console.log('[waterfall-calc] outgoing to Django', {
      url: djangoUrl,
      method: 'POST',
      hasAuthorizationHeader: !!headers['Authorization'],
      hasCookieHeader: !!headers['Cookie'],
      authHeaderPrefix: headers['Authorization']
        ? (headers['Authorization'] as string).split(' ')[0]
        : null,
      usedCookieJwt: !!jwtFromCookie,
      hasServiceToken: !!serviceToken,
    });

    const response = await fetch(djangoUrl, {
      method: 'POST',
      headers,
      cache: 'no-store',
      credentials: 'include',
    });

    if (!response.ok) {
      const text = await response.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // keep raw text
      }
      console.log('[waterfall-calc] Django error', {
        status: response.status,
        text,
      });
      console.error(`Django waterfall returned ${response.status}: ${text}`);
      if (parsed?.error) {
        return NextResponse.json(parsed, { status: response.status });
      }
      return NextResponse.json(
        { error: 'Failed to calculate waterfall', details: parsed || text || response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform Django response to match WaterfallApiResponse interface
    const transformed = transformDjangoResponse(data, hurdleMethod);
    return NextResponse.json(transformed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to calculate waterfall', error);
    return NextResponse.json(
      { error: 'Failed to calculate waterfall', details: message },
      { status: 500 }
    );
  }
}
