import { NextRequest, NextResponse } from 'next/server';
import { SetProfilePictureResponse } from 'schema/users';
import { getUserSession } from 'services/session/session';
import { MAX_AVATAR_BYTES, SetProfilePictureError, setProfilePicture } from './set_profile_picture';

const send = (res: SetProfilePictureResponse, status = 200) =>
  NextResponse.json(SetProfilePictureResponse.parse(res), { status });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getUserSession();
  if (session == null) {
    return send({ success: false, statusCode: 403, errorMessage: 'Not logged in' }, 403);
  }

  // Reject oversized uploads from the declared length before buffering the whole body into memory.
  const declaredLength = Number(req.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_AVATAR_BYTES) {
    return send({ success: false, statusCode: 400, errorMessage: 'Invalid image' }, 400);
  }

  const png = Buffer.from(await req.arrayBuffer());
  const result = await setProfilePicture(session.id, png);
  if (result.success) {
    return send({ success: true, avatarUrl: result.value });
  }

  const type = result.errors[0]?.type;
  if (type === SetProfilePictureError.INVALID_IMAGE || type === SetProfilePictureError.TOO_LARGE) {
    return send({ success: false, statusCode: 400, errorMessage: 'Invalid image' }, 400);
  }
  return send(
    { success: false, statusCode: 500, errorMessage: 'Failed to set profile picture' },
    500
  );
}
