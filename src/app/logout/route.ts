import { clearUserSession } from 'services/session/session';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  clearUserSession();
  const url = request.nextUrl.clone();
  url.pathname = '/';
  return NextResponse.redirect(url);
}
