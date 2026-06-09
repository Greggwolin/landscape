export async function GET() {
  return new Response(
    JSON.stringify({
      DROPBOX_APP_KEY: process.env.DROPBOX_APP_KEY || null,
      DROPBOX_REDIRECT_URI: process.env.DROPBOX_REDIRECT_URI || null,
      PORT_WARNING: process.env.PORT || 'dev default',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
