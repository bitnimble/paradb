import { error } from 'services/helpers';
import { getUserSession } from 'services/session/session';
import { NextResponse } from 'next/server';
import { serializeApiError } from 'schema/api';
import { serializeGetUserResponse } from 'schema/users';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return error({
      statusCode: 403,
      errorSerializer: serializeApiError,
      errorBody: {},
      message: '403 unauthorized',
    });
  }

  return new NextResponse(serializeGetUserResponse({ success: true, user: session }));
}
