/**
 * Cloudflare Pages Advanced Worker (_worker.js)
 * Provides security headers, API validation, and static asset routing.
 */

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin'
};

function addSecurityHeaders(response) {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. API: Health & Telemetry info
    if (url.pathname === '/api/health') {
      return addSecurityHeaders(new Response(JSON.stringify({
        status: 'healthy',
        service: 'Mortal Company Cloudflare Worker',
        gameVersion: env.GAME_VERSION || 'v0.2.3',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }));
    }

    // 2. API: Server-side Save File Validation Check
    if (url.pathname === '/api/validate-save' && request.method === 'POST') {
      try {
        const arrayBuffer = await request.arrayBuffer();
        if (arrayBuffer.byteLength < 100 || arrayBuffer.byteLength > 5 * 1024 * 1024) {
          return addSecurityHeaders(new Response(JSON.stringify({
            valid: false,
            error: 'File size out of range (must be 100 B - 5 MB)'
          }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
        }

        const bytes = new Uint8Array(arrayBuffer);
        // Check MS-NRBF binary header [0x00, 0x00, 0x00, 0x00, 0x01, ...]
        const isNrbf = bytes[0] === 0x00 && bytes[4] === 0x01 && bytes[12] === 0x01;
        
        return addSecurityHeaders(new Response(JSON.stringify({
          valid: isNrbf,
          byteLength: arrayBuffer.byteLength,
          format: isNrbf ? 'MS-NRBF Binary .NET Remoting' : 'Unknown / Corrupted',
          compatibleVersion: 'v0.2.3'
        }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      } catch (err) {
        return addSecurityHeaders(new Response(JSON.stringify({
          valid: false,
          error: 'Failed to process request stream'
        }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
      }
    }

    // 3. Static Assets: Delegate to Cloudflare Pages Asset fetcher
    let response;
    try {
      response = await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response('Asset not found', { status: 404 });
    }

    return addSecurityHeaders(response);
  }
};
