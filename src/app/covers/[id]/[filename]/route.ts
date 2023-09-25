import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getEnvVars } from 'services/env';
import * as fs from 'fs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; filename: string } }
) {
  const { id, filename } = params;

  const coverPath = path.join(getEnvVars().mapsDir, id, filename);
  if (!coverPath.startsWith(getEnvVars().mapsDir)) {
    return new NextResponse(undefined, { status: 404 });
  }
  return new NextResponse(streamFile(coverPath));
}

function streamFile(path: string) {
  const stream = fs.createReadStream(path);

  return new ReadableStream({
    start(controller) {
      stream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      stream.on('end', () => controller.close());
      stream.on('error', (error: NodeJS.ErrnoException) => controller.error(error));
    },
    cancel() {
      stream.destroy();
    },
  });
}
