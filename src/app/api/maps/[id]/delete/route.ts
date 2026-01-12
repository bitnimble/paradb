import { joinErrors } from 'app/api/helpers';
import { NextRequest, NextResponse } from 'next/server';
import { DeleteMapResponse } from 'schema/maps';
import { GetMapError } from 'services/maps/maps_repo';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';

const send = (res: DeleteMapResponse) => NextResponse.json(DeleteMapResponse.parse(res));
export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = await props.params;
  const session = await getUserSession();
  if (!session) {
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
  if (session.id !== getResult.value.uploader) {
    return send({
      success: false,
      statusCode: 403,
      errorMessage: 'Only the map uploader can delete their own maps',
    });
  }

  const deleteResult = await mapsRepo.deleteMap({ id });
  if (deleteResult.success === false) {
    return send({
      success: false,
      statusCode: 500,
      errorMessage: 'Could not delete map: ' + joinErrors(deleteResult),
    });
  }
  return send({ success: true });
}
