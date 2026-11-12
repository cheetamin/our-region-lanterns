// Netlify serves the static client; private classrooms remain on the existing
// Cloudflare Worker and its existing D1 database.
const BACKEND_ORIGIN = 'https://our-region-lanterns.cheetamin.workers.dev';

function errorResponse(status, message) {
  return Response.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export default async function proxyApi(request) {
  const incoming = new URL(request.url);
  if (incoming.pathname !== '/api' && !incoming.pathname.startsWith('/api/')) {
    return errorResponse(404, 'Not found');
  }
  if (request.method !== 'GET' && request.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  // Do not bypass the Worker's origin and custom-header CSRF protections.
  // Validate the browser origin before adapting the same-origin request for
  // the Cloudflare Worker at the other host.
  if (request.method === 'POST') {
    const origin = request.headers.get('origin');
    if ((origin && origin !== incoming.origin) || request.headers.get('x-lantern-request') !== '1') {
      return errorResponse(403, 'Forbidden');
    }
  }

  const upstreamUrl = new URL(incoming.pathname + incoming.search, BACKEND_ORIGIN);
  const upstreamRequest = new Request(upstreamUrl, request);
  upstreamRequest.headers.delete('host');
  upstreamRequest.headers.delete('connection');
  upstreamRequest.headers.delete('x-forwarded-host');
  upstreamRequest.headers.delete('x-forwarded-proto');
  upstreamRequest.headers.set('origin', BACKEND_ORIGIN);

  try {
    const response = await fetch(upstreamRequest);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return errorResponse(503, 'Upstream API temporarily unavailable');
  }
}

export const config = { path: '/api/*' };
