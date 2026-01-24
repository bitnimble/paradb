import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { clearUserSession } from 'services/session/session';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  await clearUserSession();
  redirect('/');
}
