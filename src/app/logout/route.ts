import { clearUserSession } from 'services/session/session';
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  clearUserSession();
  return NextResponse.redirect('/');
}
