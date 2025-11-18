import { getEnvVars } from 'services/env';
import { getServerContext } from 'services/server_context';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const { mapsRepo } = await getServerContext();
  const result = await mapsRepo.getMap(id);
  if (result.success === false) {
    return new NextResponse('Map not found', { status: 404 });
  }

  await mapsRepo.incrementMapDownloadCount(id);

  const filename = sanitizeForDownload(result.value.title);
  return NextResponse.redirect(
    `${getEnvVars().publicS3BaseUrl}/${result.value.id}.zip?title=${filename}.zip`
  );
}

function sanitizeForDownload(filename: string) {
  return filename.replace(/[^a-z0-9\-\(\)\[\]]/gi, '_');
}
