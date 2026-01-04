import { clearUserSession } from 'services/session/session';
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  await clearUserSession();
  redirect('/');
}
