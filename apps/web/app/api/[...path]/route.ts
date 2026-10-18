import { NextRequest } from 'next/server';

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const base = (process.env.API_INTERNAL_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
  const target = new URL(base + '/' + path.map(segment => encodeURIComponent(segment)).join('/'));
  target.search = new URL(request.url).search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');
  headers.delete('accept-encoding');
  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const upstream = await fetch(target, { method: request.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');
  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
}

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
