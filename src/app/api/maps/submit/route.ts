import { NextRequest, NextResponse } from 'next/server';
import { MapValidity, SubmitMapRequest, SubmitMapResponse } from 'schema/maps';
import { error } from 'services/helpers';
import { getLog } from 'services/logging/server_logger';
import { mintUploadUrl } from 'services/maps/s3_handler';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';

const send = (res: SubmitMapResponse) => NextResponse.json(SubmitMapResponse.parse(res));
/**
 * Handles a request for uploading a new map or reuploading an existing map.
 * If it is a new map, it creates a new temporary hidden Map record in the DB.
 *
 * This endpoint will return a presigned S3 upload URL and the map ID.
 * The client is expected to then upload to the specified URL and then call
 * /api/maps/submit/complete, which will process/validate the map and publish it.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const log = getLog(['maps', 'submit']);
  const session = await getUserSession();
  if (!session) {
    return error({
      statusCode: 403,
      message: 'You must be logged in to submit maps.',
      errorBody: {},
      errorSerializer: SubmitMapResponse.parse,
    });
  }

  const submitMapReqResult = SubmitMapRequest.safeParse(await req.json());
  if (!submitMapReqResult.success) {
    return error({
      statusCode: 400,
      message: 'Invalid submit map request.',
      errorBody: {},
      errorSerializer: SubmitMapResponse.parse,
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
        errorSerializer: SubmitMapResponse.parse,
      });
    }
    if (mapResult.value.uploader !== session.id) {
      return error({
        statusCode: 403,
        message: `Not authorized to modify the specified map: ${submitMapReq.id}`,
        errorBody: {},
        errorSerializer: SubmitMapResponse.parse,
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
      log.error('Could not create placeholder map when preparing for upload', {
        errors: createMapResult.errors,
      });
      return error({
        statusCode: 500,
        message: 'Could not create placeholder map when preparing for upload.',
        errorBody: {},
        resultError: createMapResult,
        errorSerializer: SubmitMapResponse.parse,
      });
    }
    id = createMapResult.value.id;
  }
  const urlResp = await mintUploadUrl(id);
  if (!urlResp.success) {
    log.error('Could not mint the URL for uploading the map.', {
      error: urlResp.error,
    });
    return error({
      statusCode: 500,
      message: 'Could not create the URL for uploading the map.',
      errorBody: {},
      errorSerializer: SubmitMapResponse.parse,
    });
  }
  return send({
    success: true,
    id,
    url: urlResp.value,
  });
}
