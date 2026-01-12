import { NextRequest, NextResponse } from 'next/server';
import { GetDrumLayoutResponse } from 'schema/drum_layouts';
import { getServerContext } from 'services/server_context';

const send = (res: GetDrumLayoutResponse) => NextResponse.json(GetDrumLayoutResponse.parse(res));

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = await props.params;
  const { id } = params;
  const { drumLayoutsRepo } = await getServerContext();
  const result = await drumLayoutsRepo.getDrumLayout(id);
  if (!result.success) {
    return send({
      success: false,
      statusCode: 404,
      errorMessage: 'Drum layout not found',
    });
  }
  return send({
    success: true,
    drumLayout: result.value,
  });
}
