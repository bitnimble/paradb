import { NextResponse } from 'next/server';
import { GetUserResponse } from 'schema/users';
import { getUserSession } from 'services/session/session';

export const dynamic = 'force-dynamic';

// This route is only intended to be used as a logged-in session check by the FE to validate
// the session cookie, and therefore should NOT throw errors to Sentry if unauthorized
// (otherwise, every anonymous user will be reporting Sentry errors on every page visit).
export async function GET() {
  const session = await getUserSession();
  if (!session) {
    // Explicitly do not use the standard `error()` helper.
    return new NextResponse('403 unauthorized', { status: 403 });
  }

  return NextResponse.json(GetUserResponse.parse({ success: true, user: session }));
}
