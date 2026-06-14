import { NextRequest, NextResponse } from 'next/server';
import { PromisedResult } from 'base/result';
import { diskRead, diskWrite } from 'services/s3/disk_bucket';
import { getSharedMemoryBucket } from 'services/s3/memory_bucket';
import { guessContentType, S3Error } from 'services/s3/s3_bucket';

// Local S3 endpoint for the disk (dev) and in-memory (fake) backings. Active when
// S3_IMPLEMENTATION is dev or fake: those buckets mint/serve URLs that route through here, and
// PUBLIC_*_BASE_URL is configured to point at it. 404s for the real implementation so it's a no-op
// in production.

function localOnly(): NextResponse | null {
  const impl = process.env.S3_IMPLEMENTATION;
  if (impl !== 'dev' && impl !== 'fake') {
    return new NextResponse('Not found', { status: 404 });
  }
  return null;
}

function readLocal(key: string): PromisedResult<Buffer, S3Error> {
  return process.env.S3_IMPLEMENTATION === 'fake'
    ? getSharedMemoryBucket().get(key)
    : diskRead(key);
}

function writeLocal(key: string, body: Buffer): PromisedResult<undefined, S3Error> {
  return process.env.S3_IMPLEMENTATION === 'fake'
    ? getSharedMemoryBucket().put(key, body, guessContentType(key))
    : diskWrite(key, body);
}

function safeJoinPath(parts: string[]): string | null {
  // Defensive: reject `..` / absolute segments so a crafted URL can't escape the dev S3 root.
  for (const p of parts) {
    if (p === '..' || p.startsWith('/') || p.includes('\0')) return null;
  }
  return parts.join('/');
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const guard = localOnly();
  if (guard) return guard;
  const { path } = await ctx.params;
  const key = safeJoinPath(path);
  if (key == null) return new NextResponse('Bad path', { status: 400 });
  const result = await readLocal(key);
  if (!result.success) {
    return new NextResponse('Not found', { status: 404 });
  }
  return new NextResponse(new Uint8Array(result.value), {
    status: 200,
    headers: { 'content-type': guessContentType(key) },
  });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const guard = localOnly();
  if (guard) return guard;
  const { path } = await ctx.params;
  const key = safeJoinPath(path);
  if (key == null) return new NextResponse('Bad path', { status: 400 });
  const body = Buffer.from(await req.arrayBuffer());
  const result = await writeLocal(key, body);
  if (!result.success) {
    return new NextResponse('Write failed', { status: 500 });
  }
  return new NextResponse(null, { status: 200 });
}
