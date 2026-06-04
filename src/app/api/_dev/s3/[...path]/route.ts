import { NextRequest, NextResponse } from 'next/server';
import { devS3 } from 'services/maps/s3_handler_fake_disk';

// Disk-backed dev-only S3 endpoint. Active when S3_IMPLEMENTATION=dev (the dev handler mints
// upload URLs that point here, and PUBLIC_S3_BASE_URL is configured to route reads through it).
// 404s for any other implementation so the route is a no-op in real environments.

function devOnly(): NextResponse | null {
  if (process.env.S3_IMPLEMENTATION !== 'dev') {
    return new NextResponse('Not found', { status: 404 });
  }
  return null;
}

function safeJoinPath(parts: string[]): string | null {
  // Defensive: reject `..` / absolute segments so a crafted URL can't escape the dev S3 root.
  for (const p of parts) {
    if (p === '..' || p.startsWith('/') || p.includes('\0')) return null;
  }
  return parts.join('/');
}

function contentTypeFor(key: string): string {
  if (key.endsWith('.zip')) return 'application/zip';
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg';
  if (key.endsWith('.webp')) return 'image/webp';
  if (key.endsWith('.gif')) return 'image/gif';
  if (key.endsWith('.bmp')) return 'image/bmp';
  return 'application/octet-stream';
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const guard = devOnly();
  if (guard) return guard;
  const { path } = await ctx.params;
  const key = safeJoinPath(path);
  if (key == null) return new NextResponse('Bad path', { status: 400 });
  const result = await devS3.read(key);
  if (!result.success) {
    return new NextResponse('Not found', { status: 404 });
  }
  return new NextResponse(new Uint8Array(result.value), {
    status: 200,
    headers: { 'content-type': contentTypeFor(key) },
  });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const guard = devOnly();
  if (guard) return guard;
  const { path } = await ctx.params;
  const key = safeJoinPath(path);
  if (key == null) return new NextResponse('Bad path', { status: 400 });
  const body = Buffer.from(await req.arrayBuffer());
  const result = await devS3.write(key, body);
  if (!result.success) {
    return new NextResponse('Write failed', { status: 500 });
  }
  return new NextResponse(null, { status: 200 });
}
