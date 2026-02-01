import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { getEnvVars } from 'services/env';
import { getLog } from 'services/logging/server_logger';
import { getServerContext } from 'services/server_context';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const { mapsRepo } = await getServerContext();
  const result = await mapsRepo.getMap(id);
  if (result.success === false) {
    return new NextResponse('Map not found', { status: 404 });
  }

  const incrementResult = await mapsRepo.incrementMapDownloadCount(id);
  if (!incrementResult.success) {
    const log = getLog(['api', 'maps']);
    log.error(`Could not increment download count for map`, {
      details: incrementResult.errors[0],
      mapId: id,
    });
  }

  const filename = sanitizeForDownload(result.value.title);
  redirect(`${getEnvVars().publicS3BaseUrl}/maps/${result.value.id}.zip?title=${filename}.zip`);
}

function sanitizeForDownload(filename: string) {
  return filename.replace(/[^a-z0-9\-\(\)\[\]]/gi, '_');
}
