import { checkBody } from 'app/api/helpers';
import { NextRequest, NextResponse } from 'next/server';
import { LoginRequest, LoginResponse } from 'schema/users';
import { getServerContext } from 'services/server_context';
import { _unsafeCreateAdminSupabaseServerClient } from 'services/session/supabase_server';
import { getUser } from 'services/users/users_repo';
import z from 'zod';

const emailSchema = z.email();

const send = (res: LoginResponse) => NextResponse.json(LoginResponse.parse(res));
export async function POST(req: NextRequest): Promise<NextResponse> {
  const bodyCheckError = checkBody(req, 'missing login request');
  if (bodyCheckError) {
    return bodyCheckError;
  }

  const invalidCredentials = {
    success: false,
    statusCode: 401,
    errorMessage: 'Invalid login credentials',
  } as const;
  const { username, password } = LoginRequest.parse(await req.json());
  const { supabase } = await getServerContext();

  let email;
  const isEmail = emailSchema.safeParse(username);
  if (isEmail.success) {
    email = username;
  } else {
    const user = await getUser({ by: 'username', username });
    if (!user.success || !user.value.supabaseId) {
      return send(invalidCredentials);
    }
    const supabaseAdmin = await _unsafeCreateAdminSupabaseServerClient();
    const result = await supabaseAdmin.auth.admin.getUserById(user.value.supabaseId);

    if (result.error || result.data.user.email == null) {
      return send(invalidCredentials);
    }
    email = result.data.user.email;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return send({
      success: false,
      statusCode: 401,
      errorMessage: error.message,
    });
  }
  return send({
    success: true,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
}
