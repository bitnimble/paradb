import { getEnvVars } from 'services/env';
import { getServerContext } from 'services/server_context';
import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const { drumLayoutsRepo } = await getServerContext();
  const result = await drumLayoutsRepo.getDrumLayout(id);
  if (result.success === false) {
    return new NextResponse('Drum layout not found', { status: 404 });
  }

  const filename = sanitizeForDownload(result.value.name);
  redirect(
    `${getEnvVars().publicS3BaseUrl}/drumLayouts/${result.value.id}.zip?title=${filename}.zip`
  );
}

function sanitizeForDownload(filename: string) {
  return filename.replace(/[^a-z0-9\-\(\)\[\]]/gi, '_');
}
