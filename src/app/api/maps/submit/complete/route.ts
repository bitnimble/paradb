import { NextRequest, NextResponse } from 'next/server';
import { CompleteUploadRequest, CompleteUploadResponse } from 'schema/maps';
import { completeMapUpload } from './complete_upload';

const send = (res: CompleteUploadResponse) => NextResponse.json(CompleteUploadResponse.parse(res));

/**
 * Validates and publishes a map whose archive the client has already uploaded to the presigned S3
 * URL returned by /api/maps/submit. See {@link completeMapUpload}.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqResult = CompleteUploadRequest.safeParse(await req.json());
  if (!reqResult.success) {
    return send({
      success: false,
      statusCode: 400,
      errorMessage: 'Invalid complete upload request.',
    });
  }
  const { id, isReupload } = reqResult.data;
  const result = await completeMapUpload(id, isReupload);
  if (!result.success) {
    // completeMapUpload already logged the failure; just surface the message to the client.
    return send({ success: false, statusCode: 400, errorMessage: result.errorMessage });
  }
  return send({ success: true, map: result.value });
}
