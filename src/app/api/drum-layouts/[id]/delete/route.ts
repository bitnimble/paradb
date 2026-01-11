import { NextRequest, NextResponse } from 'next/server';
import { DeleteDrumLayoutResponse } from 'schema/drum_layouts';
import { error } from 'services/helpers';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';

const send = (res: DeleteDrumLayoutResponse) =>
  NextResponse.json(DeleteDrumLayoutResponse.parse(res));

export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = await props.params;
  const { id } = params;

  const session = await getUserSession();
  if (!session) {
    return error({
      statusCode: 403,
      message: 'You must be logged in to delete drum layouts.',
      errorBody: {},
      errorSerializer: DeleteDrumLayoutResponse.parse,
    });
  }

  const { drumLayoutsRepo } = await getServerContext();
  const layoutResult = await drumLayoutsRepo.getDrumLayout(id);
  if (!layoutResult.success) {
    return error({
      statusCode: 404,
      message: 'Drum layout not found.',
      errorBody: {},
      errorSerializer: DeleteDrumLayoutResponse.parse,
    });
  }

  if (layoutResult.value.uploader !== session.id) {
    return error({
      statusCode: 403,
      message: 'You are not authorized to delete this drum layout.',
      errorBody: {},
      errorSerializer: DeleteDrumLayoutResponse.parse,
    });
  }

  const deleteResult = await drumLayoutsRepo.deleteDrumLayout({ id });
  if (!deleteResult.success) {
    return error({
      statusCode: 500,
      message: 'Could not delete drum layout.',
      errorBody: {},
      resultError: deleteResult,
      errorSerializer: DeleteDrumLayoutResponse.parse,
    });
  }

  return send({ success: true });
}
