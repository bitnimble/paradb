import { NextRequest, NextResponse } from 'next/server';
import { getEnvVars } from 'services/env';

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string; filename: string }> }
) {
  const params = await props.params;
  const { id, filename } = params;
  const { publicS3BaseUrl } = getEnvVars();
  return NextResponse.redirect(`${publicS3BaseUrl}/albumArt/${id}/${filename}`);
}
