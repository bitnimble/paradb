import { clearUserSession } from 'services/session/session';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  clearUserSession();
  return NextResponse.redirect('/');
}
