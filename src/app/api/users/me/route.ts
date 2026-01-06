import { error } from 'services/helpers';
import { getUserSession } from 'services/session/session';
import { NextResponse } from 'next/server';
import { GetUserResponse } from 'schema/users';
import { ApiError } from 'schema/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return error({
      statusCode: 403,
      errorBody: {},
      message: '403 unauthorized',
      errorSerializer: ApiError.parse,
    });
  }

  return NextResponse.json(GetUserResponse.parse({ success: true, user: session }));
}
