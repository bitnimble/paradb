import { joinErrors } from 'app/api/helpers';
import { NextRequest, NextResponse } from 'next/server';
import { GetMapResponse } from 'schema/maps';
import { GetMapError } from 'services/maps/maps_repo';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';

const send = (res: GetMapResponse) => NextResponse.json(GetMapResponse.parse(res));
export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = await props.params;
  const { id } = params;
  const user = await getUserSession();
  const userId = user?.id;
  const { mapsRepo } = await getServerContext();
  const result = await mapsRepo.getMap(id, userId);
  if (result.success === false) {
    const isMissing = result.errors.some((e) => e.type === GetMapError.MISSING_MAP);
    return send({
      success: false,
      statusCode: isMissing ? 404 : 500,
      errorMessage: isMissing ? 'Map not found' : 'Could not retrieve map: ' + joinErrors(result),
    });
  }
  return send({ success: true, map: result.value });
}
