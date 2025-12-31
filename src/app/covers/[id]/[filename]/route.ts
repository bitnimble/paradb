import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getEnvVars } from 'services/env';
import * as fs from 'fs';

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string; filename: string }> }
) {
  const params = await props.params;
  const { id, filename } = params;
  const { publicS3BaseUrl, mapsDir } = getEnvVars();

  const coverPath = path.join(mapsDir, id, filename);
  if (!coverPath.startsWith(mapsDir)) {
    return new NextResponse(undefined, { status: 404 });
  }
  if (!fs.existsSync(coverPath)) {
    // If it doesn't exist on disk, it might have been pushed to S3
    return NextResponse.redirect(`${publicS3BaseUrl}/albumArt/${id}/${filename}`);
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
