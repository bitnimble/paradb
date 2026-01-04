import { NextRequest, NextResponse } from 'next/server';
import { SubmitMapResponse, serializeSubmitMapResponse } from 'schema/maps';
import { MapValidity, SubmitMapRequest } from 'schema/maps_zod';
import { error } from 'services/helpers';
import { mintUploadUrl } from 'services/maps/s3_handler';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';
import { string } from 'zod';

const send = (res: SubmitMapResponse) => new NextResponse<Buffer>(serializeSubmitMapResponse(res));
/**
 * Handles a request for uploading a new map or reuploading an existing map.
 * If it is a new map, it creates a new temporary hidden Map record in the DB.
 *
 * This endpoint will return a presigned S3 upload URL and the map ID.
 * The client is expected to then upload to the specified URL and then call
 * /api/maps/submit/complete, which will process/validate the map and publish it.
 */
export async function POST(req: NextRequest): Promise<NextResponse<Buffer>> {
  const session = await getUserSession();
  if (!session) {
    return error({
      statusCode: 403,
      message: 'You must be logged in to submit maps.',
      errorBody: {},
      errorSerializer: serializeSubmitMapResponse,
    });
  }

  const submitMapReqResult = SubmitMapRequest.safeParse(req.body);
  if (!submitMapReqResult.success) {
    return error({
      statusCode: 400,
      message: 'Invalid submit map request.',
      errorBody: {},
      errorSerializer: serializeSubmitMapResponse,
    });
  }
  const submitMapReq = submitMapReqResult.data;

  const { mapsRepo } = await getServerContext();
  let id;
  if (submitMapReq.id != null) {
    const mapResult = await mapsRepo.getMap(submitMapReq.id);
    if (!mapResult.success) {
      return error({
        statusCode: 404,
        message: `Could not find specified map to resubmit: ${submitMapReq.id}`,
        errorBody: {},
        errorSerializer: serializeSubmitMapResponse,
      });
    }
    if (mapResult.value.uploader !== session.id) {
      return error({
        statusCode: 403,
        message: `Not authorized to modify the specified map: ${submitMapReq.id}`,
        errorBody: {},
        errorSerializer: serializeSubmitMapResponse,
      });
    }
    id = submitMapReq.id;
    await mapsRepo.setValidity(id, MapValidity.PENDING_REUPLOAD);
  } else {
    const createMapResult = await mapsRepo.createNewMap({
      title: submitMapReq.title,
      uploader: session.id,
    });
    if (!createMapResult.success) {
      return error({
        statusCode: 500,
        message: 'Could not create placeholder map when preparing for upload.',
        errorBody: {},
        errorSerializer: serializeSubmitMapResponse,
        resultError: createMapResult,
      });
    }
    id = createMapResult.value.id;
  }
  const urlResp = await mintUploadUrl(id);
  if (!urlResp.success) {
    return error({
      statusCode: 500,
      message: 'Could not create the URL for uploading the map.',
      errorBody: {},
      errorSerializer: serializeSubmitMapResponse,
    });
  }
  return send({
    success: true,
    id,
    url: urlResp.value,
  });
}
