import { NextRequest, NextResponse } from 'next/server';
import {
  MapValidity,
  SubmitDrumLayoutRequest,
  SubmitDrumLayoutResponse,
} from 'schema/drum_layouts';
import { error } from 'services/helpers';
import { mintDrumLayoutUploadUrl } from 'services/maps/s3_handler';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';

const send = (res: SubmitDrumLayoutResponse) =>
  NextResponse.json(SubmitDrumLayoutResponse.parse(res));

/**
 * Handles a request for uploading a new drum layout or reuploading an existing one.
 * If it is a new layout, it creates a new temporary hidden DrumLayout record in the DB.
 *
 * This endpoint will return a presigned S3 upload URL and the layout ID.
 * The client is expected to then upload to the specified URL and then call
 * /api/drum-layouts/submit/complete, which will process/validate the layout and publish it.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getUserSession();
  if (!session) {
    return error({
      statusCode: 403,
      message: 'You must be logged in to submit drum layouts.',
      errorBody: {},
      errorSerializer: SubmitDrumLayoutResponse.parse,
    });
  }

  const submitReqResult = SubmitDrumLayoutRequest.safeParse(await req.json());
  if (!submitReqResult.success) {
    console.log(JSON.stringify(submitReqResult.error));
    return error({
      statusCode: 400,
      message: 'Invalid submit drum layout request.',
      errorBody: {},
      errorSerializer: SubmitDrumLayoutResponse.parse,
    });
  }
  const submitReq = submitReqResult.data;

  const { drumLayoutsRepo } = await getServerContext();
  let id;
  if (submitReq.id != null) {
    const layoutResult = await drumLayoutsRepo.getDrumLayout(submitReq.id);
    if (!layoutResult.success) {
      return error({
        statusCode: 404,
        message: `Could not find specified drum layout to resubmit: ${submitReq.id}`,
        errorBody: {},
        errorSerializer: SubmitDrumLayoutResponse.parse,
      });
    }
    if (layoutResult.value.uploader !== session.id) {
      return error({
        statusCode: 403,
        message: `Not authorized to modify the specified drum layout: ${submitReq.id}`,
        errorBody: {},
        errorSerializer: SubmitDrumLayoutResponse.parse,
      });
    }
    id = submitReq.id;
    await drumLayoutsRepo.setValidity(id, MapValidity.PENDING_REUPLOAD);
  } else {
    const createResult = await drumLayoutsRepo.createNewDrumLayout({
      name: submitReq.name,
      uploader: session.id,
    });
    if (!createResult.success) {
      return error({
        statusCode: 500,
        message: 'Could not create placeholder drum layout when preparing for upload.',
        errorBody: {},
        resultError: createResult,
        errorSerializer: SubmitDrumLayoutResponse.parse,
      });
    }
    id = createResult.value.id;
  }
  const urlResp = await mintDrumLayoutUploadUrl(id);
  if (!urlResp.success) {
    return error({
      statusCode: 500,
      message: 'Could not create the URL for uploading the drum layout.',
      errorBody: {},
      errorSerializer: SubmitDrumLayoutResponse.parse,
    });
  }
  return send({
    success: true,
    id,
    url: urlResp.value,
  });
}
