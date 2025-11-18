import { getEnvVars } from 'services/env';
import { GetMapError } from 'services/maps/maps_repo';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';
import { joinErrors } from 'app/api/helpers';
import { NextRequest, NextResponse } from 'next/server';
import { DeleteMapResponse, serializeDeleteMapResponse } from 'schema/maps';

const send = (res: DeleteMapResponse) => new NextResponse<Buffer>(serializeDeleteMapResponse(res));
export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
): Promise<NextResponse<Buffer>> {
  const params = await props.params;
  const user = await getUserSession();
  if (!user) {
    return send({
      success: false,
      statusCode: 403,
      errorMessage: 'You must be logged in to delete a map.',
    });
  }

  const { id } = params;

  const { mapsRepo } = await getServerContext();
  const getResult = await mapsRepo.getMap(id);
  if (getResult.success === false) {
    const isMissing = getResult.errors.some((e) => e.type === GetMapError.MISSING_MAP);
    return send({
      success: false,
      statusCode: isMissing ? 404 : 500,
      errorMessage: isMissing ? 'Map not found' : 'Could not delete map: ' + joinErrors(getResult),
    });
  }
  if (user.id !== getResult.value.uploader) {
    return send({
      success: false,
      statusCode: 403,
      errorMessage: 'Only the map uploader can delete their own maps',
    });
  }

  const deleteResult = await mapsRepo.deleteMap({ id, mapsDir: getEnvVars().mapsDir });
  if (deleteResult.success === false) {
    return send({
      success: false,
      statusCode: 500,
      errorMessage: 'Could not delete map: ' + joinErrors(deleteResult),
    });
  }
  return send({ success: true });
}
