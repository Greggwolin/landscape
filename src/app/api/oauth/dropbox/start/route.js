import { NextResponse } from 'next/server';

export async function GET() {
    const p = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.DROPBOX_APP_KEY,
        redirect_uri: process.env.DROPBOX_REDIRECT_URI,
        token_access_type: 'offline',
        scope: process.env.DROPBOX_SCOPES,
        state: 'landscape_dms',
    });
    return NextResponse.redirect(`https://www.dropbox.com/oauth2/authorize?${p.toString()}`);
}
