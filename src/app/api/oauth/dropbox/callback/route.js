import { NextResponse } from 'next/server';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

    const body = new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.DROPBOX_REDIRECT_URI,
        client_id: process.env.DROPBOX_APP_KEY,
        client_secret: process.env.DROPBOX_APP_SECRET,
    });

    const resp = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!resp.ok) {
        const t = await resp.text();
        return NextResponse.json({ error: 'Token exchange failed', details: t }, { status: 500 });
    }

    const token = await resp.json();

    console.log('[Dropbox] refresh_token:', token.refresh_token);

    const html = `<!doctype html><html><body>
  <h3>Dropbox linked.</h3>
  <p>Copy this refresh token into <code>.env.local</code> as <code>DROPBOX_REFRESH_TOKEN=...</code> and restart your dev server.</p>
  <pre>${token.refresh_token || '(none provided)'}</pre>
  </body></html>`;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
