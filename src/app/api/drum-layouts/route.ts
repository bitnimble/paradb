import { NextResponse } from 'next/server';
import { FindDrumLayoutsResponse } from 'schema/drum_layouts';
import { getServerContext } from 'services/server_context';

const send = (res: FindDrumLayoutsResponse) =>
  NextResponse.json(FindDrumLayoutsResponse.parse(res));

export async function GET(): Promise<NextResponse> {
  const { drumLayoutsRepo } = await getServerContext();
  const result = await drumLayoutsRepo.findDrumLayouts({ by: 'all' });
  if (!result.success) {
    return send({
      success: false,
      statusCode: 500,
      errorMessage: 'Could not fetch drum layouts',
    });
  }
  return send({
    success: true,
    drumLayouts: result.value,
  });
}
